import * as vscode from 'vscode'
import type { ConvertOption, SupportedExtension, SvgOption, TexOption } from 'mathjax-full'
import { mathjax } from 'mathjax-full/js/mathjax.js'
import { TeX } from 'mathjax-full/js/input/tex.js'
import { SVG } from 'mathjax-full/js/output/svg.js'
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js'
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js'
import type { LiteElement } from 'mathjax-full/js/adaptors/lite/Element.js'
import type { MathDocument } from 'mathjax-full/js/core/MathDocument.js'
import type { LiteDocument } from 'mathjax-full/js/adaptors/lite/Document.js'
import type { LiteText } from 'mathjax-full/js/adaptors/lite/Text.js'
import 'mathjax-full/js/input/tex/AllPackages.js'
import * as utils from '../../utils/svg'
import type { ReferenceEntry } from '../completer/reference'
import { getCurrentThemeLightness } from '../../utils/theme'
import { renderCursor } from './mathpreviewlib/cursorrenderer'
import { type ITextDocumentLike, TextDocumentLike } from './mathpreviewlib/textdocumentlike'
import { findProjectNewCommand } from './mathpreviewlib/newcommandfinder'
import { TexMathEnv, TeXMathEnvFinder } from './mathpreviewlib/texmathenvfinder'
import { MathPreviewUtils } from './mathpreviewlib/mathpreviewutils'
import { getLogger } from '../../components/logger'

const logger = getLogger('Preview', 'Math')

const baseExtensions: SupportedExtension[] = ['ams', 'base', 'color', 'newcommand', 'noerrors', 'noundefined']
const supportedExtensions: SupportedExtension[] = ['amscd', 'bbox', 'boldsymbol', 'braket', 'bussproofs', 'cancel', 'cases', 'centernot', 'colortbl', 'empheq', 'enclose', 'extpfeil', 'gensymb', 'html', 'mathtools', 'mhchem', 'physics', 'textcomp', 'textmacros', 'unicode', 'upgreek', 'verb']


export type { TexMathEnv } from './mathpreviewlib/texmathenvfinder'

export class MathPreview {
    private color: string = '#000000'
    private html = this.createHtmlConverter(baseExtensions)
    private readonly adaptor = liteAdaptor()

    constructor() {
        RegisterHTMLHandler(this.adaptor)
        void this.loadExtensions()
        vscode.workspace.onDidChangeConfiguration((ev) => {
            this.getColor()
            if (ev.affectsConfiguration('latex-workshop.hover.preview.mathjax.extensions')) {
                return this.loadExtensions()
            }
        })
    }

    private loadExtensions() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const extensions = (configuration.get('hover.preview.mathjax.extensions', []) as SupportedExtension[])
            .filter((ex) => supportedExtensions.includes(ex))
        this.html = this.createHtmlConverter(baseExtensions.concat(extensions))
    }

    private createHtmlConverter(extensions: SupportedExtension[]) {
        const baseTexOption: TexOption = {
            packages: extensions,
            formatError: (_jax, error) => { throw new Error(error.message) }
        }
        const texInput = new TeX<LiteElement, LiteText, LiteDocument>(baseTexOption)
        const svgOption: SvgOption = {fontCache: 'local'}
        const svgOutput = new SVG<LiteElement, LiteText, LiteDocument>(svgOption)
        return mathjax.document('', {InputJax: texInput, OutputJax: svgOutput}) as MathDocument<LiteElement, LiteText, LiteDocument>
    }

    typeset(arg: string, opts: { scale: number, color: string }): string {
        const convertOption: ConvertOption = {
            display: true,
            em: 18,
            ex: 9,
            containerWidth: 80*18
        }
        const node = this.html.convert(arg, convertOption) as LiteElement

        const css = `svg {font-size: ${100 * opts.scale}%;} * { color: ${opts.color} }`
        let svgHtml = this.adaptor.innerHTML(node)
        svgHtml = svgHtml.replace(/<defs>/, `<defs><style>${css}</style>`)
        return svgHtml
    }

    provideHoverOnTex(document: vscode.TextDocument, tex: TexMathEnv, newCommand: string): vscode.Hover {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const scale = configuration.get('hover.preview.scale') as number
        let s = renderCursor(document, tex, this.color)
        s = MathPreviewUtils.mathjaxify(s, tex.envname)
        const typesetArg = newCommand + MathPreviewUtils.stripTeX(s, newCommand)
        const typesetOpts = { scale, color: this.color }
        try {
            const xml = this.typeset(typesetArg, typesetOpts)
            const md = utils.svgToDataUrl(xml)
            return new vscode.Hover(new vscode.MarkdownString(MathPreviewUtils.addDummyCodeBlock(`![equation](${md})`)), tex.range )
        } catch(e) {
            logger.logError(`Failed rendering MathJax ${typesetArg} .`, e)
            throw e
        }
    }

    async provideHoverOnRef(
        document: vscode.TextDocument,
        position: vscode.Position,
        refData: ReferenceEntry,
        token: string,
        ctoken: vscode.CancellationToken
    ): Promise<vscode.Hover> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const line = refData.position.line
        const link = vscode.Uri.parse('command:latex-workshop.synctexto').with({ query: JSON.stringify([line, refData.file]) })
        const mdLink = new vscode.MarkdownString(`[View on pdf](${link})`)
        mdLink.isTrusted = true
        if (configuration.get('hover.ref.enabled') as boolean) {
            const tex = TeXMathEnvFinder.findHoverOnRef(document, position, refData, token)
            if (tex) {
                const newCommands = await findProjectNewCommand(ctoken)
                return this.provideHoverPreviewOnRef(tex, newCommands, refData, this.color)
            }
        }
        const md = '```latex\n' + refData.documentation + '\n```\n'
        const refRange = document.getWordRangeAtPosition(position, /\{.*?\}/)
        const refNumberMessage = this.refNumberMessage(refData)
        if (refNumberMessage !== undefined && configuration.get('hover.ref.number.enabled') as boolean) {
            return new vscode.Hover([md, refNumberMessage, mdLink], refRange)
        }
        return new vscode.Hover([md, mdLink], refRange)
    }

    private provideHoverPreviewOnRef(tex: TexMathEnv, newCommand: string, refData: ReferenceEntry, color: string): vscode.Hover {
        const md = this.renderSvg(tex, newCommand, refData, color)
        const line = refData.position.line
        const link = vscode.Uri.parse('command:latex-workshop.synctexto').with({ query: JSON.stringify([line, refData.file]) })
        const mdLink = new vscode.MarkdownString(`[View on pdf](${link})`)
        mdLink.isTrusted = true
        return new vscode.Hover( [MathPreviewUtils.addDummyCodeBlock(`![equation](${md})`), mdLink], tex.range )
    }

    private renderSvg(tex: TexMathEnv, newCommand: string, refData: Pick<ReferenceEntry, 'label' | 'prevIndex'>, color: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const scale = configuration.get('hover.preview.scale') as number

        let newTeXString: string
        if (refData.prevIndex !== undefined && configuration.get('hover.ref.number.enabled') as boolean) {
            const tag = refData.prevIndex.refNumber
            const texString = this.replaceLabelWithTag(tex.texString, refData.label, tag)
            newTeXString = MathPreviewUtils.mathjaxify(texString, tex.envname, {stripLabel: false})
        } else {
            newTeXString = MathPreviewUtils.mathjaxify(tex.texString, tex.envname)
        }
        const typesetArg = newCommand + MathPreviewUtils.stripTeX(newTeXString, newCommand)
        const typesetOpts = { scale, color }
        try {
            const xml = this.typeset(typesetArg, typesetOpts)
            const svg = utils.svgToDataUrl(xml)
            return svg
        } catch(e) {
            logger.logError(`Failed rendering MathJax ${typesetArg} .`, e)
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

    private refNumberMessage(refData: Pick<ReferenceEntry, 'prevIndex'>): string | undefined {
        if (refData.prevIndex) {
            const refNum = refData.prevIndex.refNumber
            const refMessage = `numbered ${refNum} at last compilation`
            return refMessage
        }
        return
    }

    async generateSVG(tex: TexMathEnv, newCommandsArg?: string) {
        const newCommands: string = newCommandsArg ?? await findProjectNewCommand()
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const scale = configuration.get('hover.preview.scale') as number
        const s = MathPreviewUtils.mathjaxify(tex.texString, tex.envname)
        const xml = this.typeset(newCommands + MathPreviewUtils.stripTeX(s, newCommands), {scale, color: this.color})
        return {svgDataUrl: utils.svgToDataUrl(xml), newCommands}
    }

    getColor() {
        const lightness = getCurrentThemeLightness()
        if (lightness === 'light') {
            this.color = '#000000'
        } else {
            this.color = '#ffffff'
        }
    }

    renderCursor(document: vscode.TextDocument, texMath: TexMathEnv): string {
        return renderCursor(document, texMath, this.color)
    }

    findHoverOnTex(document: ITextDocumentLike, position: vscode.Position): TexMathEnv | undefined {
        return TeXMathEnvFinder.findHoverOnTex(document, position)
    }

    findHoverOnRef(
        refData: Pick<ReferenceEntry, 'file' | 'position'>,
        token: string
    ) {
        const document = TextDocumentLike.load(refData.file)
        const position = refData.position
        return TeXMathEnvFinder.findHoverOnRef(document, position, refData, token)
    }

    async renderSvgOnRef(tex: TexMathEnv, refData: Pick<ReferenceEntry, 'label' | 'prevIndex'>, ctoken: vscode.CancellationToken) {
        const newCommand = await findProjectNewCommand(ctoken)
        return this.renderSvg(tex, newCommand, refData, this.color)
    }

    findMathEnvIncludingPosition(document: ITextDocumentLike, position: vscode.Position): TexMathEnv | undefined {
        return TeXMathEnvFinder.findMathEnvIncludingPosition(document, position)
    }

}
