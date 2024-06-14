import * as vscode from 'vscode'
import os from 'os'
import * as path from 'path'
import micromatch from 'micromatch'
import { performance } from 'perf_hooks'

import { lw } from '../lw'
import type { FileCache } from '../types'

import * as utils from '../utils/utils'
import { InputFileRegExp } from '../utils/inputfilepath'

const logger = lw.log('Cacher')

/**
 * A map to store cached file data.
 *
 * This map holds `FileCache` objects indexed by their file paths. It is used to
 * quickly retrieve cached data for files during various operations.
 */
const caches: Map<string, FileCache> = new Map()

/**
 * A map to store promises related to file caching operations.
 *
 * This map holds promises that resolve when file caching operations are
 * complete, indexed by their file paths. It is used to keep track of ongoing
 * caching processes.
 */
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
    loadFlsFile,
    _test: {
        caches,
        canCache,
        isExcluded,
        updateAST
    }
}

// Listener for file changes: refreshes the cache if the file can be cached.
lw.watcher.src.onChange((filePath: string) => {
    if (canCache(filePath)) {
        void refreshCache(filePath)
    }
})

// Listener for file deletions: removes the file from the cache if it exists.
lw.watcher.src.onDelete((filePath: string) => {
    if (get(filePath) === undefined) {
        caches.delete(filePath)
        logger.log(`Removed ${filePath} .`)
    }
})

// Dispose handler: resets the state when the application is disposed of.
lw.onDispose({ dispose: () => reset() })

/**
 * Determines if a file can be cached based on its extension and specific
 * exclusions.
 *
 * This function checks if a given file path has a TeX file extension with
 * lw.file.hasTeXExt and does not include the string 'expl3-code.tex'.
 *
 * @param {string} filePath - The path to the file to be checked for cache
 * eligibility.
 * @returns {boolean} - Returns `true` if the file can be cached, otherwise
 * `false`.
 */
function canCache(filePath: string): boolean {
    return lw.file.hasTeXExt(path.extname(filePath)) && !filePath.includes('expl3-code.tex')
}

/**
 * Determines if a file path should be excluded based on ignore patterns.
 *
 * This function checks if a given file path matches any of the ignore patterns
 * specified in the workspace configuration. It retrieves the list of patterns
 * to ignore from the 'latex.watch.files.ignore' configuration and uses the
 * `micromatch` library to check if the file path matches any of these patterns.
 * The file path format is adjusted based on the operating system to ensure
 * compatibility.
 *
 * @param {string} filePath - The path to the file to be checked for exclusion.
 * @returns {boolean} - Returns `true` if the file path matches any ignore
 * patterns, otherwise `false`.
 */
function isExcluded(filePath: string): boolean {
    const globsToIgnore = vscode.workspace.getConfiguration('latex-workshop').get('latex.watch.files.ignore') as string[]
    const format = (str: string): string => (os.platform() === 'win32' ? str.replace(/\\/g, '/') : str)
    return micromatch.some(filePath, globsToIgnore, { format })
}

/**
 * Adds a file to the watcher if it is not excluded and not already being
 * watched.
 *
 * This function checks if a given file path should be excluded from the
 * watcher. If the file is not excluded and is not already in the watcher, it
 * logs the addition and adds the file path to the source watcher. This function
 * will not automatically invoke `refreshCache` in the chain.
 *
 * @param {string} filePath - The path to the file to be added to the watcher.
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
 * Retrieves the cache data for a specified file path.
 *
 * This function looks up the cache for a given file path and returns the
 * corresponding `FileCache` object if it exists. If the file path is not found
 * in the cache, it returns `undefined`.
 *
 * @param {string} filePath - The path to the file whose cache data is to be
 * retrieved.
 * @returns {FileCache | undefined} - The `FileCache` object associated with the
 * file path, or `undefined` if not found.
 */
function get(filePath: string): FileCache | undefined {
    return caches.get(filePath)
}

/**
 * Retrieves a list of all cached file paths.
 *
 * This function returns an array containing all the file paths currently stored
 * in the cache. It does this by converting the keys of the `caches` map, which
 * holds the cached file data, into an array.
 *
 * @returns {string[]} - An array of strings representing the file paths of all
 * cached files.
 */
function paths(): string[] {
    return Array.from(caches.keys())
}

/**
 * Waits for a file to be cached, with a specified timeout.
 *
 * This function monitors the caching status of a specified file path. It
 * continuously checks if the file has been cached by looking up its promise and
 * cache entries. If the file is not found in the cache within the default or
 * provided timeout duration, it forces the cache to refresh for the file. The
 * function waits in increments of 100 milliseconds, and if the total wait time
 * exceeds the specified timeout (default is 2 seconds), it logs an error
 * message and invokes the `refreshCache` function to cache the file forcibly.
 *
 * @param {string} filePath - The path to the file to wait for caching.
 * @param {number} [seconds=2] - The number of seconds to wait before forcing
 * the cache refresh.
 * @returns {Promise<void> | undefined} - A promise that resolves when the file
 * is cached, or undefined if the cache is not refreshed.
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
 * Resets the state of various watchers and clears the file cache.
 *
 * This function resets the source and bibliography watchers to their initial
 * states, ensuring that any ongoing file watching activities are terminated and
 * prepared for a fresh start. It iterates through all cached files and removes
 * them from the cache, effectively clearing all stored file data.
 */
function reset() {
    lw.watcher.src.reset()
    lw.watcher.bib.reset()
    // lw.watcher.pdf.reset()
    paths().forEach(filePath => caches.delete(filePath))
}

/**
 * A counter to keep track of the number of files currently being cached.
 *
 * This variable is incremented each time a file starts the caching process and
 * decremented upon completion. It helps manage the state of caching and ensures
 * that the system knows when all files have been cached.
 */
let cachingFilesCount: number = 0
/**
 * Refreshes the cache for a given file, optionally considering a root path.
 *
 * This function is responsible for updating the cache of a file specified by
 * its path. It first checks if the file should be excluded or can be cached
 * based on predefined conditions. If the file is valid for caching, it logs the
 * caching action, increases the count of files being cached, and reads the
 * content of the file. The content is then processed to remove comments and
 * verbatim sections, and a `FileCache` object is created to store this
 * processed content along with other metadata. The function then updates the
 * children elements of the file cache and initiates the AST update. Once the
 * AST is updated, the elements of the file cache are also updated. Finally, it
 * performs lint checks, decreases the caching file count, removes the promise
 * from the active promises, fires a file parsed event, and reconstructs the
 * outline if no other files are being cached.
 *
 * @param {string} filePath - The path to the file to be cached.
 * @param {string} [rootPath] - The optional root path to be considered for
 * updating children elements.
 * @returns {Promise<void> | undefined} - A promise that resolves when the cache
 * is refreshed, or undefined if the file is excluded or cannot be cached.
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
    const content = openEditor?.isDirty ? openEditor.getText() : (await lw.file.read(filePath) ?? '')
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
    await updateChildren(fileCache, rootPath)

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

/**
 * A timeout identifier used for scheduling the aggressive cache refresh
 * operation.
 */
let updateCompleter: NodeJS.Timeout
/**
 * Refreshes the cache for a file aggressively based on the user's configuration
 * settings.
 *
 * This function checks if the specified file path has an existing cache entry.
 * If it does, and if the aggressive update setting
 * 'intellisense.update.aggressive.enabled' is enabled in the workspace
 * configuration, it schedules a cache refresh operation. If there is an
 * existing scheduled operation, it is cleared to prevent multiple refreshes
 * from overlapping. The refresh operation is then scheduled to run after a
 * delay specified in the configuration 'intellisense.update.delay'. During the
 * refresh, it also attempts to load the FLS file associated with the root path
 * or the file path.
 *
 * @param {string} filePath - The path to the file for which to refresh the
 * cache aggressively.
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
            // After refreshing the cache, children from .fls file only is
            // discarded. We need to re-parse the .fls file to build the
            // complete children dependency.
            await loadFlsFile(lw.root.file.path || filePath)
        }, configuration.get('intellisense.update.delay', 1000))
    }
}

/**
 * Updates the Abstract Syntax Tree (AST) for a given file cache.
 *
 * This function is responsible for parsing the content of a file stored in the
 * file cache and updating its AST. It logs the start of the parsing process,
 * measures the time taken to parse the content, and logs the elapsed time once
 * the parsing is complete. The parsed AST is then stored in the `ast` property
 * of the `fileCache` object.
 *
 * @param {FileCache} fileCache - The file cache object containing the content
 * to be parsed.
 * @returns {Promise<void>} - A promise that resolves when the AST is updated.
 */
async function updateAST(fileCache: FileCache): Promise<void> {
    logger.log(`Parse LaTeX AST: ${fileCache.filePath} .`)
    const start = performance.now()
    fileCache.ast = await lw.parser.parse.tex(fileCache.content)
    const elapsed = performance.now() - start
    logger.log(`Parsed LaTeX AST in ${elapsed.toFixed(2)} ms: ${fileCache.filePath} .`)
}

/**
 * Updates the children elements of a file cache, considering a root path.
 *
 * This function updates the children of a given file cache by processing input
 * and cross-references. It first sets the root path to either the provided root
 * path or the file path from the file cache. It then calls
 * `updateChildrenInput` to handle the input elements and `updateChildrenXr` to
 * manage cross-references within the file cache.
 *
 * @param {FileCache} fileCache - The file cache object to be updated.
 * @param {string | undefined} rootPath - The root path to be used for updating
 * children elements.
 */
async function updateChildren(fileCache: FileCache, rootPath: string | undefined): Promise<void> {
    rootPath = rootPath || fileCache.filePath
    await updateChildrenInput(fileCache, rootPath)
    await updateChildrenXr(fileCache, rootPath)
    logger.log(`Updated inputs of ${fileCache.filePath} .`)
}

/**
 * Updates the children of a file cache by parsing input file references.
 *
 * This function iterates over the trimmed content of a given file cache to
 * identify and process input file references. It uses a regular expression to
 * find these references and checks if the referenced files exist and are not
 * the same as the root path. Valid input files are added to the children array
 * of the file cache, and a log message is generated for each identified input
 * file. If the input file is not already being watched, it is added to the
 * watcher and its cache is refreshed.
 *
 * @param {FileCache} fileCache - The file cache object containing the content
 * and metadata of the file being processed.
 * @param {string} rootPath - The root path used for resolving relative input
 * file paths.
 */
async function updateChildrenInput(fileCache: FileCache, rootPath: string) {
    const inputFileRegExp = new InputFileRegExp()
    while (true) {
        const result = inputFileRegExp.exec(fileCache.contentTrimmed, fileCache.filePath, rootPath)
        if (!result) {
            break
        }

        if (!await lw.file.exists(result.path) || path.relative(result.path, rootPath) === '') {
            continue
        }

        if (fileCache.children.some(child => child.filePath === result.path)) {
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
 * Updates the children references in the file cache based on \externaldocument
 * macros.
 *
 * This function parses the trimmed content of a file to find any
 * `\externaldocument` macros, which reference external documents. It then
 * resolves the paths of these external documents relative to the current file
 * path, root path, and additional LaTeX directories configured in the
 * workspace. If an external document path is resolved and exists, it updates
 * the root cache with the external document reference and logs the action. If
 * the external document is already being watched, it continues; otherwise, it
 * adds the document to the watcher and refreshes its cache.
 *
 * @param {FileCache} fileCache - The cache object of the file being processed.
 * @param {string} rootPath - The root path to be used for resolving external
 * document paths.
 */
async function updateChildrenXr(fileCache: FileCache, rootPath: string) {
    const externalDocRegExp = /\\externaldocument(?:\[(.*?)\])?\{(.*?)\}/g
    while (true) {
        const result = externalDocRegExp.exec(fileCache.contentTrimmed)
        if (!result) {
            break
        }

        const texDirs = vscode.workspace.getConfiguration('latex-workshop').get('latex.texDirs') as string[]
        const externalPath = utils.resolveFile([path.dirname(fileCache.filePath), path.dirname(rootPath), ...texDirs], result[2])
        if (!externalPath || !await lw.file.exists(externalPath) || path.relative(externalPath, rootPath) === '') {
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
 * Updates various elements in the file cache, parsing different components.
 *
 * This function updates the elements of a file cache by parsing various
 * components, namely, citations, packages, references, glossaries,
 * environments, macros, subscripts, superscripts, and graphics paths. It
 * records the time taken to perform these updates and logs the elapsed time
 * along with the file path. Each parsing step is performed in a specific order
 * to ensure dependencies are resolved correctly.
 *
 * @param {FileCache} fileCache - The cache object containing the file data and
 * metadata to be updated.
 */
function updateElements(fileCache: FileCache): void {
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
 * Updates the bibliography files associated with a given file cache.
 *
 * This function parses the content of a file cache to find bibliography macros
 * (such as `\bibliography`, `\addbibresource`, and `\putbib`) using a regular
 * expression. It extracts the bibliography file paths specified in these
 * macros, resolves their full paths, and adds them to the set of bibliography
 * files in the file cache. If a bibliography file is not excluded, it logs the
 * action, adds the file to the cache, and ensures that it is being watched for
 * changes.
 *
 * @param {FileCache} fileCache - The file cache object to update with
 * bibliography files.
 */
function updateBibfiles(fileCache: FileCache) {
    const bibReg = /(?:\\(?:bibliography|addbibresource)(?:\[[^[\]{}]*\])?){(?:\\subfix{)?([\s\S]+?)(?:\})?}|(?:\\putbib)\[(?:\\subfix{)?([\s\S]+?)(?:\})?\]/gm

    let result: RegExpExecArray | null
    while ((result = bibReg.exec(fileCache.contentTrimmed)) !== null) {
        const bibs = (result[1] ? result[1] : result[2]).split(',').map(bib => bib.trim())

        for (const bib of bibs) {
            const bibPaths = lw.file.getBibPath(bib, path.dirname(fileCache.filePath))
            for (const bibPath of bibPaths) {
                if (isExcluded(bibPath)) {
                    continue
                }
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
 * Loads and processes a .fls file related to a specified file path.
 *
 * This function handles the parsing and processing of a .fls file, which
 * contains information about input and output files involved in the compilation
 * of a LaTeX document. It retrieves the path to the .fls file associated with
 * the given file path, reads its content, and parses it to extract input and
 * output file paths. For each input file, it performs various checks to
 * determine whether the file should be cached, watched, or ignored. For .tex
 * files, it ensures they are added as children to the cache of the main file
 * and refreshes their cache. Non-.tex files are watched unless they are
 * auto-generated files like .aux or .out. Additionally, if any output files are
 * .aux files, they are parsed accordingly.
 *
 * @param {string} filePath - The path to the main file whose .fls file is to be
 * loaded and processed.
 * @returns {Promise<void>} - A promise that resolves when the .fls file is
 * processed.
 */
async function loadFlsFile(filePath: string): Promise<void> {
    const flsPath = await lw.file.getFlsPath(filePath)
    if (flsPath === undefined) {
        return
    }
    logger.log(`Parsing .fls ${flsPath} .`)
    const rootDir = path.dirname(filePath)
    const outDir = lw.file.getOutDir(filePath)
    const ioFiles = parseFlsContent(await lw.file.read(flsPath) ?? '', rootDir)

    for (const inputFile of ioFiles.input) {
        // Drop files that are also listed as OUTPUT or should be ignored
        if (ioFiles.output.includes(inputFile) ||
            isExcluded(inputFile) ||
            !await lw.file.exists(inputFile)) {
            continue
        }
        if (inputFile === filePath || lw.watcher.src.has(inputFile)) {
            // Drop the current rootFile often listed as INPUT
            // Drop any file that is already watched as it is handled by
            // onWatchedFileChange.
            continue
        }
        const inputExt = path.extname(inputFile)
        if (inputExt === '.tex') {
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
        } else if (!lw.watcher.src.has(inputFile) && !['.aux', '.out'].includes(inputExt)) {
            // Watch non-tex files. aux and out are excluded because they are auto-generated during the building process
            add(inputFile)
        }
    }

    for (const outputFile of ioFiles.output) {
        if (path.extname(outputFile) === '.aux' && await lw.file.exists(outputFile)) {
            logger.log(`Found .aux ${outputFile} from .fls ${flsPath} , parsing.`)
            await parseAuxFile(outputFile, path.dirname(outputFile).replace(outDir, rootDir))
            logger.log(`Parsed .aux ${outputFile} .`)
        }
    }
    logger.log(`Parsed .fls ${flsPath} .`)
}

/**
 * Parses the content of a .fls file to extract input and output file paths.
 *
 * This function processes the content of a .fls file, identifying and
 * extracting file paths associated with INPUT and OUTPUT entries. It utilizes a
 * regular expression to match lines indicating input and output files, then
 * resolves these paths relative to a given root directory. The function
 * collects unique input and output file paths using sets and returns them as
 * arrays.
 *
 * @param {string} content - The content of the .fls file to be parsed.
 * @param {string} rootDir - The root directory used to resolve relative file
 * paths.
 * @returns {{input: string[], output: string[]}} - An object containing arrays
 * of input and output file paths.
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
 * Parses an auxiliary (.aux) file to extract bibliography data and update the
 * cache.
 *
 * This function reads the content of a specified .aux file and uses a regular
 * expression to find `\bibdata` entries. It extracts the bibliography file
 * names, splits them into an array, and trims any whitespace. For each
 * bibliography file name, it determines the corresponding file paths and checks
 * if these paths are excluded from caching. If not excluded, it adds the
 * bibliography paths to the root file's bibliography set and logs the
 * discovery. It also ensures that the bibliography paths are being watched for
 * changes by adding them to the watcher.
 *
 * @param {string} filePath - The path to the .aux file to be parsed.
 * @param {string} srcDir - The source directory used to resolve bibliography
 * file paths.
 */
async function parseAuxFile(filePath: string, srcDir: string) {
    const content = await lw.file.read(filePath) ?? ''
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
                if (isExcluded(bibPath)) {
                    continue
                }
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
 * Retrieves a list of included bibliography files for a given file, ensuring
 * uniqueness.
 *
 * This function processes a specified file path to extract and return all
 * associated bibliography files. It starts with the provided file path (or the
 * root file path if not specified) and checks its cache entry. If the cache
 * entry exists, the function collects the bibliography files associated with
 * the file and its children. The function ensures that the same file is not
 * processed multiple times by keeping track of checked files. The result is an
 * array of unique bibliography file paths.
 *
 * @param {string} [filePath] - The path to the file to check for included
 * bibliography files. Defaults to the root file path if not provided.
 * @param {string[]} [includedBib=[]] - An array to accumulate the bibliography
 * files found.
 * @param {string[]} [checkedTeX=[]] - An array to store the paths of TeX files
 * already checked.
 * @returns {string[]} - An array of unique bibliography file paths included in
 * the specified file and its children.
 */
function getIncludedBib(filePath?: string, includedBib: string[] = [], checkedTeX: string[] = []): string[] {
    filePath = filePath ?? lw.root.file.path
    if (filePath === undefined) {
        return []
    }
    const fileCache = get(filePath)
    if (fileCache === undefined) {
        return []
    }
    checkedTeX.push(filePath)
    includedBib.push(...fileCache.bibfiles)
    for (const child of fileCache.children) {
        if (checkedTeX.includes(child.filePath)) {
            // Already parsed
            continue
        }
        getIncludedBib(child.filePath, includedBib, checkedTeX)
    }
    // Make sure to return an array with unique entries
    return Array.from(new Set(includedBib))
}

/**
 * Retrieves a list of included TeX files, starting from a given file path.
 *
 * This function recursively gathers all TeX files included in a specified file,
 * starting from the provided file path or the root file path if none is
 * specified. It uses a depth-first search approach to traverse the file
 * dependencies and caches the results to avoid redundant processing. If the
 * `cachedOnly` flag is set, it considers only cached files.
 *
 * @param {string} [filePath] - The path to the starting file. Defaults to the
 * root file path.
 * @param {boolean} [cachedOnly=true] - A flag indicating whether to consider
 * only cached files.
 * @param {string[]} [includedTeX=[]] - An array to store the paths of included
 * TeX files.
 * @returns {string[]} - An array of paths to included TeX files.
 */
function getIncludedTeX(filePath?: string, cachedOnly: boolean = true, includedTeX: string[] = []): string[] {
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
        getIncludedTeX(child.filePath, cachedOnly, includedTeX)
    }
    return Array.from(new Set(includedTeX))
}

/**
 * Retrieves the input file dependencies for a given TeX file from its FLS file.
 *
 * This function determines the path to the FLS file corresponding to a given
 * TeX file. If the FLS file path is found, it reads the content of the FLS file
 * and parses it to extract the list of input files. The function then returns
 * this list of input files, which represent the dependencies of the TeX file.
 *
 * @param {string} texFile - The path to the TeX file whose input file
 * dependencies are to be retrieved.
 * @returns {Promise<string[]>} - An array of strings representing the input
 * file dependencies of the TeX file.
 */
async function getFlsChildren(texFile: string): Promise<string[]> {
    const flsPath = await lw.file.getFlsPath(texFile)
    if (flsPath === undefined) {
        return []
    }
    const rootDir = path.dirname(texFile)
    const ioFiles = parseFlsContent(await lw.file.read(flsPath) ?? '', rootDir)
    return ioFiles.input
}
