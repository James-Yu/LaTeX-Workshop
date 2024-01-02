import * as vscode from 'vscode'
import { lw } from '../../../lw'
import type { ReferenceEntry, TeXMathEnv } from '../../../types'
import * as utils from '../../../utils/svg'
import { MathPreviewUtils } from './mathpreviewutils'

const logger = lw.log('Preview', 'Hover')

export class HoverPreviewOnRefProvider {
    static async provideHoverPreviewOnRef(tex: TeXMathEnv, macros: string, refData: ReferenceEntry, color: string): Promise<vscode.Hover> {
        const md = await HoverPreviewOnRefProvider.renderSvgOnRef(tex, macros, refData, color)
        const line = refData.position.line
        const link = vscode.Uri.parse('command:latex-workshop.synctexto').with({ query: JSON.stringify([line, refData.file]) })
        const mdLink = new vscode.MarkdownString(`[View on pdf](${link})`)
        mdLink.isTrusted = true
        return new vscode.Hover( [MathPreviewUtils.addDummyCodeBlock(`![equation](${md})`), mdLink], tex.range )
    }

    static async renderSvgOnRef(tex: TeXMathEnv, macros: string, refData: Pick<ReferenceEntry, 'label' | 'prevIndex'>, color: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const scale = configuration.get('hover.preview.scale') as number

        let newTeXString: string
        if (refData.prevIndex !== undefined && configuration.get('hover.ref.number.enabled') as boolean) {
            const tag = refData.prevIndex.refNumber
            const texString = HoverPreviewOnRefProvider.replaceLabelWithTag(tex.texString, refData.label, tag)
            newTeXString = MathPreviewUtils.mathjaxify(texString, tex.envname, {stripLabel: false})
        } else {
            newTeXString = MathPreviewUtils.mathjaxify(tex.texString, tex.envname)
        }
        const typesetArg = macros + MathPreviewUtils.stripTeX(newTeXString, macros)
        const typesetOpts = { scale, color }
        try {
            const xml = await lw.preview.math.typeset(typesetArg, typesetOpts)
            const svg = utils.svgToDataUrl(xml)
            return svg
        } catch(e) {
            logger.logError(`Failed rendering MathJax ${typesetArg} .`, e)
            throw e
        }
    }

    private static replaceLabelWithTag(tex: string, refLabel?: string, tag?: string): string {
        const texWithoutTag = tex.replace(/\\tag\{(\{[^{}]*?\}|.)*?\}/g, '')
        let newTex = texWithoutTag.replace(/\\label\{(.*?)\}/g, (_matchString, matchLabel, _offset, _s) => {
            if (refLabel) {
                if (refLabel === matchLabel) {
                    if (tag) {
                        return `\\tag{${tag}}`
                    } else {
                        return `\\tag{${matchLabel}}`
                    }
                }
                return '\\notag'
            } else {
                return `\\tag{${matchLabel}}`
            }
        })
        // To work around a bug of \tag with multi-line environments,
        // we have to put \tag after the environments.
        // See https://github.com/mathjax/MathJax/issues/1020
        newTex = newTex.replace(/(\\tag\{.*?\})([\r\n\s]*)(\\begin\{(aligned|alignedat|gathered|split)\}[^]*?\\end\{\4\})/gm, '$3$2$1')
        newTex = newTex.replace(/^\\begin\{(\w+?)\}/, '\\begin{$1*}')
        newTex = newTex.replace(/\\end\{(\w+?)\}$/, '\\end{$1*}')
        return newTex
    }
}
