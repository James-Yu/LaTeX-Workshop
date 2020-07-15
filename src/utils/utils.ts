import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as iconv from 'iconv-lite'

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
}

export function escapeRegExp(str: string) {
    return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
}

/**
 * Removes a comment on each line of `text`.
 *
 * @param text A string in which comments get removed.
 * @param commentSign The character starting a comment. Typically '%'.
 */
export function stripComments(text: string, commentSign: string): string {
    const pattern = '([^\\\\]|^)' + commentSign + '.*$'
    const reg = RegExp(pattern, 'gm')
    return text.replace(reg, '$1')
}

/**
 * Remove comments and verbatim content
 *
 * @param text A multiline string to be stripped
 */
export function stripCommentsAndVerbatim(text: string): string {
    let content = text.replace(/([^\\]|^)%.*$/gm, '$1') // Strip comments
    content = content.replace(/\\verb\*?([^a-zA-Z0-9]).*\1/, '')
    const verbatimPattern = '\\\\begin{verbatim}.*\\\\end{verbatim}'
    const reg = RegExp(verbatimPattern, 'gms')
    content = content.replace(reg, (match, ..._args) => {
        const len = match.split('\n').length
        return '\n'.repeat(len - 1)
    })
    return content
}

/**
 * Finds the longest substring containing balanced curly braces {...}
 *
 * @param s A string to be searched.
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

/**
 * Resolves an input file to the absolute path using the prefixes `dirs`.
 * Returns `undefined` if the file does not exist.
 *
 * @param dirs An array of the paths of directories. They are used as prefixes for `inputFile`.
 * @param inputFile The path of a input file to be resolved.
 * @param suffix The sufix of the input file
 */
export function resolveFile(dirs: string[], inputFile: string, suffix: string = '.tex'): string | undefined {
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
    return undefined
}

export const iconvLiteSupportedEncodings = ['utf8', 'utf16le', 'UTF-16BE', 'UTF-16', 'Shift_JIS', 'Windows-31j', 'Windows932', 'EUC-JP', 'GB2312', 'GBK', 'GB18030', 'Windows936', 'EUC-CN', 'KS_C_5601', 'Windows949', 'EUC-KR', 'Big5', 'Big5-HKSCS', 'Windows950', 'ISO-8859-1', 'ISO-8859-1', 'ISO-8859-2', 'ISO-8859-3', 'ISO-8859-4', 'ISO-8859-5', 'ISO-8859-6', 'ISO-8859-7', 'ISO-8859-8', 'ISO-8859-9', 'ISO-8859-10', 'ISO-8859-11', 'ISO-8859-12', 'ISO-8859-13', 'ISO-8859-14', 'ISO-8859-15', 'ISO-8859-16', 'windows-874', 'windows-1250', 'windows-1251', 'windows-1252', 'windows-1253', 'windows-1254', 'windows-1255', 'windows-1256', 'windows-1257', 'windows-1258', 'koi8-r', 'koi8-u', 'koi8-ru', 'koi8-t']

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

/**
 * Prefix that server.ts uses to distiguish requests on pdf files from others.
 * We use '.' because it is not converted by encodeURIComponent and other functions.
 * See https://stackoverflow.com/questions/695438/safe-characters-for-friendly-url
 * See https://tools.ietf.org/html/rfc3986#section-2.3
 */
export const pdfFilePrefix = 'pdf..'

/**
 * We encode the path with base64url after calling encodeURIComponent.
 * The reason not using base64url directly is that we are not sure that
 * encodeURIComponent, unescape, and btoa trick is valid on node.js.
 * - https://en.wikipedia.org/wiki/Base64#URL_applications
 * - https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa#Unicode_strings
 */
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

export function encodePathWithPrefix(pdfFilePath: string) {
    return pdfFilePrefix + encodePath(pdfFilePath)
}

export function decodePathWithPrefix(b64urlWithPrefix: string) {
    const s = b64urlWithPrefix.replace(pdfFilePrefix, '')
    return decodePath(s)
}

export function svgToDataUrl(xml: string): string {
    const svg64 = Buffer.from(unescape(encodeURIComponent(xml)), 'binary').toString('base64')
    const b64Start = 'data:image/svg+xml;base64,'
    return b64Start + svg64
}

/**
 * Returns a function replacing placeholders of LaTeX recipes.
 *
 * @param rootFile The path of the root file.
 * @param tmpDir The path of a temporary directory.
 * @returns A function replacing placeholders.
 */
export function replaceArgumentPlaceholders(rootFile: string, tmpDir: string): (arg: string) => string {
    return (arg: string) => {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const docker = configuration.get('docker.enabled')

        const rootFileParsed = path.parse(rootFile)
        const docfile = rootFileParsed.name
        const docfileExt = rootFileParsed.base
        const dirW32 = path.normalize(rootFileParsed.dir)
        const dir = dirW32.split(path.sep).join('/')
        const docW32 = path.join(dirW32, docfile)
        const doc = docW32.split(path.sep).join('/')
        const docExtW32 = path.join(dirW32, docfileExt)
        const docExt = docExtW32.split(path.sep).join('/')

        const expandPlaceHolders = (a: string): string => {
            return a.replace(/%DOC%/g, docker ? docfile : doc)
                    .replace(/%DOC_W32%/g, docker ? docfile : docW32)
                    .replace(/%DOC_EXT%/g, docker ? docfileExt : docExt)
                    .replace(/%DOC_EXT_W32%/g, docker ? docfileExt : docExtW32)
                    .replace(/%DOCFILE_EXT%/g, docfileExt)
                    .replace(/%DOCFILE%/g, docfile)
                    .replace(/%DIR%/g, docker ? './' : dir)
                    .replace(/%DIR_W32%/g, docker ? './' : dirW32)
                    .replace(/%TMPDIR%/g, tmpDir)

        }
        const outDirW32 = path.normalize(expandPlaceHolders(configuration.get('latex.outDir') as string))
        const outDir = outDirW32.split(path.sep).join('/')
        return expandPlaceHolders(arg).replace(/%OUTDIR%/g, outDir).replace(/%OUTDIR_W32%/g, outDirW32)

    }
}
