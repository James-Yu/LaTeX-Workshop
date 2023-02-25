import * as vscode from 'vscode'
import * as utils from '../../utils/utils'
import { latexParser } from 'latex-utensils'
import { Section } from './section'
import { syntaxParser } from '../../components/parser/syntax'

import { getLogger } from '../../components/logger'
import { LaTeXStructure } from './latex'

const logger = getLogger('Structure', 'DocTeX')

export class DocTeXStructure extends LaTeXStructure {
    static async buildDocTeXModel(document: vscode.TextDocument): Promise<Section[]> {
        const content = document.getText()
        if (!content) {
            return []
        }

        const docContent = DocTeXStructure.getDoc(content)
        const sections = await DocTeXStructure.getToC(document, content, docContent)

        return sections
    }

    static getDoc(content: string) {
        const mode: ('NORMAL' | 'COMMENT' | 'MACROCODE' | 'EXAMPLE')[] = ['NORMAL']
        const comment = /(^|[^\\]|(?:(?<!\\)(?:\\\\)+))\^\^A.*$/gm
        return content.split('\n').map(line => {
            if (line.match(/%\s*\^\^A/)) {
                return ''
            } else if (line.match(/%\s*\\iffalse/)) {
                mode.push('COMMENT')
            } else if (line.match(/%\s*\\fi/) && mode[mode.length - 1] === 'COMMENT') {
                mode.pop()
            } else if (mode[mode.length - 1] === 'COMMENT') {
                return ''
            } else if (line.startsWith('%%')) {
                return ''
            } else if (line.startsWith('%    \\begin{macrocode}')) {
                mode.push('MACROCODE')
            } else if (line.startsWith('%    \\end{macrocode}') && mode[mode.length - 1] === 'MACROCODE') {
                mode.pop()
            } else if (mode[mode.length - 1] === 'MACROCODE') {
                return ''
            } else if (line.startsWith('%')) {
                return line.slice(1).replace(comment, '$1').replaceAll('\\verb', '')
            }
            return ''
        }).join('\n')
    }

    static async getToC(document: vscode.TextDocument, content: string, docContent: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const fastparse = configuration.get('intellisense.fastparse.enabled') as boolean
        const ast = await syntaxParser.parseLatex(fastparse ? utils.stripText(docContent) : content).catch((e) => {
            if (latexParser.isSyntaxError(e)) {
                const line = e.location.start.line
                logger.log(`Error parsing dirty AST of active editor at line ${line}. Fallback to cache.`)
            }
            return undefined
        })

        if (!ast) {
            return []
        }

        DocTeXStructure.refreshLaTeXModelConfig(['macro', 'environment'])
        // Parse each base-level node. If the node has contents, that function
        // will be called recursively.
        let flatNodes: Section[] = []
        for (const node of ast.content) {
            flatNodes = [
                ...flatNodes,
                ...await DocTeXStructure.parseLaTeXNode(node, document.fileName, false, new Set<string>())
            ]
        }

        DocTeXStructure.normalizeDepths(flatNodes)
        DocTeXStructure.buildFloatNumber(flatNodes, false)
        const {preambleFloats, flatSections} = DocTeXStructure.buildSectionNumber(flatNodes, false)
        const preamble = DocTeXStructure.buildNestedFloats(preambleFloats, flatSections)
        const sections = DocTeXStructure.buildNestedSections(flatSections)
        const structure = [...preamble, ...sections]
        DocTeXStructure.buildLaTeXSectionToLine(structure, Number.MAX_SAFE_INTEGER)

        return sections
    }
}
