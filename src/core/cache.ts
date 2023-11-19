import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import os from 'os'
import micromatch from 'micromatch'
import { performance } from 'perf_hooks'

import { extension } from '../extension'
import type { FileCache } from '../types'
import * as utils from '../utils/utils'
import * as eventbus from './event-bus'
import { InputFileRegExp } from '../utils/inputfilepath'
// TODO: there is a require('parser') import { parser } from '../parse/parser'

const logger = extension.log('Cacher')

const caches: {[filePath: string]: FileCache | undefined} = {}
const promises: {[filePath: string]: Promise<void> | undefined} = {}

export const cache = {
    add,
    get,
    paths,
    promises,
    getIncludedTeX,
    getIncludedBib,
    getTeXChildren,
    getFlsChildren,
    wait,
    reset,
    refreshCache,
    refreshCacheAggressive,
    loadFlsFile
}

extension.watcher.src.onChange((filePath: string) => {
    if (canCache(filePath)) {
        void refreshCache(filePath)
    }
})
extension.watcher.src.onDelete((filePath: string) => {
    if (filePath in caches) {
        delete caches[filePath]
        logger.log(`Removed ${filePath} .`)
    }
})

function canCache(filePath: string) {
    return extension.file.hasTeXExt(path.extname(filePath)) && !filePath.includes('expl3-code.tex')
}

function isExcluded(filePath: string): boolean {
    const globsToIgnore = vscode.workspace.getConfiguration('latex-workshop').get('latex.watch.files.ignore') as string[]
    const format = (str: string): string => {
        if (os.platform() === 'win32') {
            return str.replace(/\\/g, '/')
        }
        return str
    }
    return micromatch.some(filePath, globsToIgnore, { format })
}

function add(filePath: string) {
    if (isExcluded(filePath)) {
        logger.log(`Ignored ${filePath} .`)
        return
    }
    if (!extension.watcher.src.has(filePath)) {
        logger.log(`Adding ${filePath} .`)
        extension.watcher.src.add(filePath)
    }
}

function get(filePath: string) {
    return caches[filePath]
}

function paths() {
    return Object.keys(caches)
}

async function wait(filePath: string, seconds = 2) {
    let waited = 0
    while (promises[filePath] === undefined && caches[filePath] === undefined) {
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
    return promises[filePath]
}

function reset() {
    extension.watcher.src.reset()
    extension.watcher.bib.reset()
    extension.watcher.pdf.reset()
    Object.keys(caches).forEach(filePath => delete caches[filePath])
}

let cachingFilesCount = 0
async function refreshCache(filePath: string, rootPath?: string) {
    if (isExcluded(filePath)) {
        logger.log(`Ignored ${filePath} .`)
        return
    }
    if (!canCache(filePath)) {
        return
    }
    logger.log(`Caching ${filePath} .`)
    cachingFilesCount++
    const openEditor: vscode.TextDocument | undefined = vscode.workspace.textDocuments.filter(document => document.fileName === path.normalize(filePath))?.[0]
    const content = openEditor?.isDirty ? openEditor.getText() : (extension.file.read(filePath) ?? '')
    const cache: FileCache = {
        filePath,
        content,
        contentTrimmed: utils.stripCommentsAndVerbatim(content),
        elements: {},
        children: [],
        bibfiles: new Set(),
        external: {}}
    caches[filePath] = cache
    rootPath = rootPath || extension.root.file.path
    updateChildren(cache, rootPath)

    promises[filePath] = updateAST(cache).then(() => {
        updateElements(cache)
    }).finally(() => {
        require('../lw').dupLabelDetector.run()
        cachingFilesCount--
        delete promises[filePath]
        require('../lw').eventBus.fire(eventbus.FileParsed, filePath)

        if (cachingFilesCount === 0) {
            void require('../lw').structureViewer.reconstruct()
        }
    })

    return promises[filePath]
}

let updateCompleter: NodeJS.Timeout
function refreshCacheAggressive(filePath: string) {
    if (caches[filePath] === undefined) {
        return
    }
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    if (configuration.get('intellisense.update.aggressive.enabled')) {
        if (updateCompleter) {
            clearTimeout(updateCompleter)
        }
        updateCompleter = setTimeout(() => {
            void refreshCache(filePath, extension.root.file.path).then(async () => {
                await loadFlsFile(extension.root.file.path || filePath)
            })
        }, configuration.get('intellisense.update.delay', 1000))
    }
}

async function updateAST(cache: FileCache): Promise<void> {
    logger.log(`Parse LaTeX AST: ${cache.filePath} .`)
    cache.ast = await require('../parse/parser').parser.parseLaTeX(cache.content)
    logger.log(`Parsed LaTeX AST: ${cache.filePath} .`)
}

function updateChildren(cache: FileCache, rootPath: string | undefined) {
    rootPath = rootPath || cache.filePath
    updateChildrenInput(cache, rootPath)
    updateChildrenXr(cache, rootPath)
    logger.log(`Updated inputs of ${cache.filePath} .`)
}

function updateChildrenInput(cache: FileCache, rootPath: string) {
    const inputFileRegExp = new InputFileRegExp()
    while (true) {
        const result = inputFileRegExp.exec(cache.contentTrimmed, cache.filePath, rootPath)
        if (!result) {
            break
        }

        if (!fs.existsSync(result.path) || path.relative(result.path, rootPath) === '') {
            continue
        }

        cache.children.push({
            index: result.match.index,
            filePath: result.path
        })
        logger.log(`Input ${result.path} from ${cache.filePath} .`)

        if (extension.watcher.src.has(result.path)) {
            continue
        }
        add(result.path)
        void refreshCache(result.path, rootPath)
    }
}

function updateChildrenXr(cache: FileCache, rootPath: string) {
    const externalDocRegExp = /\\externaldocument(?:\[(.*?)\])?\{(.*?)\}/g
    while (true) {
        const result = externalDocRegExp.exec(cache.contentTrimmed)
        if (!result) {
            break
        }

        const texDirs = vscode.workspace.getConfiguration('latex-workshop').get('latex.texDirs') as string[]
        const externalPath = utils.resolveFile([path.dirname(cache.filePath), path.dirname(rootPath), ...texDirs], result[2])
        if (!externalPath || !fs.existsSync(externalPath) || path.relative(externalPath, rootPath) === '') {
            logger.log(`Failed resolving external ${result[2]} . Tried ${externalPath} ` +
                (externalPath && path.relative(externalPath, rootPath) === '' ? ', which is root.' : '.'))
            continue
        }

        const rootCache = caches[rootPath]
        if (rootCache !== undefined) {
            rootCache.external[externalPath] = result[1] || ''
            logger.log(`External document ${externalPath} from ${cache.filePath} .` + (result[1] ? ` Prefix is ${result[1]}`: ''))
        }

        if (extension.watcher.src.has(externalPath)) {
            continue
        }
        add(externalPath)
        void refreshCache(externalPath, externalPath)
    }
}

function updateElements(cache: FileCache) {
    const start = performance.now()
    require('../lw').completer.citation.parse(cache)
    // Package parsing must be before command and environment.
    require('../lw').completer.package.parse(cache)
    require('../lw').completer.reference.parse(cache)
    require('../lw').completer.glossary.parse(cache)
    require('../lw').completer.environment.parse(cache)
    require('../lw').completer.command.parse(cache)
    require('../lw').completer.input.parseGraphicsPath(cache)
    updateBibfiles(cache)
    const elapsed = performance.now() - start
    logger.log(`Updated elements in ${elapsed.toFixed(2)} ms: ${cache.filePath} .`)
}

function updateBibfiles(cache: FileCache) {
    const bibReg = /(?:\\(?:bibliography|addbibresource)(?:\[[^[\]{}]*\])?){([\s\S]+?)}|(?:\\putbib)\[(.+?)\]/gm
    while (true) {
        const result = bibReg.exec(cache.contentTrimmed)
        if (!result) {
            break
        }

        const bibs = (result[1] ? result[1] : result[2]).split(',').map(bib => bib.trim())

        for (const bib of bibs) {
            const bibPaths = extension.file.getBibPath(bib, path.dirname(cache.filePath))
            for (const bibPath of bibPaths) {
                cache.bibfiles.add(bibPath)
                logger.log(`Bib ${bibPath} from ${cache.filePath} .`)
                if (!extension.watcher.bib.has(bibPath)) {
                    extension.watcher.bib.add(bibPath)
                }
            }
        }
    }
}

/**
 * Parses the content of a `.fls` file attached to the given `srcFile`.
 * All `INPUT` files are considered as subfiles/non-tex files included in `srcFile`,
 * and all `OUTPUT` files will be checked if they are `.aux` files.
 * If so, the `.aux` files are parsed for any possible `.bib` files.
 *
 * This function is called after a successful build, when looking for the root file,
 * and to compute the cachedContent tree.
 *
 * @param filePath The path of a LaTeX file.
 */
async function loadFlsFile(filePath: string) {
    const flsPath = extension.file.getFlsPath(filePath)
    if (flsPath === undefined) {
        return
    }
    logger.log(`Parsing .fls ${flsPath} .`)
    const rootDir = path.dirname(filePath)
    const outDir = extension.file.getOutDir(filePath)
    const ioFiles = parseFlsContent(fs.readFileSync(flsPath).toString(), rootDir)

    for (const inputFile of ioFiles.input) {
        // Drop files that are also listed as OUTPUT or should be ignored
        if (ioFiles.output.includes(inputFile) ||
            isExcluded(inputFile) ||
            !fs.existsSync(inputFile)) {
            continue
        }
        if (inputFile === filePath || extension.watcher.src.has(inputFile)) {
            // Drop the current rootFile often listed as INPUT
            // Drop any file that is already watched as it is handled by
            // onWatchedFileChange.
            continue
        }
        if (path.extname(inputFile) === '.tex') {
            if (caches[filePath] === undefined) {
                logger.log(`Cache not finished on ${filePath} when parsing fls, try re-cache.`)
                await refreshCache(filePath)
            }
            // It might be possible that `filePath` is excluded from caching.
            const cache = caches[filePath]
            if (cache !== undefined) {
                // Parse tex files as imported subfiles.
                cache.children.push({
                    index: Number.MAX_VALUE,
                    filePath: inputFile
                })
                add(inputFile)
                logger.log(`Found ${inputFile} from .fls ${flsPath} , caching.`)
                void refreshCache(inputFile, filePath)
            } else {
                logger.log(`Cache not finished on ${filePath} when parsing fls.`)
            }
        } else if (!extension.watcher.src.has(inputFile)) {
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
            const bibPaths = extension.file.getBibPath(bib, srcDir)
            for (const bibPath of bibPaths) {
                if (extension.root.file.path && !caches[extension.root.file.path]?.bibfiles.has(bibPath)) {
                    caches[extension.root.file.path]?.bibfiles.add(bibPath)
                    logger.log(`Found .bib ${bibPath} from .aux ${filePath} .`)
                }
                if (!extension.watcher.bib.has(bibPath)) {
                    extension.watcher.bib.add(bibPath)
                }
            }
        }
    }
}


/**
 * Return a string array which holds all imported bib files
 * from the given tex `file`. If `file` is `undefined`, traces from the
 * root file, or return empty array if the root file is `undefined`
 *
 * @param filePath The path of a LaTeX file
 */
function getIncludedBib(filePath?: string, includedBib: string[] = []): string[] {
    filePath = filePath ?? extension.root.file.path
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
 * Return a string array which holds all imported tex files
 * from the given `file` including the `file` itself.
 * If `file` is `undefined`, trace from the * root file,
 * or return empty array if the root file is `undefined`
 *
 * @param filePath The path of a LaTeX file
 */
function getIncludedTeX(filePath?: string, includedTeX: string[] = [], cachedOnly: boolean = true): string[] {
    filePath = filePath ?? extension.root.file.path
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
 * Return the list of files (recursively) included in `file`
 *
 * @param filePath The file in which children are recursively computed
 * @param basePath The file currently considered as the rootFile
 * @param children The list of already computed children
 */
function getTeXChildren(filePath: string, basePath: string, children: string[]) {
    const fileCache = get(filePath)
    if (fileCache === undefined) {
        logger.log(`Cache not finished on ${filePath} when getting its children.`)
        return []
    }

    fileCache.children.forEach(async child => {
        if (children.includes(child.filePath)) {
            // Already included
            return
        }
        children.push(child.filePath)
        getTeXChildren(child.filePath, basePath, children)
    })
    return children
}

function getFlsChildren(texFile: string) {
    const flsPath = extension.file.getFlsPath(texFile)
    if (flsPath === undefined) {
        return []
    }
    const rootDir = path.dirname(texFile)
    const ioFiles = parseFlsContent(fs.readFileSync(flsPath).toString(), rootDir)
    return ioFiles.input
}
