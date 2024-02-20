import * as vscode from 'vscode'
import { stripComments } from '../../utils/utils'

export function getColor() {
    return vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light ? '#000000' : '#ffffff'
}

export function mathjaxify(tex: string, envname: string, opt = { stripLabel: true }): string {
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

export function stripTeX(tex: string, macros: string): string {
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

export function addDummyCodeBlock(md: string): string {
    // We need a dummy code block in hover to make the width of hover larger.
    const dummyCodeBlock = '```\n```'
    return dummyCodeBlock + '\n' + md + '\n' + dummyCodeBlock
}

export function svg2DataUrl(xml: string): string {
    // We have to call encodeURIComponent and unescape because SVG can includes non-ASCII characters.
    // We have to encode them before converting them to base64.
    const svg64 = Buffer.from(unescape(encodeURIComponent(xml)), 'binary').toString('base64')
    const b64Start = 'data:image/svg+xml;base64,'
    return b64Start + svg64
}
