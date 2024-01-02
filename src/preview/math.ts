import * as vscode from 'vscode'
import * as path from 'path'
import * as workerpool from 'workerpool'
import type { SupportedExtension } from 'mathjax-full'
import type { IMathJaxWorker } from './math/mathjax'
import { lw } from '../lw'
import type { ReferenceEntry, TeXMathEnv } from '../types'
import * as utils from '../utils/svg'
import { getCurrentThemeLightness } from '../utils/theme'
import { renderCursor as renderCursorWorker } from './math/mathpreviewlib/cursorrenderer'
import { type ITextDocumentLike, TextDocumentLike } from './math/mathpreviewlib/textdocumentlike'
import { findMacros } from './math/mathpreviewlib/newcommandfinder'
import { TeXMathEnvFinder } from './math/mathpreviewlib/texmathenvfinder'
import { HoverPreviewOnRefProvider } from './math/mathpreviewlib/hoverpreviewonref'
import { MathPreviewUtils } from './math/mathpreviewlib/mathpreviewutils'

const logger = lw.log('Preview', 'Math')

export const math = {
    getColor,
    onRef,
    onTeX,
    findRef,
    findTeX,
    findMath,
    generateSVG,
    renderSvgOnRef,
    renderCursor,
    typeset
}

const pool: workerpool.WorkerPool = workerpool.pool(
    path.join(__dirname, 'math', 'mathjax.js'),
    { minWorkers: 1, maxWorkers: 1, workerType: 'process' }
)
const proxy = pool.proxy<IMathJaxWorker>()

lw.onConfigChange('*', getColor)
lw.onConfigChange('hover.preview.mathjax.extensions', initialize)
lw.onDispose({ dispose: async () => { await pool.terminate(true) } })

void initialize()
async function initialize() {
    const extensions = vscode.workspace.getConfiguration('latex-workshop').get('hover.preview.mathjax.extensions', []) as SupportedExtension[]
    const extensionsToLoad = extensions.filter((ex) => lw.constant.MATHJAX_EXT.includes(ex))
    void (await proxy).loadExtensions(extensionsToLoad)
}

let color = '#000000'

async function onTeX(document: vscode.TextDocument, tex: TeXMathEnv, macros: string): Promise<vscode.Hover> {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const scale = configuration.get('hover.preview.scale') as number
    let s = await renderCursor(document, tex)
    s = MathPreviewUtils.mathjaxify(s, tex.envname)
    const typesetArg = macros + MathPreviewUtils.stripTeX(s, macros)
    const typesetOpts = { scale, color }
    try {
        const xml = await typeset(typesetArg, typesetOpts)
        const md = utils.svgToDataUrl(xml)
        return new vscode.Hover(new vscode.MarkdownString(MathPreviewUtils.addDummyCodeBlock(`![equation](${md})`)), tex.range )
    } catch(e) {
        if (macros !== '') {
            logger.log(`Failed rendering MathJax ${typesetArg} . Try removing macro definitions.`)
            return await onTeX(document, tex, '')
        } else {
            logger.logError(`Failed rendering MathJax ${typesetArg} .`, e)
            throw e
        }
    }
}

async function onRef(
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
            return HoverPreviewOnRefProvider.provideHoverPreviewOnRef(tex, await findMacros(ctoken), refData, color)
        }
    }
    const md = '```latex\n' + refData.documentation + '\n```\n'
    const refRange = document.getWordRangeAtPosition(position, /\{.*?\}/)
    const refMessage = refNumberMessage(refData)
    if (refMessage !== undefined && configuration.get('hover.ref.number.enabled') as boolean) {
        return new vscode.Hover([md, refMessage, mdLink], refRange)
    }
    return new vscode.Hover([md, mdLink], refRange)
}

function refNumberMessage(refData: Pick<ReferenceEntry, 'prevIndex'>): string | undefined {
    if (refData.prevIndex) {
        const refNum = refData.prevIndex.refNumber
        const refMessage = `numbered ${refNum} at last compilation`
        return refMessage
    }
    return
}

async function generateSVG(tex: TeXMathEnv, macros?: string) {
    macros = macros ?? await findMacros()
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const scale = configuration.get('hover.preview.scale') as number
    const s = MathPreviewUtils.mathjaxify(tex.texString, tex.envname)
    const xml = await typeset(macros + MathPreviewUtils.stripTeX(s, macros), {scale, color})
    return { svgDataUrl: utils.svgToDataUrl(xml), macros }
}

function getColor() {
    const lightness = getCurrentThemeLightness()
    if (lightness === 'light') {
        color = '#000000'
    } else {
        color = '#ffffff'
    }
}

async function typeset(arg: string, opts: { scale: number, color: string }): Promise<string> {
    return (await proxy).typeset(arg, opts).timeout(3000)
}

function renderCursor(document: vscode.TextDocument, texMath: TeXMathEnv): Promise<string> {
    return renderCursorWorker(document, texMath, color)
}

function findTeX(document: ITextDocumentLike, position: vscode.Position): TeXMathEnv | undefined {
    return TeXMathEnvFinder.findHoverOnTex(document, position)
}

function findRef(
    refData: Pick<ReferenceEntry, 'file' | 'position'>,
    token: string
) {
    const document = TextDocumentLike.load(refData.file)
    const position = refData.position
    return TeXMathEnvFinder.findHoverOnRef(document, position, refData, token)
}

async function renderSvgOnRef(tex: TeXMathEnv, refData: Pick<ReferenceEntry, 'label' | 'prevIndex'>, ctoken: vscode.CancellationToken) {
    return HoverPreviewOnRefProvider.renderSvgOnRef(tex, await findMacros(ctoken), refData, color)
}

function findMath(document: ITextDocumentLike, position: vscode.Position): TeXMathEnv | undefined {
    return TeXMathEnvFinder.findMathEnvIncludingPosition(document, position)
}
