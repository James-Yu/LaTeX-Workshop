import type * as Ast from '@unified-latex/unified-latex-types'

function macroToStr(macro: Ast.Macro): string {
    if (macro.content === 'texorpdfstring') {
        return (macro.args?.[1].content[0] as Ast.String | undefined)?.content || ''
    }
    return `\\${macro.content}` + (macro.args?.map(arg => `${arg.openMark}${argContentToStr(arg.content)}${arg.closeMark}`).join('') ?? '')
}

function envToStr(env: Ast.Environment | Ast.VerbatimEnvironment): string {
    return `\\environment{${env.env}}`
}

export function argContentToStr(argContent: Ast.Node[], preserveCurlyBrace: boolean = false): string {
    return argContent.map(node => {
        // Verb
        switch (node.type) {
            case 'string':
                return node.content
            case 'whitespace':
            case 'parbreak':
            case 'comment':
                return ' '
            case 'macro':
                return macroToStr(node)
            case 'environment':
            case 'verbatim':
            case 'mathenv':
                return envToStr(node)
            case 'inlinemath':
                return `$${argContentToStr(node.content)}$`
            case 'displaymath':
                return `\\[${argContentToStr(node.content)}\\]`
            case 'group':
                return preserveCurlyBrace ? `{${argContentToStr(node.content)}}` : argContentToStr(node.content)
            case 'verb':
                return node.content
            default:
                return ''
        }
    }).join('')
}
