import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'


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
 * Remove comments
 *
 * @param text A string in which comments get removed.
 * @return the input text with comments removed.
 * Note the number lines of the output matches the input
 */
export function stripComments(text: string): string {
    const reg = /(^|[^\\]|(?:(?<!\\)(?:\\\\)+))%.*$/gm
    return text.replace(reg, '$1')
}

/**
 * Remove comments and verbatim content
 *
 * @param text A multiline string to be stripped
 * @return the input text with comments and verbatim content removed.
 * Note the number lines of the output matches the input
 */
export function stripCommentsAndVerbatim(text: string): string {
    let content = stripComments(text)
    content = content.replace(/\\verb\*?([^a-zA-Z0-9]).*?\1/, '')
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const verbatimEnvs = configuration.get('latex.verbatimEnvs') as string[]
    const verbatimAlt = verbatimEnvs.join('|')
    const verbatimPattern = `\\\\begin{(${verbatimAlt})}.*?\\\\end{\\1}`
    const reg = RegExp(verbatimPattern, 'gms')
    // Remove verbatim envs. It fails with nested verbatim envs.
    content = content.replace(reg, (match, ..._args) => {
        const len = Math.max(match.split('\n').length, 1)
        return '\n'.repeat(len - 1)
    })
    return content
}

/**
 * Find the longest substring containing balanced curly braces {...}
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
                nested--
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
 * Resolve a relative file path to an absolute path using the prefixes `dirs`.
 *
 * @param dirs An array of the paths of directories. They are used as prefixes for `inputFile`.
 * @param inputFile The path of a input file to be resolved.
 * @param suffix The suffix of the input file
 * @return an absolute path or undefined if the file does not exist
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

/**
 * Return a function replacing placeholders of LaTeX recipes.
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
