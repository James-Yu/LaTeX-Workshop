import * as vscode from 'vscode'
import { MathJaxPool } from './mathjaxpool'
import * as utils from '../../utils/svg'
import type { ReferenceEntry } from '../completer/reference'
import { getCurrentThemeLightness } from '../../utils/theme'
import { CursorRenderer} from './mathpreviewlib/cursorrenderer'
import { type ITextDocumentLike, TextDocumentLike } from './mathpreviewlib/textdocumentlike'
import { NewCommandFinder } from './mathpreviewlib/newcommandfinder'
import { TexMathEnv, TeXMathEnvFinder } from './mathpreviewlib/texmathenvfinder'
import { HoverPreviewOnRefProvider } from './mathpreviewlib/hoverpreviewonref'
import { MathPreviewUtils } from './mathpreviewlib/mathpreviewutils'
import { getLogger } from '../../components/logger'

const logger = getLogger('Preview', 'Math')

export type { TexMathEnv } from './mathpreviewlib/texmathenvfinder'

export class MathPreview {
    private color: string = '#000000'

    constructor() {
        vscode.workspace.onDidChangeConfiguration(() => this.getColor())
        MathJaxPool.initialize()
    }

    findProjectNewCommand(ctoken: vscode.CancellationToken): Promise<string> {
        return NewCommandFinder.findProjectNewCommand(ctoken)
    }

    async provideHoverOnTex(document: vscode.TextDocument, tex: TexMathEnv, newCommand: string): Promise<vscode.Hover> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const scale = configuration.get('hover.preview.scale') as number
        let s = await CursorRenderer.renderCursor(document, tex, this.color)
        s = MathPreviewUtils.mathjaxify(s, tex.envname)
        const typesetArg = newCommand + MathPreviewUtils.stripTeX(s)
        const typesetOpts = { scale, color: this.color }
        try {
            const xml = await MathJaxPool.typeset(typesetArg, typesetOpts)
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
                const newCommands = await this.findProjectNewCommand(ctoken)
                return HoverPreviewOnRefProvider.provideHoverPreviewOnRef(tex, newCommands, refData, this.color)
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
        const newCommands: string = newCommandsArg ?? await NewCommandFinder.findProjectNewCommand()
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const scale = configuration.get('hover.preview.scale') as number
        const s = MathPreviewUtils.mathjaxify(tex.texString, tex.envname)
        const xml = await MathJaxPool.typeset(newCommands + MathPreviewUtils.stripTeX(s), {scale, color: this.color})
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
        return CursorRenderer.renderCursor(document, texMath, this.color)
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
        const newCommand = await this.findProjectNewCommand(ctoken)
        return HoverPreviewOnRefProvider.renderSvgOnRef(tex, newCommand, refData, this.color)
    }

    findMathEnvIncludingPosition(document: ITextDocumentLike, position: vscode.Position): TexMathEnv | undefined {
        return TeXMathEnvFinder.findMathEnvIncludingPosition(document, position)
    }

}
