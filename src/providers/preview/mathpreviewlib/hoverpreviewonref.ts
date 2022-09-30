import * as vscode from 'vscode'
import * as utils from '../../../utils/svg'
import type {MathJaxPool} from '../mathjaxpool'
import type {ReferenceEntry} from '../../completer/reference'
import type {TexMathEnv} from './texmathenvfinder'
import type {MathPreviewUtils} from './mathpreviewutils'
import type {LoggerLocator} from '../../../interfaces'

interface IExtension extends LoggerLocator { }

export class HoverPreviewOnRefProvider {
    private readonly extension: IExtension
    private readonly mj: MathJaxPool
    private readonly mputils: MathPreviewUtils

    constructor(extension: IExtension, mj: MathJaxPool, mputils: MathPreviewUtils) {
        this.extension = extension
        this.mj = mj
        this.mputils = mputils
    }

    async provideHoverPreviewOnRef(tex: TexMathEnv, newCommand: string, refData: ReferenceEntry, color: string): Promise<vscode.Hover> {
        const md = await this.renderSvgOnRef(tex, newCommand, refData, color)
        const line = refData.position.line
        const link = vscode.Uri.parse('command:latex-workshop.synctexto').with({ query: JSON.stringify([line, refData.file]) })
        const mdLink = new vscode.MarkdownString(`[View on pdf](${link})`)
        mdLink.isTrusted = true
        return new vscode.Hover( [this.mputils.addDummyCodeBlock(`![equation](${md})`), mdLink], tex.range )
    }

    async renderSvgOnRef(tex: TexMathEnv, newCommand: string, refData: Pick<ReferenceEntry, 'label' | 'prevIndex'>, color: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const scale = configuration.get('hover.preview.scale') as number

        let newTeXString: string
        if (refData.prevIndex !== undefined && configuration.get('hover.ref.number.enabled') as boolean) {
            const tag = refData.prevIndex.refNumber
            const texString = this.replaceLabelWithTag(tex.texString, refData.label, tag)
            newTeXString = this.mputils.mathjaxify(texString, tex.envname, {stripLabel: false})
        } else {
            newTeXString = this.mputils.mathjaxify(tex.texString, tex.envname)
        }
        const typesetArg = newCommand + this.mputils.stripTeX(newTeXString)
        const typesetOpts = { scale, color }
        try {
            const xml = await this.mj.typeset(typesetArg, typesetOpts)
            const svg = utils.svgToDataUrl(xml)
            return svg
        } catch(e) {
            this.extension.logger.logOnRejected(e)
            this.extension.logger.addLogMessage(`Error when MathJax is rendering ${typesetArg}`)
            throw e
        }
    }

    private replaceLabelWithTag(tex: string, refLabel?: string, tag?: string): string {
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
