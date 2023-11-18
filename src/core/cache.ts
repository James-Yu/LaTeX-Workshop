import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as lw from '../lw'
import * as eventbus from './event-bus'
import * as CacherUtils from './cacherlib/cacherutils'
import * as PathUtils from './cacherlib/pathutils'
import * as utils from '../utils/utils'
import { InputFileRegExp } from '../utils/inputfilepath'
import { parser } from '../parse/parser'
import { performance } from 'perf_hooks'

import { extension } from '../extension'
import type { FileCache } from '../types'
import { getIncludedTeX, getIncludedBib, getTeXChildren, getFlsChildren } from './project'

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
    if (CacherUtils.canCache(filePath)) {
        void refreshCache(filePath)
    }
})
extension.watcher.src.onDelete((filePath: string) => {
    if (filePath in caches) {
        delete caches[filePath]
        logger.log(`Removed ${filePath} .`)
    }
})

function add(filePath: string) {
    if (CacherUtils.isExcluded(filePath)) {
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
    if (CacherUtils.isExcluded(filePath)) {
        logger.log(`Ignored ${filePath} .`)
        return
    }
    if (!CacherUtils.canCache(filePath)) {
        return
    }
    logger.log(`Caching ${filePath} .`)
    cachingFilesCount++
    const openEditor: vscode.TextDocument | undefined = vscode.workspace.textDocuments.filter(document => document.fileName === path.normalize(filePath))?.[0]
    const content = openEditor?.isDirty ? openEditor.getText() : (lw.lwfs.readFileSyncGracefully(filePath) ?? '')
    const cache: FileCache = {
        filePath,
        content,
        contentTrimmed: utils.stripCommentsAndVerbatim(content),
        elements: {},
        children: [],
        bibfiles: new Set(),
        external: {}}
    caches[filePath] = cache
    rootPath = rootPath || lw.manager.rootFile
    updateChildren(cache, rootPath)

    promises[filePath] = updateAST(cache).then(() => {
        updateElements(cache)
    }).finally(() => {
        lw.dupLabelDetector.run()
        cachingFilesCount--
        delete promises[filePath]
        lw.eventBus.fire(eventbus.FileParsed, filePath)

        if (cachingFilesCount === 0) {
            void lw.structureViewer.reconstruct()
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
            void refreshCache(filePath, lw.manager.rootFile).then(async () => {
                await loadFlsFile(lw.manager.rootFile || filePath)
            })
        }, configuration.get('intellisense.update.delay', 1000))
    }
}

async function updateAST(cache: FileCache): Promise<void> {
    logger.log(`Parse LaTeX AST: ${cache.filePath} .`)
    cache.ast = await parser.parseLaTeX(cache.content)
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
    lw.completer.citation.parse(cache)
    // Package parsing must be before command and environment.
    lw.completer.package.parse(cache)
    lw.completer.reference.parse(cache)
    lw.completer.glossary.parse(cache)
    lw.completer.environment.parse(cache)
    lw.completer.command.parse(cache)
    lw.completer.input.parseGraphicsPath(cache)
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
            const bibPaths = PathUtils.resolveBibPath(bib, path.dirname(cache.filePath))
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
    const flsPath = PathUtils.getFlsFilePath(filePath)
    if (flsPath === undefined) {
        return
    }
    logger.log(`Parsing .fls ${flsPath} .`)
    const rootDir = path.dirname(filePath)
    const outDir = lw.manager.getOutDir(filePath)
    const ioFiles = CacherUtils.parseFlsContent(fs.readFileSync(flsPath).toString(), rootDir)

    for (const inputFile of ioFiles.input) {
        // Drop files that are also listed as OUTPUT or should be ignored
        if (ioFiles.output.includes(inputFile) ||
            CacherUtils.isExcluded(inputFile) ||
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
            const bibPaths = PathUtils.resolveBibPath(bib, srcDir)
            for (const bibPath of bibPaths) {
                if (lw.manager.rootFile && !caches[lw.manager.rootFile]?.bibfiles.has(bibPath)) {
                    caches[lw.manager.rootFile]?.bibfiles.add(bibPath)
                    logger.log(`Found .bib ${bibPath} from .aux ${filePath} .`)
                }
                if (!extension.watcher.bib.has(bibPath)) {
                    extension.watcher.bib.add(bibPath)
                }
            }
        }
    }
}
