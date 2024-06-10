import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import * as tmp from 'tmp'
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
    hasTeXLangId,
    hasBibLangId,
    hasDtxLangId,
    setTeXDirs,
    exists,
    read,
    kpsewhich,
    _test: {
        createTmpDir
    }
}

/**
 * Creates a temporary directory and returns its path as a string.
 *
 * This function utilizes the `tmp` library to create a temporary directory. The
 * `unsafeCleanup` option is enabled, ensuring that the directory and its
 * contents are removed even if there are open file handles. The function then
 * normalizes the directory path by replacing the system-specific path
 * separators with forward slashes, making it compatible across different
 * operating systems. In the event of an error, it captures the exception,
 * handles it using a custom error handler `handleTmpDirError`, and then
 * rethrows the error to be handled by the calling function.
 *
 * @returns {string} The normalized path of the created temporary directory.
 * @throws Will throw an error if the temporary directory creation fails.
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
 * Handles errors related to the temporary directory.
 *
 * This function is responsible for dealing with errors that occur in the
 * process of creating or accessing the temporary directory used for building
 * TeX files. It checks if the temporary directory path contains single or
 * double quotes, which are not allowed. If such quotes are present, it logs an
 * error message and displays it to the user. Otherwise, it logs a generic error
 * message suggesting to check environment variables related to the temporary
 * directory paths.
 *
 * @param {Error} error - The error object encountered during the operation.
 */
function handleTmpDirError(error: Error) {
    if (/['"]/.exec(os.tmpdir())) {
        const msg = `The path of tmpdir cannot include single quotes and double quotes: ${os.tmpdir()}`
        void vscode.window.showErrorMessage(msg)
        logger.log(msg)
    } else {
        void vscode.window.showErrorMessage(`Error during making tmpdir to build TeX files: ${error.message}. Please check the environment variables, TEMP, TMP, and TMPDIR on your system.`)
        logger.log(`TEMP, TMP, and TMPDIR: ${JSON.stringify([process.env.TEMP, process.env.TMP, process.env.TMPDIR])}`)
    }
}

/**
 * Checks if the given file extension is associated with TeX-related extensions.
 *
 * This function verifies whether a provided file extension string matches any
 * of the TeX-related extensions defined in several constant arrays. It
 * consolidates these arrays into a single collection and checks if the given
 * extension exists within this collection. The arrays include TeX extensions, R
 * Sweave extensions, Julia Weave extensions, and Python Weave extensions.
 *
 * @param {string} extname - The file extension to be checked including the dot
 * (e.g., '.tex').
 * @returns {boolean} - Returns true if the extension is one of the TeX-related
 * extensions; otherwise, false.
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
 * Determines if the provided file extension is not one of the TeX source
 * extensions.
 *
 * This function evaluates the given file extension and checks it against a
 * predefined list of TeX source extensions such as `.tex`, `.ltx`, `.sty`,
 * `.cls`, `.fd`, `.aux`, `.bbl`, `.blg`, `.brf`, `.log`, `.out`, and R Sweave
 * extensions, Julia Weave extensions, and Python Weave extensions. It returns
 * `true` if the extension is not found in this list, and `false` otherwise.
 * This is useful for filtering out non-TeX files from a collection of files.
 *
 * @param {string} extname - The file extension to be checked including the dot
 * (e.g., '.tex').
 * @returns {boolean} - Returns `true` if the extension is not one of the TeX
 * source extensions, `false` if it is.
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
 * Determines if the given language ID corresponds to a TeX-related language.
 *
 * This function checks if the provided `langId` matches any of the known
 * TeX-related language identifiers. These identifiers include 'tex', 'latex',
 * 'latex-expl3', 'doctex', 'pweave', 'jlweave', and 'rsweave'.
 *
 * @param {string} langId - The language identifier to check.
 * @returns {boolean} Returns `true` if `langId` is one of the TeX-related
 * language identifiers, otherwise `false`.
 */
function hasTeXLangId(langId: string): boolean {
    return ['tex', 'latex', 'latex-expl3', 'doctex', 'pweave', 'jlweave', 'rsweave'].includes(langId)
}

/**
 * Returns `true` if the language id is 'bibtex'.
 *
 * @param {string} langId - The language identifier.
 * @returns {boolean} - Indicates whether the language is BibTeX.
 */
function hasBibLangId(langId: string): boolean {
    return langId === 'bibtex'
}

/**
 * Returns `true` if the language id is 'doctex'.
 *
 * @param {string} langId - The language identifier.
 * @returns {boolean} - Indicates whether the language is Doctex.
 */
function hasDtxLangId(langId: string): boolean {
    return langId === 'doctex'
}

/**
 * An object that stores the output and auxiliary directories for TeX files.
 *
 * The `texDirs` object is a dictionary where each key is a string representing
 * the path to a TeX file, and the value is an object containing optional paths
 * for the output directory (`out`) and auxiliary directory (`aux`). This
 * structure allows for easy management and retrieval of directory paths
 * associated with each TeX file. This is particularly useful in scenarios where
 * multiple TeX files are being compiled, and each needs to have specific
 * directories for its output and auxiliary files.
 *
 * @type {Object.<string, {out?: string, aux?: string}>}
 */
const texDirs: {[tex: string]: {out?: string, aux?: string}} = {}
/**
 * Sets the output and auxiliary files directory for a root TeX file.
 *
 * This function takes the path to a root TeX file and optional paths for the
 * output and auxiliary directories. If the provided TeX file path does not end
 * with the '.tex' extension, the function appends it. It then stores the output
 * and auxiliary directory paths in a global `texDirs` object, using the TeX
 * file path as the key.
 *
 * The function ensures that each TeX file has an associated output and
 * auxiliary directory, which can be useful for tracing the various files
 * generated during the TeX compilation process.
 *
 * @param {string} tex - The path to a root TeX file. If it doesn't end with
 * '.tex', the extension is appended.
 * @param {string} [out] - The corresponding output directory path. Optional.
 * @param {string} [aux] - The corresponding auxiliary directory path. Optional.
 */
function setTeXDirs(tex: string, out?: string, aux?: string) {
    if (!tex.endsWith('.tex')) {
        tex += '.tex'
    }
    texDirs[tex] = {out, aux}
}

/**
 * Determines the output directory for a given LaTeX file path.
 *
 * This function calculates the output directory where LaTeX compilation
 * artifacts will be stored. If a specific LaTeX file path is provided, the
 * function uses it to determine the output directory. Otherwise, it defaults to
 * using the root file path. The function handles various scenarios, such as
 * undefined paths and placeholder replacements, ensuring the output directory
 * is appropriately formatted and normalized.
 *
 * The process begins by checking if the provided LaTeX file path (`texPath`) is
 * defined; if not, it defaults to the root file path of the LaTeX workshop. If
 * both are undefined, it returns the current directory (`./`). The function
 * retrieves the configuration for the LaTeX workshop and extracts the output
 * directory setting. If the setting is not specified, it defaults to the
 * current directory (`./`). It then replaces placeholders within the output
 * directory path with appropriate values using a utility function.
 *
 * The function further checks if the output directory is specified as `%DIR%`
 * or `%DIR_W32%` and attempts to retrieve a custom output directory from a
 * cached directory mapping. If none is found, it normalizes and formats the
 * output directory path, ensuring it uses forward slashes and trims any
 * trailing slashes.
 *
 * @param {string} [texPath] - The path to the LaTeX file. If not provided, the
 * root file path is used.
 * @returns {string} The resolved output directory path.
 */
function getOutDir(texPath?: string): string {
    texPath = texPath ?? lw.root.file.path
    // rootFile is also undefined
    if (texPath === undefined) {
        return './'
    }

    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(texPath))
    const outDir = configuration.get('latex.outDir') as string || './'
    const out = utils.replaceArgumentPlaceholders(texPath, file.tmpDirPath)(outDir)
    let result = undefined
    if (outDir === '%DIR%' || outDir === '%DIR_W32%') {
        result = texDirs[texPath]?.out
    }
    result = result ?? path.normalize(out).replaceAll(path.sep, '/')
    if (result !== './' && result.endsWith('/')) {
        result = result.slice(0, -1)
    }
    return result
}

/**
 * Returns the language identifier based on the file extension.
 *
 * This function takes a filename as an input and examines its extension to
 * determine the appropriate language identifier string. If the extension does
 * not match any of the predefined types, the function returns undefined.
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
 * Retrieves the job name for a LaTeX file based on the provided file path.
 *
 * If a job name is found in the configuration 'latex.jobname', it is returned;
 * otherwise, the function derives the job name from the base name of the
 * provided file path (excluding the directory and file extension).
 *
 * @param {string} texPath - The file path of the LaTeX document.
 * @returns {string} - The job name for the LaTeX document, either from the
 * configuration or derived from the file name.
 */
function getJobname(texPath: string): string {
    const jobname = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(texPath)).get('latex.jobname') as string
    return jobname || path.parse(texPath).name
}

/**
 * Constructs the absolute path to the PDF file corresponding to a given TeX
 * file.
 *
 * This function takes the path to a TeX file and generates the path to the
 * resulting PDF file. It first determines the directory of the TeX file and
 * combines it with the output directory, which is retrieved using the
 * `getOutDir` function. Finally, it appends the base name of the job (derived
 * from the TeX file) with a `.pdf` extension.
 *
 * @param {string} texPath - The path to the TeX file.
 * @returns {string} - The absolute path to the corresponding PDF file.
 */
function getPdfPath(texPath: string): string {
    return path.resolve(path.dirname(texPath), getOutDir(texPath), path.basename(`${getJobname(texPath)}.pdf`))
}

/**
 * Retrieves the .fls file path associated with a given .tex file.
 *
 * This function determines the file system path to the .fls file generated
 * during the compilation of a LaTeX document. It starts by identifying the root
 * directory and output directory of the provided .tex file. Using the job name
 * derived from the .tex file, it constructs the expected .fls file name. The
 * function first checks if this .fls file exists in the output directory; if
 * found, it returns this path. If not found, it then checks an auxiliary
 * directory (if specified) for the .fls file and returns the path if it exists.
 * If the .fls file is not found in either location, the function returns
 * `undefined`.
 *
 * @param {string} texPath - The file path to the .tex file for which the .fls
 * file path is to be determined.
 * @returns {Promise<string | undefined>} - The path to the .fls file if it exists, or
 * `undefined` if it does not.
 */
async function getFlsPath(texPath: string): Promise<string | undefined> {
    const rootDir = path.dirname(texPath)
    const outDir = getOutDir(texPath)
    const fileName = path.parse(getJobname(texPath)).name + '.fls'
    let flsFile = path.resolve(rootDir, path.join(outDir, fileName))
    if (await exists(flsFile)) {
        return flsFile
    }
    flsFile = path.resolve(rootDir, texDirs[texPath]?.aux ?? '', fileName)
    return await exists(flsFile) ? flsFile : undefined
}

/**
 * A cache object for storing resolved paths of LaTeX targets.
 *
 * This object stores the results of `kpsewhich` command executions, where each
 * key is a query string constructed from the target and its format, and the
 * corresponding value is the resolved path to the target. The cache helps in
 * avoiding redundant executions of the `kpsewhich` command by returning
 * previously computed results quickly.
 */
const kpsecache: {[query: string]: string} = {}
/**
 * Resolves the path to a given LaTeX target using the `kpsewhich` command.
 *
 * This function uses `kpsewhich` to find the path to a specified LaTeX target,
 * such as a .bib file. It first constructs the query string based on the target
 * and whether it is a bibliography file. If the result for this query is
 * already cached, it returns the cached value immediately. Otherwise, it
 * constructs the `kpsewhich` command and attempts to run it. If the command
 * executes successfully and returns a valid path, it caches this result and
 * returns the path. If the command fails or returns an error code, it logs the
 * error and returns `undefined`.
 *
 * @param {string} target - The LaTeX target to resolve, such as a file name.
 * @param {boolean} [isBib=false] - Indicates whether the target is a
 * bibliography file, default is false.
 * @returns {string | undefined} The resolved path to the target, or `undefined`
 * if resolution fails.
 */
function kpsewhich(target: string, isBib: boolean = false): string | undefined {
    const query = (isBib ? '-format=.bib ' : '') + target
    if (kpsecache[query]) {
        logger.log(`kpsewhich cache hit on ${query}: ${kpsecache[query]} .`)
        return kpsecache[query]
    }
    const command = vscode.workspace.getConfiguration('latex-workshop').get('kpsewhich.path') as string
    logger.log(`Calling ${command} to resolve ${query} .`)

    try {
        const args = isBib ? ['-format=.bib', target] : [target]
        const kpsewhichReturn = lw.external.sync(command, args, {cwd: lw.root.dir.path || vscode.workspace.workspaceFolders?.[0].uri.path})
        if (kpsewhichReturn.status === 0) {
            const output = kpsewhichReturn.stdout.toString().replace(/\r?\n/, '')
            logger.log(`kpsewhich returned with '${output}'.`)
            if (output !== '') {
                kpsecache[query] = output
            }
            return output
        }
        logger.log(`kpsewhich returned with non-zero code ${kpsewhichReturn.status}.`)
        return undefined
    } catch (e) {
        logger.logError(`Calling ${command} on ${query} failed.`, e)
        return undefined
    }
}

/**
 * Resolves the file paths for a given bibliography file based on the base
 * directory and configuration settings.
 *
 * This function first retrieves the configuration 'latex.bibDirs' to obtain
 * directories specified for bibliography files. It combines these directories
 * with the provided base directory to form a list of directories to search for
 * the bibliography file. Additionally, if the root directory of the LaTeX
 * project is available, it is prepended to the search list. Depending on
 * whether the bibliography file name includes wildcards, the function either
 * resolves it using a file glob or directly searches for the file. If the file
 * cannot be resolved, the function optionally attempts to locate it using the
 * `kpsewhich` tool if enabled in the configuration 'kpsewhich.bibtex.enabled'.
 * Finally, the resolved bibliography file path(s) are returned.
 *
 * @param {string} bib - The name of the bibliography file to resolve.
 * @param {string} baseDir - The base directory to start the search from.
 * @returns {string[]} An array containing the resolved file path(s) for the
 * bibliography file, or an empty array if the file could not be resolved.
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
        if (configuration.get('kpsewhich.bibtex.enabled')) {
            const kpsePath = kpsewhich(bib, true)
            return kpsePath ? [ kpsePath ] : []
        } else {
            logger.log(`Cannot resolve bib path: ${bib} .`)
            return []
        }
    }

    if (os.platform() === 'win32') {
        // Normalize drive letters on Windows.
        return [ bibPath ].flat().map(p => p.replace(/^([a-zA-Z]):/, (_, p1: string) => p1.toLowerCase() + ':'))
    } else {
        return [ bibPath ].flat()
    }
}

/**
 * Reads the content of a file at the specified file path.
 *
 * This function attempts to read the contents of a file located at the given
 * file path using the VS Code workspace file system API. If the file read
 * operation is successful, the function returns the file content as a string.
 * In the event of an error during the read operation, the function handles the
 * error based on the `raise` parameter.
 *
 * If the `raise` parameter is set to `false` (the default), the function will
 * catch the error and return `undefined`, allowing the calling code to handle
 * the absence of the file content gracefully. If `raise` is set to `true`, the
 * function will rethrow the caught error, making the calling code responsible
 * for handling the exception.
 *
 * @param {string} filePath - The path to the file to be read.
 * @param {boolean} [raise=false] - A flag indicating whether to rethrow an
 * error if the file read operation fails.
 * @returns {Promise<string | undefined>} - A promise that resolves to the file
 * content as a string, or `undefined` if the file read operation fails and
 * `raise` is `false`.
 * @throws Will throw an error if the file read operation fails and `raise` is
 * `true`.
 */
async function read(filePath: string, raise: boolean = false): Promise<string | undefined> {
    try {
        return (await vscode.workspace.fs.readFile(vscode.Uri.file(filePath))).toString()
    } catch (err) {
        if (raise === false) {
            return undefined
        }
        throw err
    }
}

/**
 * Checks if a file or directory exists at the given URI or path.
 *
 * This function accepts a URI object or a string representing a file path. If
 * the input is a string, it is converted to a file URI using
 * `vscode.Uri.file()`. The function then attempts to retrieve the status of the
 * file or directory at the given URI using `stat()` of VS Code workspace file
 * system API. If the status retrieval is successful, the function returns
 * `true`, indicating that the file or directory exists. If an error occurs
 * (e.g., the file or directory does not exist), the function catches the error
 * and returns `false`.
 *
 * @param {vscode.Uri | string} uri - The URI or file path to check for
 * existence.
 * @returns {Promise<boolean>} - A promise that resolves to `true` if the file
 * or directory exists, and `false` otherwise.
 */
async function exists(uri: vscode.Uri | string): Promise<boolean> {
    if (typeof(uri) === 'string') {
        uri = vscode.Uri.file(uri)
    }
    try {
        await lw.external.stat(uri)
        return true
    } catch {
        return false
    }
}
