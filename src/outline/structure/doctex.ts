import * as vscode from 'vscode'
import { lw } from '../../lw'
import type { TeXElement } from '../../types'
import { outline } from './latex'


const logger = lw.log('Structure', 'DocTeX')

export async function construct(document: vscode.TextDocument): Promise<TeXElement[]> {
    const content = document.getText()
    if (!content) {
        return []
    }

    const docContent = getDoc(content)
    const sections = await getToC(document, docContent)

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

async function getToC(document: vscode.TextDocument, docContent: string) {
    const ast = await lw.parser.parse.tex(docContent)
    if (ast === undefined) {
        logger.log('Failed parsing LaTeX AST.')
        return []
    }

    const config = outline.refreshLaTeXModelConfig(false, ['macro', 'environment'])

    const root: { children: TeXElement[] } = { children: [] }
    let inAppendix = false
    for (const node of ast.content) {
        if (await outline.parseNode(node, [], root, document.fileName, config, {}, inAppendix)) {
            inAppendix = true
        }
    }
    let struct = root.children
    struct = outline.nestNonSection(struct)
    struct = outline.nestSection(struct, config)
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    if (configuration.get('view.outline.floats.number.enabled') as boolean) {
        struct = outline.addFloatNumber(struct)
    }
    if (configuration.get('view.outline.numbers.enabled') as boolean) {
        struct = outline.addSectionNumber(struct, config)
    }

    return struct
}
