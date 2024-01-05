import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import os from 'os'
import micromatch from 'micromatch'
import { performance } from 'perf_hooks'

import { lw } from '../lw'
import type { FileCache } from '../types'

import * as utils from '../utils/utils'
import { InputFileRegExp } from '../utils/inputfilepath'

const logger = lw.log('Cacher')

const caches: Map<string, FileCache> = new Map()
const promises: Map<string, Promise<void>> = new Map()

export const cache = {
    add,
    get,
    paths,
    promises,
    getIncludedTeX,
    getIncludedBib,
    getFlsChildren,
    wait,
    reset,
    refreshCache,
    refreshCacheAggressive,
    loadFlsFile
}

lw.watcher.src.onChange((filePath: string) => {
    if (canCache(filePath)) {
        void refreshCache(filePath)
    }
})
lw.watcher.src.onDelete((filePath: string) => {
    if (get(filePath) === undefined) {
        caches.delete(filePath)
        logger.log(`Removed ${filePath} .`)
    }
})
lw.onDispose({ dispose: () => reset() })

/**
 * Checks if a file path can be cached based on its extension and exclusion
 * criteria.
 *
 * @param {string} filePath - The file path to be checked.
 * @returns {boolean} - True if the file can be cached, false otherwise.
 */
function canCache(filePath: string): boolean {
    return lw.file.hasTeXExt(path.extname(filePath)) && !filePath.includes('expl3-code.tex')
}

/**
 * Checks if a file path is excluded based on user-defined globs in
 * 'latex.watch.files.ignore'.
 *
 * @param {string} filePath - The file path to be checked.
 * @returns {boolean} - True if the file is excluded, false otherwise.
 */
function isExcluded(filePath: string): boolean {
    const globsToIgnore = vscode.workspace.getConfiguration('latex-workshop').get('latex.watch.files.ignore') as string[]
    const format = (str: string): string => (os.platform() === 'win32' ? str.replace(/\\/g, '/') : str)
    return micromatch.some(filePath, globsToIgnore, { format })
}

/**
 * Adds a file path to the watcher if it is not excluded.
 *
 * @param {string} filePath - The file path to be added.
 */
function add(filePath: string) {
    if (isExcluded(filePath)) {
        logger.log(`Ignored ${filePath} .`)
        return
    }
    if (!lw.watcher.src.has(filePath)) {
        logger.log(`Adding ${filePath} .`)
        lw.watcher.src.add(filePath)
    }
}

/**
 * Retrieves the cache for a specific file path.
 *
 * @param {string} filePath - The file path to retrieve the cache for.
 * @returns {FileCache | undefined} - The cache for the specified file path, or
 * undefined if not found.
 */
function get(filePath: string): FileCache | undefined {
    return caches.get(filePath)
}

/**
 * Retrieves an array of all cached file paths.
 *
 * @returns {string[]} - An array of cached file paths.
 */
function paths(): string[] {
    return Array.from(caches.keys())
}

/**
 * Waits for a file to be cached, refreshing if necessary.
 *
 * The function waits for the specified file to be either cached or a promise to
 * be created, with a maximum wait time determined by the 'seconds' parameter.
 * If the file is not cached or no promise is created within the specified time,
 * it forcefully refreshes the cache for the file and returns the corresponding
 * promise.
 *
 * @param {string} filePath - The file path to wait for.
 * @param {number} seconds - The maximum wait time in seconds.
 * @returns {Promise<Promise<void> | undefined>} - A promise resolving when the file is
 * cached, or undefined if an error occurs.
 */
async function wait(filePath: string, seconds: number = 2): Promise<Promise<void> | undefined> {
    let waited = 0
    while (promises.get(filePath) === undefined && get(filePath) === undefined) {
        // Just open vscode, has not cached, wait for a bit?
        await new Promise(resolve => setTimeout(resolve, 100))
        waited++
        if (waited >= seconds * 10) {
            // Waited for two seconds before starting cache. Really?
            logger.log(`Error loading cache: ${filePath} . Forcing.`)
            await refreshCache(filePath)
            break
        }
    }
    return promises.get(filePath)
}

/**
 * Resets the watchers and clears all caches.
 */
function reset() {
    lw.watcher.src.reset()
    lw.watcher.bib.reset()
    lw.watcher.pdf.reset()
    Object.keys(caches).forEach(filePath => caches.delete(filePath))
}

let cachingFilesCount = 0
/**
 * Refreshes the cache for a specific file path.
 *
 * The function refreshes the cache for the specified file path. If the file is
 * excluded or cannot be cached, it skips the refresh. After the cache is
 * refreshed, it updates the Abstract Syntax Tree (AST) and various elements in
 * the file cache.
 *
 * The function also utilizes the 'cachingFilesCount' variable, which is a count
 * of the number of files currently being cached. This count is used to
 * determine when all files have been successfully cached. Once the caching
 * process for a file is completed, it decrements the count and checks if it was
 * the last file being cached. If so, it triggers a reconstruction of the
 * structure viewer. This ensures that the structure viewer is updated only
 * after all file caches have been refreshed.
 *
 * @param {string} filePath - The file path to refresh the cache for.
 * @param {string} rootPath - The root path for resolving relative paths.
 * @returns {Promise<Promise<void> | undefined>} - A promise resolving when the cache is
 * refreshed, or undefined if the file is excluded or cannot be cached.
 */
async function refreshCache(filePath: string, rootPath?: string): Promise<Promise<void> | undefined> {
    if (isExcluded(filePath)) {
        logger.log(`Ignored ${filePath} .`)
        return
    }
    if (!canCache(filePath)) {
        return
    }
    logger.log(`Caching ${filePath} .`)
    cachingFilesCount++
    const openEditor: vscode.TextDocument | undefined = vscode.workspace.textDocuments.find(
        document => document.fileName === path.normalize(filePath))
    const content = openEditor?.isDirty ? openEditor.getText() : (lw.file.read(filePath) ?? '')
    const fileCache: FileCache = {
        filePath,
        content,
        contentTrimmed: utils.stripCommentsAndVerbatim(content),
        elements: {},
        children: [],
        bibfiles: new Set(),
        external: {}}
    caches.set(filePath, fileCache)
    rootPath = rootPath || lw.root.file.path
    updateChildren(fileCache, rootPath)

    promises.set(
        filePath,
        updateAST(fileCache).then(() => {
            updateElements(fileCache)
        }).finally(() => {
            lw.lint.label.check()
            cachingFilesCount--
            promises.delete(filePath)
            lw.event.fire(lw.event.FileParsed, filePath)

            if (cachingFilesCount === 0) {
                void lw.outline.reconstruct()
            }
        })
    )

    return promises.get(filePath)
}

let updateCompleter: NodeJS.Timeout
/**
 * Refreshes the cache aggressively based on user-defined settings.
 *
 * The function checks if aggressive cache updating is enabled in the user's
 * configuration. If enabled, it schedules a delayed refresh of the cache for
 * the specified file path. If the refresh is already scheduled, it cancels the
 * existing timeout and schedules a new one. This helps prevent excessive cache
 * refreshing during rapid file changes.
 *
 * @param {string} filePath - The file path to refresh the cache for.
 */
function refreshCacheAggressive(filePath: string) {
    if (get(filePath) === undefined) {
        return
    }
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    if (configuration.get('intellisense.update.aggressive.enabled')) {
        if (updateCompleter) {
            clearTimeout(updateCompleter)
        }
        updateCompleter = setTimeout(async () => {
            await refreshCache(filePath, lw.root.file.path)
            await loadFlsFile(lw.root.file.path || filePath)
        }, configuration.get('intellisense.update.delay', 1000))
    }
}

/**
 * Updates the Abstract Syntax Tree (AST) for a given file cache using parser.
 *
 * @param {FileCache} fileCache - The file cache to update the AST for.
 */
async function updateAST(fileCache: FileCache) {
    logger.log(`Parse LaTeX AST: ${fileCache.filePath} .`)
    fileCache.ast = await lw.parse.tex(fileCache.content)
    logger.log(`Parsed LaTeX AST: ${fileCache.filePath} .`)
}

/**
 * Updates the children of a file cache based on input files and external
 * documents.
 *
 * @param {FileCache} fileCache - The file cache to update the children for.
 * @param {string} rootPath - The root path for resolving relative paths.
 */
function updateChildren(fileCache: FileCache, rootPath: string | undefined) {
    rootPath = rootPath || fileCache.filePath
    updateChildrenInput(fileCache, rootPath)
    updateChildrenXr(fileCache, rootPath)
    logger.log(`Updated inputs of ${fileCache.filePath} .`)
}

/**
 * Parses input files from the content of a file cache and updates the children
 * array.
 *
 * The function uses a regular expression to find input files in the trimmed
 * content of the specified file cache. It adds each identified input file to
 * the children array, and if the file is not already being watched, it adds it
 * to the watcher and triggers a refresh of its cache.
 *
 * @param {FileCache} fileCache - The file cache to update the input children for.
 * @param {string} rootPath - The root path for resolving relative paths.
 */
function updateChildrenInput(fileCache: FileCache, rootPath: string) {
    const inputFileRegExp = new InputFileRegExp()
    while (true) {
        const result = inputFileRegExp.exec(fileCache.contentTrimmed, fileCache.filePath, rootPath)
        if (!result) {
            break
        }

        if (!fs.existsSync(result.path) || path.relative(result.path, rootPath) === '') {
            continue
        }

        fileCache.children.push({
            index: result.match.index,
            filePath: result.path
        })
        logger.log(`Input ${result.path} from ${fileCache.filePath} .`)

        if (lw.watcher.src.has(result.path)) {
            continue
        }
        add(result.path)
        void refreshCache(result.path, rootPath)
    }
}

/**
 * Parses external document references from the content of a file cache and
 * updates the children array.
 *
 * The function uses a regular expression to find external document references
 * in the trimmed content of the specified file cache. It resolves the paths of
 * external documents and adds them to the children array. If an external
 * document is not already being watched, it adds it to the watcher and triggers
 * a refresh of its cache.
 *
 * @param {FileCache} fileCache - The file cache to update the external document
 * children for.
 * @param {string} rootPath - The root path for resolving relative paths.
 */
function updateChildrenXr(fileCache: FileCache, rootPath: string) {
    const externalDocRegExp = /\\externaldocument(?:\[(.*?)\])?\{(.*?)\}/g
    while (true) {
        const result = externalDocRegExp.exec(fileCache.contentTrimmed)
        if (!result) {
            break
        }

        const texDirs = vscode.workspace.getConfiguration('latex-workshop').get('latex.texDirs') as string[]
        const externalPath = utils.resolveFile([path.dirname(fileCache.filePath), path.dirname(rootPath), ...texDirs], result[2])
        if (!externalPath || !fs.existsSync(externalPath) || path.relative(externalPath, rootPath) === '') {
            logger.log(`Failed resolving external ${result[2]} . Tried ${externalPath} ` +
                (externalPath && path.relative(externalPath, rootPath) === '' ? ', which is root.' : '.'))
            continue
        }

        const rootCache = get(rootPath)
        if (rootCache !== undefined) {
            rootCache.external[externalPath] = result[1] || ''
            logger.log(`External document ${externalPath} from ${fileCache.filePath} .` + (result[1] ? ` Prefix is ${result[1]}`: ''))
        }

        if (lw.watcher.src.has(externalPath)) {
            continue
        }
        add(externalPath)
        void refreshCache(externalPath, externalPath)
    }
}

/**
 * Updates various elements in the file cache after parsing the LaTeX Abstract
 * Syntax Tree (AST).
 *
 * The function updates elements in the specified file cache based on the parsed
 * LaTeX AST. It includes updating citations, packages, references, glossaries,
 * environments, commands, and input graphics paths. Additionally, it updates
 * the bibliography files referenced in the file content and logs the time taken
 * to complete the update.
 *
 * @param {FileCache} fileCache - The file cache to update the elements for.
 */
function updateElements(fileCache: FileCache) {
    const start = performance.now()
    lw.completion.citation.parse(fileCache)
    // Package parsing must be before command and environment.
    lw.completion.usepackage.parse(fileCache)
    lw.completion.reference.parse(fileCache)
    lw.completion.glossary.parse(fileCache)
    lw.completion.environment.parse(fileCache)
    lw.completion.macro.parse(fileCache)
    lw.completion.subsuperscript.parse(fileCache)
    lw.completion.input.parseGraphicsPath(fileCache)
    updateBibfiles(fileCache)
    const elapsed = performance.now() - start
    logger.log(`Updated elements in ${elapsed.toFixed(2)} ms: ${fileCache.filePath} .`)
}

/**
 * Updates bibliography files in the file cache based on the content of the
 * LaTeX file.
 *
 * The function uses regular expressions to find bibliography file references in
 * the content of the specified file cache. It extracts the paths of the
 * bibliography files and adds them to the bibliography files set in the cache.
 * If a bibliography file is not already being watched, it adds it to the
 * bibliography watcher.
 *
 * @param {FileCache} fileCache - The file cache to update the bibliography files
 * for.
 */
function updateBibfiles(fileCache: FileCache) {
    const bibReg = /(?:\\(?:bibliography|addbibresource)(?:\[[^[\]{}]*\])?){([\s\S]+?)}|(?:\\putbib)\[(.+?)\]/gm
    while (true) {
        const result = bibReg.exec(fileCache.contentTrimmed)
        if (!result) {
            break
        }

        const bibs = (result[1] ? result[1] : result[2]).split(',').map(bib => bib.trim())

        for (const bib of bibs) {
            const bibPaths = lw.file.getBibPath(bib, path.dirname(fileCache.filePath))
            for (const bibPath of bibPaths) {
                fileCache.bibfiles.add(bibPath)
                logger.log(`Bib ${bibPath} from ${fileCache.filePath} .`)
                if (!lw.watcher.bib.has(bibPath)) {
                    lw.watcher.bib.add(bibPath)
                }
            }
        }
    }
}

/**
 * Parses the content of a `.fls` file attached to the given `filePath` and
 * updates caches accordingly.
 *
 * The function parses the content of a `.fls` file associated with the
 * specified `filePath`. It identifies input files and output files, updates the
 * cache's children, and checks for `.aux` files to parse for possible `.bib`
 * files. This function is typically called after a successful build to look for
 * the root file and compute the cachedContent tree.
 *
 * @param {string} filePath - The path of a LaTeX file.
 */
async function loadFlsFile(filePath: string) {
    const flsPath = lw.file.getFlsPath(filePath)
    if (flsPath === undefined) {
        return
    }
    logger.log(`Parsing .fls ${flsPath} .`)
    const rootDir = path.dirname(filePath)
    const outDir = lw.file.getOutDir(filePath)
    const ioFiles = parseFlsContent(fs.readFileSync(flsPath).toString(), rootDir)

    for (const inputFile of ioFiles.input) {
        // Drop files that are also listed as OUTPUT or should be ignored
        if (ioFiles.output.includes(inputFile) ||
            isExcluded(inputFile) ||
            !fs.existsSync(inputFile)) {
            continue
        }
        if (inputFile === filePath || lw.watcher.src.has(inputFile)) {
            // Drop the current rootFile often listed as INPUT
            // Drop any file that is already watched as it is handled by
            // onWatchedFileChange.
            continue
        }
        if (path.extname(inputFile) === '.tex') {
            if (get(filePath) === undefined) {
                logger.log(`Cache not finished on ${filePath} when parsing fls, try re-cache.`)
                await refreshCache(filePath)
            }
            // It might be possible that `filePath` is excluded from caching.
            const fileCache = get(filePath)
            if (fileCache !== undefined) {
                // Parse tex files as imported subfiles.
                fileCache.children.push({
                    index: Number.MAX_VALUE,
                    filePath: inputFile
                })
                add(inputFile)
                logger.log(`Found ${inputFile} from .fls ${flsPath} , caching.`)
                void refreshCache(inputFile, filePath)
            } else {
                logger.log(`Cache not finished on ${filePath} when parsing fls.`)
            }
        } else if (!lw.watcher.src.has(inputFile)) {
            // Watch non-tex files.
            add(inputFile)
        }
    }

    for (const outputFile of ioFiles.output) {
        if (path.extname(outputFile) === '.aux' && fs.existsSync(outputFile)) {
            logger.log(`Found .aux ${filePath} from .fls ${flsPath} , parsing.`)
            parseAuxFile(outputFile, path.dirname(outputFile).replace(outDir, rootDir))
            logger.log(`Parsed .aux ${filePath} .`)
        }
    }
    logger.log(`Parsed .fls ${flsPath} .`)
}

/**
 * Parses the content of a `.fls` file and extracts input and output files.
 *
 * The function uses a regular expression to match lines in the `.fls` file
 * indicating input and output files. It then resolves the paths of these files
 * relative to the root directory and returns an object with arrays of input and
 * output files.
 *
 * @param {string} content - The content of the `.fls` file.
 * @param {string} rootDir - The root directory for resolving relative paths.
 * @returns {{input: string[], output: string[]}} - An object containing arrays
 * of input and output files.
 */
function parseFlsContent(content: string, rootDir: string): {input: string[], output: string[]} {
    const inputFiles: Set<string> = new Set()
    const outputFiles: Set<string> = new Set()
    const regex = /^(?:(INPUT)\s*(.*))|(?:(OUTPUT)\s*(.*))$/gm
    // regex groups
    // #1: an INPUT entry --> #2 input file path
    // #3: an OUTPUT entry --> #4: output file path
    while (true) {
        const result = regex.exec(content)
        if (!result) {
            break
        }
        if (result[1]) {
            const inputFilePath = path.resolve(rootDir, result[2])
            if (inputFilePath) {
                inputFiles.add(inputFilePath)
            }
        } else if (result[3]) {
            const outputFilePath = path.resolve(rootDir, result[4])
            if (outputFilePath) {
                outputFiles.add(outputFilePath)
            }
        }
    }

    return {input: Array.from(inputFiles), output: Array.from(outputFiles)}
}

/**
 * Parses a `.aux` file to extract bibliography file references and updates the
 * caches.
 *
 * The function reads the content of the specified `.aux` file and uses a
 * regular expression to find bibliography file references. It then updates the
 * cache with the discovered bibliography files.
 *
 * @param {string} filePath - The path of the `.aux` file.
 * @param {string} srcDir - The source directory for resolving relative paths.
 */
function parseAuxFile(filePath: string, srcDir: string) {
    const content = fs.readFileSync(filePath).toString()
    const regex = /^\\bibdata{(.*)}$/gm
    while (true) {
        const result = regex.exec(content)
        if (!result) {
            return
        }
        const bibs = (result[1] ? result[1] : result[2]).split(',').map((bib) => { return bib.trim() })
        for (const bib of bibs) {
            const bibPaths = lw.file.getBibPath(bib, srcDir)
            for (const bibPath of bibPaths) {
                if (lw.root.file.path && !get(lw.root.file.path)?.bibfiles.has(bibPath)) {
                    get(lw.root.file.path)?.bibfiles.add(bibPath)
                    logger.log(`Found .bib ${bibPath} from .aux ${filePath} .`)
                }
                if (!lw.watcher.bib.has(bibPath)) {
                    lw.watcher.bib.add(bibPath)
                }
            }
        }
    }
}


/**
 * Returns an array of included bibliography files in the specified LaTeX file.
 *
 * The function recursively traverses the included LaTeX files starting from the
 * specified file path (or the root file if undefined) and collects the
 * bibliography files. It avoids duplicates and returns an array of unique
 * included bibliography files.
 *
 * @param {string | undefined} filePath - The path of the LaTeX file. If
 * undefined, traces from the root file.
 * @param {string[]} includedBib - An array to store the included bibliography
 * files (default: []).
 * @returns {string[]} - An array of included bibliography files.
 */
function getIncludedBib(filePath?: string, includedBib: string[] = []): string[] {
    filePath = filePath ?? lw.root.file.path
    if (filePath === undefined) {
        return []
    }
    const fileCache = get(filePath)
    if (fileCache === undefined) {
        return []
    }
    const checkedTeX = [ filePath ]
    includedBib.push(...fileCache.bibfiles)
    for (const child of fileCache.children) {
        if (checkedTeX.includes(child.filePath)) {
            // Already parsed
            continue
        }
        getIncludedBib(child.filePath, includedBib)
    }
    // Make sure to return an array with unique entries
    return Array.from(new Set(includedBib))
}

/**
 * Returns an array of included LaTeX files in the specified LaTeX file.
 *
 * The function recursively traverses the included LaTeX files starting from the
 * specified file path (or the root file if undefined) and collects the LaTeX
 * files. It avoids duplicates and returns an array of unique included LaTeX
 * files. The 'cachedOnly' parameter controls whether to include only cached
 * files or all included files.
 *
 * @param {string | undefined} filePath - The path of the LaTeX file. If
 * undefined, traces from the root file.
 * @param {string[]} includedTeX - An array to store the included LaTeX files
 * (default: []).
 * @param {boolean} cachedOnly - Indicates whether to include only cached files
 * (default: true).
 * @returns {string[]} - An array of included LaTeX files.
 */
function getIncludedTeX(filePath?: string, includedTeX: string[] = [], cachedOnly: boolean = true): string[] {
    filePath = filePath ?? lw.root.file.path
    if (filePath === undefined) {
        return []
    }
    const fileCache = get(filePath)
    if (cachedOnly && fileCache === undefined) {
        return []
    }
    includedTeX.push(filePath)
    if (fileCache === undefined) {
        return []
    }
    for (const child of fileCache.children) {
        if (includedTeX.includes(child.filePath)) {
            // Already included
            continue
        }
        getIncludedTeX(child.filePath, includedTeX, cachedOnly)
    }
    return includedTeX
}

/**
 * Returns an array of input files from the `.fls` file associated with the
 * specified LaTeX file.
 *
 * @param {string} texFile - The path of the LaTeX file.
 * @returns {string[]} - An array of input files from the `.fls` file.
 *
 * The function reads the content of the `.fls` file associated with the
 * specified LaTeX file, parses the input files, and returns an array of
 * included input files. It is used to identify the dependencies of a LaTeX file
 * after a successful build.
 */
function getFlsChildren(texFile: string): string[] {
    const flsPath = lw.file.getFlsPath(texFile)
    if (flsPath === undefined) {
        return []
    }
    const rootDir = path.dirname(texFile)
    const ioFiles = parseFlsContent(fs.readFileSync(flsPath).toString(), rootDir)
    return ioFiles.input
}
