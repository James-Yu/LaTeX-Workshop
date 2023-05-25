import * as vscode from 'vscode'
import * as utils from '../../utils/utils'
import { TeXElement } from '../structure'
import { parser } from '../../components/parser'
import { outline } from './latex'
import { getLogger } from '../../components/logger'

const logger = getLogger('Structure', 'DocTeX')

export async function buildDocTeX(document: vscode.TextDocument): Promise<TeXElement[]> {
    const content = document.getText()
    if (!content) {
        return []
    }

    const docContent = getDoc(content)
    const sections = await getToC(document, content, docContent)

    return sections
}

function getDoc(content: string) {
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

async function getToC(document: vscode.TextDocument, content: string, docContent: string) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const fastparse = configuration.get('intellisense.fastparse.enabled') as boolean
    logger.log('Parse LaTeX AST ' + (fastparse ? 'with fast-parse: ' : ': ') + document.fileName + ' .')
    const ast = await parser.parseLatex(fastparse ? utils.stripText(docContent) : content)
    if (ast === undefined) {
        logger.log('Failed parsing LaTeX AST.')
        return []
    }

    const config = outline.refreshLaTeXModelConfig(['macro', 'environment'])
    // Parse each base-level node. If the node has contents, that function
    // will be called recursively.
    let flatNodes: TeXElement[] = []
    for (const node of ast.content) {
        flatNodes = [
            ...flatNodes,
            ...await outline.parseLaTeXNode(node, config, document.fileName, false, new Set<string>())
        ]
    }

    outline.buildFloatNumber(flatNodes, false)
    const {preambleFloats, flatSections} = outline.buildSectionNumber(config, flatNodes, false)
    const preamble = outline.buildNestedFloats(preambleFloats, flatSections)
    const sections = outline.buildNestedSections(config, flatSections)
    const structure = [...preamble, ...sections]
    outline.buildLaTeXSectionToLine(config, structure, Number.MAX_SAFE_INTEGER)

    return sections
}
