import * as vscode from 'vscode'
import { lw } from '../../lw'
import type { TeXMathEnv } from '../../types'
import { renderCursor } from './cursor'
import { addDummyCodeBlock, getColor, mathjaxify, stripTeX, svg2DataUrl } from './utils'

const logger = lw.log('Preview', 'Math')

export async function onMath(document: vscode.TextDocument, tex: TeXMathEnv, macros: string): Promise<vscode.Hover> {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const scale = configuration.get('hover.preview.scale') as number
    let s = await renderCursor(document, tex, getColor())
    s = mathjaxify(s, tex.envname)
    const typesetArg = macros + stripTeX(s, macros)
    const typesetOpts = { scale, color: getColor() }
    try {
        const markdown = svg2DataUrl(await lw.preview.mathjax.typeset(typesetArg, typesetOpts))
        return new vscode.Hover(new vscode.MarkdownString(addDummyCodeBlock(`![equation](${markdown})`)), tex.range )
    } catch(e) {
        if (macros !== '') {
            logger.log(`Failed rendering MathJax ${typesetArg} . Try removing macro definitions.`)
            return await onMath(document, tex, '')
        } else {
            logger.logError(`Failed rendering MathJax ${typesetArg} .`, e)
            throw e
        }
    }
}
