import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as tmp from 'tmp'
import * as cs from 'cross-spawn'
import * as utils from '../utils/utils'
import { lw } from '../lw'

const logger = lw.log('File')

export const file = {
    tmpDirPath: createTmpDir(),
    getOutDir,
    getLangId,
    getJobname,
    getBibPath,
    getPdfPath,
    getFlsPath,
    hasBinaryExt,
    hasTeXExt,
    hasTexLangId,
    hasBibLangId,
    hasDtxLangId,
    exists,
    read,
    kpsewhich,
}

/**
 * Creates a temporary directory and returns its path.
 *
 * @returns {string} - The path of the created temporary directory.
 */
function createTmpDir(): string {
    try {
        return tmp.dirSync({ unsafeCleanup: true }).name.split(path.sep).join('/')
    } catch (error) {
        if (error instanceof Error) {
            handleTmpDirError(error)
        }
        throw error
    }
}

/**
 * Handles error outputs that occur during the creation of a temporary
 * directory.
 *
 * @param {Error} error - The error object.
 */
function handleTmpDirError(error: Error) {
    if (/['"]/.exec(os.tmpdir())) {
        const msg = `The path of tmpdir cannot include single quotes and double quotes: ${os.tmpdir()}`
        void vscode.window.showErrorMessage(msg)
        console.log(msg)
    } else {
        void vscode.window.showErrorMessage(`Error during making tmpdir to build TeX files: ${error.message}. Please check the environment variables, TEMP, TMP, and TMPDIR on your system.`)
        console.log(`TEMP, TMP, and TMPDIR: ${JSON.stringify([process.env.TEMP, process.env.TMP, process.env.TMPDIR])}`)
    }
}

/**
 * Returns `true` if the file extension is one of the supported TeX extensions.
 *
 * @param {string} extname - The file extension.
 * @returns {boolean} - Indicates whether the extension is supported.
 */
function hasTeXExt(extname: string): boolean {
    return [
        ...lw.constant.TEX_EXT,
        ...lw.constant.RSWEAVE_EXT,
        ...lw.constant.JLWEAVE_EXT,
        ...lw.constant.PWEAVE_EXT
    ].includes(extname)
}
/**
 * Returns `true` if the file extension is not one of the TeX source extensions.
 *
 * @param {string} extname - The file extension.
 * @returns {boolean} - Indicates whether the extension is not a TeX source
 * extension.
 */
function hasBinaryExt(extname: string): boolean {
    return ![
        ...lw.constant.TEX_EXT,
        ...lw.constant.TEX_NOCACHE_EXT,
        ...lw.constant.RSWEAVE_EXT,
        ...lw.constant.JLWEAVE_EXT,
        ...lw.constant.PWEAVE_EXT
    ].includes(extname)
}

/**
 * Returns `true` if the language of `id` is one of the supported TeX languages.
 *
 * @param {string} langId - The language identifier.
 * @returns {boolean} - Indicates whether the language is supported.
 */
function hasTexLangId(langId: string): boolean {
    return ['tex', 'latex', 'latex-expl3', 'doctex', 'pweave', 'jlweave', 'rsweave'].includes(langId)
}

/**
 * Returns `true` if the language of `id` is BibTeX.
 *
 * @param {string} langId - The language identifier.
 * @returns {boolean} - Indicates whether the language is BibTeX.
 */
function hasBibLangId(langId: string): boolean {
    return langId === 'bibtex'
}

/**
 * Returns `true` if the language of `id` is Doctex.
 *
 * @param {string} langId - The language identifier.
 * @returns {boolean} - Indicates whether the language is Doctex.
 */
function hasDtxLangId(langId: string): boolean {
    return langId === 'doctex'
}

/**
 * Returns the output directory developed according to the input tex path and
 * 'latex.outDir' config. If `texPath` is `undefined`, the default root file is
 * used. If there is not root file, returns './'. The returned path always uses
 * `/` even on Windows.
 *
 * @param {string} [texPath] - The path of a LaTeX file.
 * @returns {string} - The output directory path.
 */
function getOutDir(texPath?: string): string {
    texPath = texPath ?? lw.root.file.path
    // rootFile is also undefined
    if (texPath === undefined) {
        return './'
    }

    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(texPath))
    const outDir = configuration.get('latex.outDir') as string
    const out = utils.replaceArgumentPlaceholders(texPath, file.tmpDirPath)(outDir)
    if (outDir === '%DIR%' || outDir === '%DIR_W32%') {
        return lw.compile.lastSteps.filter(step => step.outdir).slice(-1)[0]?.outdir ?? path.normalize(out).split(path.sep).join('/')
    }
    return path.normalize(out).split(path.sep).join('/')
}

/**
 * Returns the language identifier based on the file extension.
 *
 * @param {string} filename - The name of the file.
 * @returns {string | undefined} - The language identifier.
 */
function getLangId(filename: string): string | undefined {
    const ext = path.extname(filename).toLocaleLowerCase()
    if (ext === '.tex') {
        return 'latex'
    } else if (lw.constant.PWEAVE_EXT.includes(ext)) {
        return 'pweave'
    } else if (lw.constant.JLWEAVE_EXT.includes(ext)) {
        return 'jlweave'
    } else if (lw.constant.RSWEAVE_EXT.includes(ext)) {
        return 'rsweave'
    } else if (ext === '.dtx') {
        return 'doctex'
    } else {
        return
    }
}

/**
 * Returns the jobname. If empty, return the name of the input `texPath`.
 *
 * @param {string} texPath - The path of a LaTeX file.
 * @returns {string} - The jobname.
 */
function getJobname(texPath: string): string {
    const config = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(texPath))
    const jobname = config.get('latex.jobname') as string
    const texname = path.parse(texPath).name
    return jobname || texname
}

/**
 * Returns the path of a PDF file with respect to `texPath`.
 *
 * @param {string} texPath - The path of a LaTeX file.
 * @returns {string} - The path of the PDF file.
 */
function getPdfPath(texPath: string): string {
    return path.resolve(path.dirname(texPath), getOutDir(texPath), path.basename(`${getJobname(texPath)}.pdf`))
}

/**
 * Search for a `.fls` file associated to a tex file
 *
 * @param {string} texPath - The path of LaTeX file.
 * @returns {string | undefined} - The path of the .fls file or undefined.
 */
function getFlsPath(texPath: string): string | undefined {
    const rootDir = path.dirname(texPath)
    const outDir = getOutDir(texPath)
    const fileName = path.parse(getJobname(texPath)).name + '.fls'
    let flsFile = path.resolve(rootDir, path.join(outDir, fileName))
    if (fs.existsSync(flsFile)) {
        return flsFile
    }
    flsFile = path.resolve(rootDir, lw.compile.lastSteps.filter(step => step.auxdir).slice(-1)[0]?.auxdir ?? '', fileName)
    return fs.existsSync(flsFile) ? flsFile : undefined
}

const kpsecache: {[query: string]: string} = {}
/**
 * Calls `kpsewhich` to resolve file paths.
 *
 * @param {string[]} args - Command line arguments for `kpsewhich`.
 * @returns {string | undefined} - The resolved file path or undefined if not
 * found.
 */
function kpsewhich(args: string[]): string | undefined {
    const query = args.join(' ')
    if (kpsecache[query]) {
        logger.log(`kpsewhich cache hit on ${query}: ${kpsecache[query]} .`)
        return kpsecache[query]
    }
    const command = vscode.workspace.getConfiguration('latex-workshop').get('kpsewhich.path') as string
    logger.log(`Calling ${command} to resolve ${query} .`)

    try {
        const kpsewhichReturn = cs.sync(command, args, {cwd: lw.root.dir.path || vscode.workspace.workspaceFolders?.[0].uri.path})
        if (kpsewhichReturn.status === 0) {
            const output = kpsewhichReturn.stdout.toString().replace(/\r?\n/, '')
            logger.log(`kpsewhich returned with '${output}'.`)
            if (output !== '') {
                kpsecache[query] = output
                return output
            }
        }
        logger.log(`kpsewhich returned with non-zero code ${kpsewhichReturn.status}.`)
        return undefined
    } catch (e) {
        logger.logError(`Calling ${command} on ${query} failed.`, e)
        return undefined
    }
}

/**
 * Search for the path of a BibTeX file.
 *
 * This function searches for the path of a BibTeX file by considering the
 * provided BibTeX file name or pattern and the base directory to search. It
 * first constructs a list of search directories, including the base directory
 * and additional BibTeX directories from configuration 'latex.bibDirs'. If a
 * root directory is available, it is added to the search directories as well.
 * The function then uses utility functions to resolve the BibTeX file path,
 * considering whether the provided BibTeX name includes a wildcard '*'
 * character. If the resolved path is not found, and 'kpsewhich' is enabled in
 * the configuration, it attempts to resolve the path using 'kpsewhich' with
 * specific arguments. The final result is an array of BibTeX file paths.
 *
 * @param {string} bib - The BibTeX file name or pattern.
 * @param {string} baseDir - The base directory to search.
 * @returns {string[]} - An array of BibTeX file paths.
 */
function getBibPath(bib: string, baseDir: string): string[] {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const bibDirs = configuration.get('latex.bibDirs') as string[]
    let searchDirs: string[] = [baseDir, ...bibDirs]
    // chapterbib requires to load the .bib file in every chapter using
    // the path relative to the rootDir
    if (lw.root.dir.path) {
        searchDirs = [lw.root.dir.path, ...searchDirs]
    }
    const bibPath = bib.includes('*') ? utils.resolveFileGlob(searchDirs, bib, '.bib') : utils.resolveFile(searchDirs, bib, '.bib')

    if (bibPath === undefined || bibPath.length === 0) {
        if (configuration.get('kpsewhich.enabled')) {
            const kpsePath = kpsewhich(['-format=.bib', bib])
            return kpsePath ? [ kpsePath ] : []
        } else {
            logger.log(`Cannot resolve bib path: ${bib} .`)
            return []
        }
    }
    return [ bibPath ].flat()
}

/**
 * Resolves the content of a file given its path.
 *
 * This function reads the content of a file specified by the provided file
 * path. It uses the Node.js 'fs' module to read the file in UTF-8 encoding. The
 * 'raise' parameter determines whether to raise exceptions if the file is not
 * found. If 'raise' is set to false, it returns undefined instead of throwing
 * an error when the file is not found. The result is the content of the file or
 * undefined.
 *
 * @param {string} filePath - The path of the file.
 * @param {boolean} [raise=false] - Indicates whether to raise exceptions if the
 * file is not found.
 * @returns {string | undefined} - The content of the file or undefined if not
 * found.
 */
function read(filePath: string, raise: boolean = false): string | undefined {
    try {
        return fs.readFileSync(filePath, 'utf-8')
    } catch (err) {
        if (raise === false) {
            return undefined
        }
        throw err
    }
}

/**
 * Checks if a file or URI exists.
 *
 * @param {vscode.Uri} uri - The URI of the file or resource.
 * @returns {Promise<boolean>} - A promise that resolves to true if the file or
 * URI exists, false otherwise.
 */
async function exists(uri: vscode.Uri): Promise<boolean> {
    try {
        if (uri.scheme === 'file') {
            return fs.existsSync(uri.fsPath)
        } else {
            await vscode.workspace.fs.stat(uri)
            return true
        }
    } catch {
        return false
    }
}
