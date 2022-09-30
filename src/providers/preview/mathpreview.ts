import * as vscode from 'vscode'

import {MathJaxPool} from './mathjaxpool'
import * as utils from '../../utils/svg'
import type {ReferenceEntry} from '../completer/reference'
import {getCurrentThemeLightness} from '../../utils/theme'

import {CursorRenderer} from './mathpreviewlib/cursorrenderer'
import {type ITextDocumentLike, TextDocumentLike} from './mathpreviewlib/textdocumentlike'
import {NewCommandFinder} from './mathpreviewlib/newcommandfinder'
import {TexMathEnv, TeXMathEnvFinder} from './mathpreviewlib/texmathenvfinder'
import {HoverPreviewOnRefProvider} from './mathpreviewlib/hoverpreviewonref'
import {MathPreviewUtils} from './mathpreviewlib/mathpreviewutils'
import type {LoggerLocator, LwfsLocator, ManagerLocator, UtensilsParserLocator} from '../../interfaces'

export type {TexMathEnv} from './mathpreviewlib/texmathenvfinder'


interface IExtension extends
    LoggerLocator,
    LwfsLocator,
    ManagerLocator,
    UtensilsParserLocator { }

export class MathPreview {
    private readonly extension: IExtension
    private color: string = '#000000'
    private readonly mj: MathJaxPool
    private readonly cursorRenderer: CursorRenderer
    private readonly newCommandFinder: NewCommandFinder
    readonly texMathEnvFinder: TeXMathEnvFinder
    private readonly hoverPreviewOnRefProvider: HoverPreviewOnRefProvider
    private readonly mputils: MathPreviewUtils

    constructor(extension: IExtension) {
        this.extension = extension
        this.mj = new MathJaxPool()
        vscode.workspace.onDidChangeConfiguration(() => this.getColor())
        this.cursorRenderer = new CursorRenderer(extension)
        this.mputils = new MathPreviewUtils()
        this.newCommandFinder = new NewCommandFinder(extension)
        this.texMathEnvFinder = new TeXMathEnvFinder()
        this.hoverPreviewOnRefProvider = new HoverPreviewOnRefProvider(extension, this.mj, this.mputils)
    }

    dispose() {
        return this.mj.dispose()
    }

    findProjectNewCommand(ctoken: vscode.CancellationToken): Promise<string> {
        return this.newCommandFinder.findProjectNewCommand(ctoken)
    }

    async provideHoverOnTex(document: vscode.TextDocument, tex: TexMathEnv, newCommand: string): Promise<vscode.Hover> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const scale = configuration.get('hover.preview.scale') as number
        let s = await this.cursorRenderer.renderCursor(document, tex, this.color)
        s = this.mputils.mathjaxify(s, tex.envname)
        const typesetArg = newCommand + this.mputils.stripTeX(s)
        const typesetOpts = { scale, color: this.color }
        try {
            const xml = await this.mj.typeset(typesetArg, typesetOpts)
            const md = utils.svgToDataUrl(xml)
            return new vscode.Hover(new vscode.MarkdownString(this.mputils.addDummyCodeBlock(`![equation](${md})`)), tex.range )
        } catch(e) {
            this.extension.logger.logOnRejected(e)
            this.extension.logger.addLogMessage(`Error when MathJax is rendering ${typesetArg}`)
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
            const tex = this.texMathEnvFinder.findHoverOnRef(document, position, refData, token)
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

    private refNumberMessage(refData: Pick<ReferenceEntry, 'prevIndex'>): string | undefined {
        if (refData.prevIndex) {
            const refNum = refData.prevIndex.refNumber
            const refMessage = `numbered ${refNum} at last compilation`
            return refMessage
        }
        return undefined
    }

    async generateSVG(tex: TexMathEnv, newCommandsArg?: string) {
        const newCommands: string = newCommandsArg ?? await this.newCommandFinder.findProjectNewCommand()
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const scale = configuration.get('hover.preview.scale') as number
        const s = this.mputils.mathjaxify(tex.texString, tex.envname)
        const xml = await this.mj.typeset(newCommands + this.mputils.stripTeX(s), {scale, color: this.color})
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

    renderCursor(document: vscode.TextDocument, texMath: TexMathEnv): Promise<string> {
        return this.cursorRenderer.renderCursor(document, texMath, this.color)
    }

    findHoverOnTex(document: ITextDocumentLike, position: vscode.Position): TexMathEnv | undefined {
        return this.texMathEnvFinder.findHoverOnTex(document, position)
    }

    findHoverOnRef(
        refData: Pick<ReferenceEntry, 'file' | 'position'>,
        token: string
    ) {
        const document = TextDocumentLike.load(refData.file)
        const position = refData.position
        return this.texMathEnvFinder.findHoverOnRef(document, position, refData, token)
    }

    async renderSvgOnRef(tex: TexMathEnv, refData: Pick<ReferenceEntry, 'label' | 'prevIndex'>, ctoken: vscode.CancellationToken) {
        const newCommand = await this.findProjectNewCommand(ctoken)
        return this.hoverPreviewOnRefProvider.renderSvgOnRef(tex, newCommand, refData, this.color)
    }

    findMathEnvIncludingPosition(document: ITextDocumentLike, position: vscode.Position): TexMathEnv | undefined {
        return this.texMathEnvFinder.findMathEnvIncludingPosition(document, position)
    }

}
