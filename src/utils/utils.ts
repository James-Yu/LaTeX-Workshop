import * as path from 'path'
import * as fs from 'fs-extra'
import * as iconv from 'iconv-lite'

export function escapeRegExp(str: string) {
    return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
}

/**
 * Remove the comments if any
 */
export function stripComments(text: string, commentSign: string): string {
    const pattern = '([^\\\\]|^)' + commentSign + '.*$'
    const reg = RegExp(pattern, 'gm')
    return text.replace(reg, '$1')
}

/**
 * Finding the longest substring containing balanced {...}
 * @param s a string
 */
export function getLongestBalancedString(s: string): string {
    let nested = 1
    let i = 0
    for (i = 0; i < s.length; i++) {
        switch (s[i]) {
            case '{':
                nested++
                break
            case '}':
                nested --
                break
            case '\\':
                // skip an escaped character
                i++
                break
            default:
        }
        if (nested === 0) {
            break
        }
    }
    return s.substring(0, i)
}

// Given an input file determine its full path using the prefixes dirs
export function resolveFile(dirs: string[], inputFile: string, suffix: string = '.tex'): string | null {
    if (inputFile.startsWith('/')) {
        dirs.unshift('')
    }
    for (const d of dirs) {
        let inputFilePath = path.resolve(d, inputFile)
        if (path.extname(inputFilePath) === '') {
            inputFilePath += suffix
        }
        if (!fs.existsSync(inputFilePath) && fs.existsSync(inputFilePath + suffix)) {
            inputFilePath += suffix
        }
        if (fs.existsSync(inputFilePath)) {
            return inputFilePath
        }
    }
    return null
}

const iconvLiteSupportedEncodings = ['utf8', 'utf16le', 'UTF-16BE', 'UTF-16', 'Shift_JIS', 'Windows-31j', 'Windows932', 'EUC-JP', 'GB2312', 'GBK', 'GB18030', 'Windows936', 'EUC-CN', 'KS_C_5601', 'Windows949', 'EUC-KR', 'Big5', 'Big5-HKSCS', 'Windows950', 'ISO-8859-1', 'ISO-8859-1', 'ISO-8859-2', 'ISO-8859-3', 'ISO-8859-4', 'ISO-8859-5', 'ISO-8859-6', 'ISO-8859-7', 'ISO-8859-8', 'ISO-8859-9', 'ISO-8859-10', 'ISO-8859-11', 'ISO-8859-12', 'ISO-8859-13', 'ISO-8859-14', 'ISO-8859-15', 'ISO-8859-16', 'windows-874', 'windows-1250', 'windows-1251', 'windows-1252', 'windows-1253', 'windows-1254', 'windows-1255', 'windows-1256', 'windows-1257', 'windows-1258', 'koi8-r', 'koi8-u', 'koi8-ru', 'koi8-t']
export function convertFilenameEncoding(filePath: string): string | undefined {
    for (const enc of iconvLiteSupportedEncodings) {
        try {
            const fpath = iconv.decode(Buffer.from(filePath, 'binary'), enc)
            if (fs.existsSync(fpath)) {
                return fpath
            }
        } catch (e) {

        }
    }
    return undefined
}

// prefix that server.ts uses to distiguish requests on pdf files from others.
// We use '.' because it is not converted by encodeURIComponent and other functions.
// See https://stackoverflow.com/questions/695438/safe-characters-for-friendly-url
// See https://tools.ietf.org/html/rfc3986#section-2.3

export const pdfFilePrefix = 'pdf..'

// We encode the path with base64url after calling encodeURIComponent.
// The reason not using base64url directly is that we are not sure that
// encodeURIComponent, unescape, and btoa trick is valid on node.js.
// See https://en.wikipedia.org/wiki/Base64#URL_applications
// See https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa#Unicode_strings
export function encodePath(url: string) {
    const s = encodeURIComponent(url)
    const b64 = Buffer.from(s).toString('base64')
    const b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return b64url
}

export function decodePath(b64url: string) {
    const tmp = b64url + '='.repeat((4 - b64url.length % 4) % 4)
    const b64 = tmp.replace(/-/g, '+').replace(/_/g, '/')
    const s = Buffer.from(b64, 'base64').toString()
    return decodeURIComponent(s)
}

export function encodePathWithPrefix(url: string) {
    return pdfFilePrefix + encodePath(url)
}

export function decodePathWithPrefix(b64urlWithPrefix: string) {
    const s = b64urlWithPrefix.replace(pdfFilePrefix, '')
    return decodePath(s)
}

export const themeColorMap: { [theme: string]: 'light' | 'dark' } = {
    'Abyss': 'dark',
    'Default Dark+': 'dark',
    'Default Light+': 'light',
    'Visual Studio Dark': 'dark',
    'Visual Studio Light': 'light',
    'Default High Contrast': 'dark',
    'Kimbie Dark': 'dark',
    'Monokai Dimmed': 'dark',
    'Monokai': 'dark',
    'Quiet Light': 'light',
    'Red': 'dark',
    'vs-seti': 'dark',
    'Solarized Dark': 'dark',
    'Solarized Light': 'light',
    'Tomorrow Night Blue': 'dark',
    'One Dark Pro': 'dark',
    'One Dark Pro Vivid': 'dark',
    'One Dark Pro Bold': 'dark',
    'Material Theme': 'dark',
    'Material Theme High Contrast': 'dark',
    'Material Theme Darker': 'dark',
    'Material Theme Darker High Contrast': 'dark',
    'Material Theme Palenight': 'dark',
    'Material Theme Palenight High Contrast': 'dark',
    'Material Theme Ocean': 'dark',
    'Material Theme Ocean High Contrast': 'dark',
    'Material Theme Lighter': 'light',
    'Material Theme Lighter High Contrast': 'light',
    'Atom One Dark': 'dark',
    'Dracula': 'dark',
    'Dracula Soft': 'dark'
}

export function svgToDataUrl(xml: string): string {
    const svg64 = Buffer.from(unescape(encodeURIComponent(xml)), 'binary').toString('base64')
    const b64Start = 'data:image/svg+xml;base64,'
    return b64Start + svg64
}
