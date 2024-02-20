import * as vscode from 'vscode'
import { lw } from '../../lw'
import type { ReferenceItem, TeXMathEnv } from '../../types'
import { addDummyCodeBlock, getColor, mathjaxify, stripTeX, svg2DataUrl } from './utils'
import { findMacros } from '../../parse/newcommandfinder'

const logger = lw.log('Preview', 'Ref')

export async function onRef(
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

function refNumberMessage(refData: Pick<ReferenceItem, 'prevIndex'>): string | undefined {
    if (refData.prevIndex) {
        const refNum = refData.prevIndex.refNumber
        const refMessage = `numbered ${refNum} at last compilation`
        return refMessage
    }
    return
}
export async function ref2svg(refData: ReferenceItem, ctoken?: vscode.CancellationToken) {
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

export async function tex2svg(tex: TeXMathEnv, macros?: string, texStr?: string) {
    macros = macros ?? await findMacros()
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const scale = configuration.get('hover.preview.scale') as number
    texStr = texStr ?? mathjaxify(tex.texString, tex.envname)
    texStr = macros + stripTeX(texStr, macros)
    try {
        const data = svg2DataUrl(await lw.preview.mathjax.typeset(texStr, {scale, color: getColor()}))
        return { svgDataUrl: data, macros }
    } catch(e) {
        logger.logError(`Failed rendering MathJax ${texStr} .`, e)
        throw e
    }
}
