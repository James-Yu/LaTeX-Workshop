import * as vscode from 'vscode'
import * as path from 'path'
import * as workerpool from 'workerpool'
import type { SupportedExtension } from 'mathjax-full'
import type { IMathJaxWorker } from './math/mathjax'
import { lw } from '../lw'
import type { ReferenceItem, TeXMathEnv } from '../types'
import * as utils from '../utils/svg'
import { getCurrentThemeLightness } from '../utils/theme'
import { renderCursor as renderCursorWorker } from './math/mathpreviewlib/cursorrenderer'
import { type ITextDocumentLike, TextDocumentLike } from './math/mathpreviewlib/textdocumentlike'
import { findMacros } from './math/mathpreviewlib/newcommandfinder'
import { TeXMathEnvFinder } from './math/mathpreviewlib/texmathenvfinder'
import { MathPreviewUtils } from './math/mathpreviewlib/mathpreviewutils'

const logger = lw.log('Preview', 'Math')

export const math = {
    refreshMathColor,
    onRef,
    onTeX,
    findRef,
    findTeX,
    findMath,
    generateSVG,
    ref2svg,
    renderCursor,
    typeset
}

const pool: workerpool.WorkerPool = workerpool.pool(
    path.join(__dirname, 'math', 'mathjax.js'),
    { minWorkers: 1, maxWorkers: 1, workerType: 'process' }
)
const proxy = pool.proxy<IMathJaxWorker>()

lw.onConfigChange('*', refreshMathColor)
lw.onConfigChange('hover.preview.mathjax.extensions', initialize)
lw.onDispose({ dispose: async () => { await pool.terminate(true) } })

void initialize()
async function initialize() {
    const extensions = vscode.workspace.getConfiguration('latex-workshop').get('hover.preview.mathjax.extensions', []) as SupportedExtension[]
    const extensionsToLoad = extensions.filter((ex) => lw.constant.MATHJAX_EXT.includes(ex))
    void (await proxy).loadExtensions(extensionsToLoad)
}

let foreColor: '#000000' | '#ffffff' = '#000000'

async function onTeX(document: vscode.TextDocument, tex: TeXMathEnv, macros: string): Promise<vscode.Hover> {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const scale = configuration.get('hover.preview.scale') as number
    let s = await renderCursor(document, tex)
    s = MathPreviewUtils.mathjaxify(s, tex.envname)
    const typesetArg = macros + MathPreviewUtils.stripTeX(s, macros)
    const typesetOpts = { scale, color: foreColor }
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
    refData: ReferenceItem,
    ctoken: vscode.CancellationToken
): Promise<vscode.Hover> {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const line = refData.position.line
    const link = vscode.Uri.parse('command:latex-workshop.synctexto').with({ query: JSON.stringify([line, refData.file]) })
    const mdLink = new vscode.MarkdownString(`[View on pdf](${link})`)
    mdLink.isTrusted = true
    if (configuration.get('hover.ref.enabled') as boolean && refData.math) {
        return onRefMathJax(refData, ctoken)
    }
    const md = '```latex\n' + refData.documentation + '\n```\n'
    const refRange = document.getWordRangeAtPosition(position, /\{.*?\}/)
    const refMessage = refNumberMessage(refData)
    if (refMessage !== undefined && configuration.get('hover.ref.number.enabled') as boolean) {
        return new vscode.Hover([md, refMessage, mdLink], refRange)
    }
    return new vscode.Hover([md, mdLink], refRange)
}

async function onRefMathJax(refData: ReferenceItem, ctoken?: vscode.CancellationToken): Promise<vscode.Hover> {
    const md = await ref2svg(refData, ctoken)
    const line = refData.position.line
    const link = vscode.Uri.parse('command:latex-workshop.synctexto').with({ query: JSON.stringify([line, refData.file]) })
    const mdLink = new vscode.MarkdownString(`[View on pdf](${link})`)
    mdLink.isTrusted = true
    return new vscode.Hover( [MathPreviewUtils.addDummyCodeBlock(`![equation](${md})`), mdLink], refData.math?.range )
}

async function ref2svg(refData: ReferenceItem, ctoken?: vscode.CancellationToken) {
    if (refData.math === undefined) {
        return ''
    }
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const scale = configuration.get('hover.preview.scale') as number

    const macros = await findMacros(ctoken)

    let newTeXString: string
    if (refData.prevIndex !== undefined && configuration.get('hover.ref.number.enabled') as boolean) {
        const tag = refData.prevIndex.refNumber
        const texString = replaceLabelWithTag(refData.math.texString, refData.label, tag)
        newTeXString = MathPreviewUtils.mathjaxify(texString, refData.math.envname, {stripLabel: false})
    } else {
        newTeXString = MathPreviewUtils.mathjaxify(refData.math.texString, refData.math.envname)
    }
    const typesetArg = macros + MathPreviewUtils.stripTeX(newTeXString, macros)
    try {
        const xml = await lw.preview.math.typeset(typesetArg, { scale, color: foreColor })
        const svg = utils.svgToDataUrl(xml)
        return svg
    } catch(e) {
        logger.logError(`Failed rendering MathJax ${typesetArg} .`, e)
        throw e
    }
}

function replaceLabelWithTag(tex: string, refLabel?: string, tag?: string): string {
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

function refNumberMessage(refData: Pick<ReferenceItem, 'prevIndex'>): string | undefined {
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
    const xml = await typeset(macros + MathPreviewUtils.stripTeX(s, macros), {scale, color: foreColor})
    return { svgDataUrl: utils.svgToDataUrl(xml), macros }
}

function refreshMathColor() {
    foreColor = getCurrentThemeLightness() === 'light' ? '#000000' : '#ffffff'
}

async function typeset(arg: string, opts: { scale: number, color: string }): Promise<string> {
    return (await proxy).typeset(arg, opts).timeout(3000)
}

function renderCursor(document: vscode.TextDocument, texMath: TeXMathEnv): Promise<string> {
    return renderCursorWorker(document, texMath, foreColor)
}

function findTeX(document: ITextDocumentLike, position: vscode.Position): TeXMathEnv | undefined {
    return TeXMathEnvFinder.findHoverOnTex(document, position)
}

function findRef(
    refData: Pick<ReferenceItem, 'file' | 'position'>,
    token: string
) {
    const document = TextDocumentLike.load(refData.file)
    const position = refData.position
    return TeXMathEnvFinder.findHoverOnRef(document, position, refData, token)
}

function findMath(document: ITextDocumentLike, position: vscode.Position): TeXMathEnv | undefined {
    return TeXMathEnvFinder.findMathEnvIncludingPosition(document, position)
}
