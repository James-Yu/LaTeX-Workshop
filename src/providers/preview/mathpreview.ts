import * as vscode from 'vscode'

import {MathJaxPool, TypesetArg} from './mathjaxpool'
import * as utils from '../../utils/utils'
import {Extension} from '../../main'
import {ReferenceEntry} from '../completer/reference'
import {getCurrentThemeLightness} from '../../utils/theme'

import {CursorRenderer} from './mathpreviewlib/cursorrenderer'
import {TextDocumentLike} from './mathpreviewlib/textdocumentlike'
import {NewCommandFinder} from './mathpreviewlib/newcommandfinder'
import {TexMathEnv, TeXMathEnvFinder} from './mathpreviewlib/texmathenvfinder'
import {HoverPreviewOnRefProvider} from './mathpreviewlib/hoverpreviewonref'
import {MathPreviewUtils} from './mathpreviewlib/mathpreviewutils'

export {TexMathEnv} from './mathpreviewlib/texmathenvfinder'


export class MathPreview {
    private readonly extension: Extension
    private color: string = '#000000'
    private readonly mj: MathJaxPool
    private readonly cursorRenderer: CursorRenderer
    private readonly newCommandFinder: NewCommandFinder
    private readonly texMathEnvFinder: TeXMathEnvFinder
    private readonly hoverPreviewOnRefProvider: HoverPreviewOnRefProvider
    readonly mputils: MathPreviewUtils

    constructor(extension: Extension) {
        this.extension = extension
        this.mj = new MathJaxPool()
        vscode.workspace.onDidChangeConfiguration(() => this.getColor())
        this.cursorRenderer = new CursorRenderer()
        this.mputils = new MathPreviewUtils()
        this.newCommandFinder = new NewCommandFinder(extension)
        this.texMathEnvFinder = new TeXMathEnvFinder()
        this.hoverPreviewOnRefProvider = new HoverPreviewOnRefProvider(extension, this.mj, this.mputils)
    }

    findProjectNewCommand(ctoken: vscode.CancellationToken): Promise<string> {
        return this.newCommandFinder.findProjectNewCommand(ctoken)
    }

    async provideHoverOnTex(document: vscode.TextDocument, tex: TexMathEnv, newCommand: string): Promise<vscode.Hover> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const scale = configuration.get('hover.preview.scale') as number
        let s = this.cursorRenderer.renderCursor(document, tex.range, this.color)
        s = this.mputils.mathjaxify(s, tex.envname)
        const typesetArg: TypesetArg = {
            math: newCommand + this.mputils.stripTeX(s),
            format: 'TeX',
            svgNode: true,
        }
        const typesetOpts = { scale, color: this.color }
        try {
            const xml = await this.mj.typeset(typesetArg, typesetOpts)
            const md = utils.svgToDataUrl(xml)
            return new vscode.Hover(new vscode.MarkdownString(this.mputils.addDummyCodeBlock(`![equation](${md})`)), tex.range )
        } catch(e) {
            this.extension.logger.logOnRejected(e)
            this.extension.logger.addLogMessage(`Error when MathJax is rendering ${typesetArg.math}`)
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
            const tex = this.texMathEnvFinder.findHoverOnRef(document, position, token, refData)
            if (tex) {
                const newCommands = await this.findProjectNewCommand(ctoken)
                return this.hoverPreviewOnRefProvider.provideHoverPreviewOnRef(tex, newCommands, refData, this.color)
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

    private refNumberMessage(refData: ReferenceEntry): string | undefined {
        if (refData.prevIndex) {
            const refNum = refData.prevIndex.refNumber
            const refMessage = `numbered ${refNum} at last compilation`
            return refMessage
        }
        return undefined
    }

    async generateSVG(document: vscode.TextDocument, tex: TexMathEnv, newCommands0?: string) {
        const newCommands: string = newCommands0 ?? (await this.newCommandFinder.findNewCommand(document.getText())).join('')
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const scale = configuration.get('hover.preview.scale') as number
        const s = this.mputils.mathjaxify(tex.texString, tex.envname)
        const xml = await this.mj.typeset({
            math: newCommands + this.mputils.stripTeX(s),
            format: 'TeX',
            svgNode: true,
        }, {scale, color: this.color})
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

    renderCursor(document: vscode.TextDocument, range: vscode.Range): string {
        return this.cursorRenderer.renderCursor(document, range, this.color)
    }

    findHoverOnTex(document: vscode.TextDocument | TextDocumentLike, position: vscode.Position): TexMathEnv | undefined {
        return this.texMathEnvFinder.findHoverOnTex(document, position)
    }

    findHoverOnRef( document: vscode.TextDocument | TextDocumentLike, position: vscode.Position, refData: ReferenceEntry, token: string) {
        return this.texMathEnvFinder.findHoverOnRef(document, position, token, refData)
    }

    renderSvgOnRef(tex: TexMathEnv, newCommand: string, refData: Pick<ReferenceEntry, 'label' | 'prevIndex'>) {
        return this.hoverPreviewOnRefProvider.renderSvgOnRef(tex, newCommand, refData, this.color)
    }

    findMathEnvIncludingPosition(document: vscode.TextDocument, position: vscode.Position): TexMathEnv | undefined {
        return this.texMathEnvFinder.findMathEnvIncludingPosition(document, position)
    }

}
