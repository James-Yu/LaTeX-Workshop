import * as vscode from 'vscode'
import * as path from 'path'
import * as workerpool from 'workerpool'
import type { SupportedExtension } from 'mathjax-full'
import type { IMathJaxWorker } from './math/mathjax'
import { lw } from '../lw'
import type { ReferenceItem, TeXMathEnv } from '../types'
import { getCurrentThemeLightness } from '../utils/theme'
import { stripComments } from '../utils/utils'
import { renderCursor as renderCursorWorker } from './math/mathpreviewlib/cursorrenderer'
import { type ITextDocumentLike } from './math/mathpreviewlib/textdocumentlike'
import { findMacros } from './math/mathpreviewlib/newcommandfinder'
import { TeXMathEnvFinder } from './math/mathpreviewlib/texmathenvfinder'

const logger = lw.log('Preview', 'Math')

export const math = {
    refreshMathColor,
    onRef,
    onTeX,
    findTeX,
    findMath,
    ref2svg,
    tex2svg,
    renderCursor
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
    s = mathjaxify(s, tex.envname)
    const typesetArg = macros + stripTeX(s, macros)
    const typesetOpts = { scale, color: foreColor }
    try {
        const xml = await typeset(typesetArg, typesetOpts)
        const md = svg2DataUrl(xml)
        return new vscode.Hover(new vscode.MarkdownString(addDummyCodeBlock(`![equation](${md})`)), tex.range )
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
    return new vscode.Hover( [addDummyCodeBlock(`![equation](${md})`), mdLink], refData.math?.range )
}

async function ref2svg(refData: ReferenceItem, ctoken?: vscode.CancellationToken) {
    if (refData.math === undefined) {
        return ''
    }
    const texMath = refData.math
    const configuration = vscode.workspace.getConfiguration('latex-workshop')

    const macros = await findMacros(ctoken)

    let texStr: string | undefined = undefined
    if (refData.prevIndex !== undefined && configuration.get('hover.ref.number.enabled') as boolean) {
        const tag = refData.prevIndex.refNumber
        const texString = replaceLabelWithTag(texMath.texString, refData.label, tag)
        texStr = mathjaxify(texString, texMath.envname, {stripLabel: false})
    }
    const svg = await tex2svg(texMath, macros, texStr)
    return svg.svgDataUrl
}

async function tex2svg(tex: TeXMathEnv, macros?: string, texStr?: string) {
    macros = macros ?? await findMacros()
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const scale = configuration.get('hover.preview.scale') as number
    texStr = texStr ?? mathjaxify(tex.texString, tex.envname)
    texStr = macros + stripTeX(texStr, macros)
    try {
        const xml = await typeset(texStr, {scale, color: foreColor})
        return { svgDataUrl: svg2DataUrl(xml), macros }
    } catch(e) {
        logger.logError(`Failed rendering MathJax ${texStr} .`, e)
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

function findMath(document: ITextDocumentLike, position: vscode.Position): TeXMathEnv | undefined {
    return TeXMathEnvFinder.findMathEnvIncludingPosition(document, position)
}

function addDummyCodeBlock(md: string): string {
    // We need a dummy code block in hover to make the width of hover larger.
    const dummyCodeBlock = '```\n```'
    return dummyCodeBlock + '\n' + md + '\n' + dummyCodeBlock
}

function stripTeX(tex: string, macros: string): string {
    // First remove math env declaration
    if (tex.startsWith('$$') && tex.endsWith('$$')) {
        tex = tex.slice(2, tex.length - 2)
    } else if (tex.startsWith('$') && tex.endsWith('$')) {
        tex = tex.slice(1, tex.length - 1)
    } else if (tex.startsWith('\\(') && tex.endsWith('\\)')) {
        tex = tex.slice(2, tex.length - 2)
    } else if (tex.startsWith('\\[') && tex.endsWith('\\]')) {
        tex = tex.slice(2, tex.length - 2)
    }
    // Then remove the star variant of new macros
    [...macros.matchAll(/\\newcommand\{(.*?)\}/g)].forEach(match => {
        tex = tex.replaceAll(match[1] + '*', match[1])
    })
    return tex
}

function mathjaxify(tex: string, envname: string, opt = { stripLabel: true }): string {
    // remove TeX comments
    let s = stripComments(tex)
    // remove \label{...}
    if (opt.stripLabel) {
        s = s.replace(/\\label\{.*?\}/g, '')
    }
    if (envname.match(/^(aligned|alignedat|array|Bmatrix|bmatrix|cases|CD|gathered|matrix|pmatrix|smallmatrix|split|subarray|Vmatrix|vmatrix)$/)) {
        s = '\\begin{equation}' + s + '\\end{equation}'
    }
    return s
}

function svg2DataUrl(xml: string): string {
    // We have to call encodeURIComponent and unescape because SVG can includes non-ASCII characters.
    // We have to encode them before converting them to base64.
    const svg64 = Buffer.from(unescape(encodeURIComponent(xml)), 'binary').toString('base64')
    const b64Start = 'data:image/svg+xml;base64,'
    return b64Start + svg64
}
