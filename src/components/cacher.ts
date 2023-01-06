import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as chokidar from 'chokidar'
import { latexParser } from 'latex-utensils'

import type { CmdEnvSuggestion } from '../providers/completer/completerutils'
import type { CiteSuggestion } from '../providers/completer/citation'
import type { GlossarySuggestion } from '../providers/completer/glossary'
import type { ICompletionItem } from '../providers/completion'

import { Extension } from '../main'
import * as eventbus from './eventbus'
import * as utils from '../utils/utils'
import { InputFileRegExp } from '../utils/inputfilepath'
import { canContext, isExcluded } from './cacherlib/cacherutils'
import { PathUtils } from './managerlib/pathutils'

export interface Context {
    /**
     * The dirty (under editing) content of the LaTeX file if opened in vscode,
     * the content on disk otherwise.
     */
    content: string | undefined,
    /**
     * Completion item and other items for the LaTeX file.
     */
    elements: {
        reference?: ICompletionItem[],
        glossary?: GlossarySuggestion[],
        environment?: CmdEnvSuggestion[],
        bibitem?: CiteSuggestion[],
        command?: CmdEnvSuggestion[],
        package?: {[packageName: string]: string[]}
    },
    /**
     * The sub-files of the LaTeX file. They should be tex or plain files.
     */
    children: {
        /**
         * The index of character sub-content is inserted
         */
        index: number,
        /**
         * The path of the sub-file
         */
        file: string
    }[],
    /**
     * The array of the paths of `.bib` files referenced from the LaTeX file.
     */
    bibfiles: string[]
}

export class Cacher {
    private readonly contexts: {[filePath: string]: Context} = {}
    private readonly watcher: Watcher = new Watcher(this.extension, this)
    private readonly pathUtils: PathUtils = new PathUtils(this.extension)

    constructor(private readonly extension: Extension) {
    }

    add(filePath: string) {
        if (isExcluded(filePath)) {
            this.extension.logger.addLogMessage(`[Cacher] Ignored ${filePath}.`)
            return
        }
        if (!this.watcher.has(filePath)) {
            this.extension.logger.addLogMessage(`[Cacher] Adding ${filePath}.`)
            this.watcher.add(filePath)
        }
    }

    has(filePath: string) {
        return Object.keys(this.contexts).includes(filePath)
    }

    watched(filePath: string) {
        return this.watcher.has(filePath)
    }

    async resetWatcher() {
        await this.watcher.reset()
    }

    async dispose() {
        await this.watcher.watcher.close()
    }

    async refreshContext(filePath: string, rootPath?: string) {
        if (isExcluded(filePath)) {
            this.extension.logger.addLogMessage(`[Cacher] Ignored ${filePath}.`)
            return
        }
        if (!canContext(filePath)) {
            return
        }
        const content = this.extension.lwfs.readFileSyncGracefully(filePath)
        this.contexts[filePath] = {content, elements: {}, children: [], bibfiles: []}
        if (content === undefined) {
            this.extension.logger.addLogMessage(`[Cacher] Cannot read ${filePath}.`)
            return
        }
        const contentTrimmed = utils.stripCommentsAndVerbatim(content)
        rootPath = rootPath || this.extension.manager.rootFile
        this.updateChildren(filePath, rootPath, contentTrimmed)
        await this.updateElements(filePath, content, contentTrimmed)
        await this.updateBibfiles(filePath, contentTrimmed)
        this.extension.eventBus.fire(eventbus.FileParsed, filePath)
    }

    private updateChildren(filePath: string, rootPath: string | undefined, contentTrimmed: string) {
        rootPath = rootPath || filePath

        const inputFileRegExp = new InputFileRegExp()
        while (true) {
            const result = inputFileRegExp.exec(contentTrimmed, filePath, rootPath)
            if (!result) {
                break
            }

            if (!fs.existsSync(result.path) || path.relative(result.path, rootPath) === '') {
                continue
            }

            this.contexts[rootPath].children.push({
                index: result.match.index,
                file: result.path
            })
            this.extension.logger.addLogMessage(`[Cacher] Input ${result.path} from ${filePath}.`)

            if (this.watcher.has(result.path)) {
                continue
            }
            this.add(result.path)
            void this.refreshContext(result.path, rootPath)
        }

        this.extension.logger.addLogMessage(`[Cacher] Updated inputs of ${filePath}.`)
        this.extension.eventBus.fire(eventbus.FileParsed, filePath)
    }

    private async updateElements(file: string, content: string, contentTrimmed: string) {
        this.extension.completer.citation.update(file, content)
        const languageId: string | undefined = vscode.window.activeTextEditor?.document.languageId
        let latexAst: latexParser.AstRoot | latexParser.AstPreamble | undefined = undefined
        if (!languageId || languageId !== 'latex-expl3') {
            latexAst = await this.extension.pegParser.parseLatex(content)
        }

        if (latexAst) {
            const nodes = latexAst.content
            const lines = content.split('\n')
            this.extension.completer.reference.update(file, nodes, lines)
            this.extension.completer.glossary.update(file, nodes)
            this.extension.completer.environment.update(file, nodes, lines)
            this.extension.completer.command.update(file, nodes)
        } else {
            this.extension.logger.addLogMessage(`Cannot parse a TeX file: ${file}`)
            this.extension.logger.addLogMessage('Fall back to regex-based completion.')
            // Do the update with old style.
            this.extension.completer.reference.update(file, undefined, undefined, contentTrimmed)
            this.extension.completer.glossary.update(file, undefined, contentTrimmed)
            this.extension.completer.environment.update(file, undefined, undefined, contentTrimmed)
            this.extension.completer.command.update(file, undefined, contentTrimmed)
        }
        this.extension.manager.intellisenseWatcher.emitUpdate(file)
    }

    private async updateBibfiles(filePath: string, contentTrimmed: string) {
        const bibReg = /(?:\\(?:bibliography|addbibresource)(?:\[[^[\]{}]*\])?){(.+?)}|(?:\\putbib)\[(.+?)\]/g
        while (true) {
            const result = bibReg.exec(contentTrimmed)
            if (!result) {
                break
            }

            const bibs = (result[1] ? result[1] : result[2]).split(',').map(bib => bib.trim())

            for (const bib of bibs) {
                const bibPath = this.pathUtils.resolveBibPath(bib, path.dirname(filePath))
                if (bibPath === undefined) {
                    continue
                }
                this.contexts[filePath].bibfiles.push(bibPath)
                this.extension.logger.addLogMessage(`[Cacher] Bib ${bibPath} from ${filePath}.`)
                await this.extension.manager.bibWatcher.watchBibFile(bibPath)
            }
        }
        this.extension.logger.addLogMessage(`[Cacher] Updated bibs of ${filePath}.`)
    }

    //////////////////////////////////////

    /**
     * Get the buffer content of a file if it is opened in vscode. Otherwise, read the file from disk
     */
    getDirtyContent(file: string): string | undefined {
        const cache = this.contexts[file]
        if (cache !== undefined) {
            if (cache.content) {
                return cache.content
            }
        }
        const fileContent = this.extension.lwfs.readFileSyncGracefully(file)
        if (fileContent === undefined) {
            this.extension.logger.addLogMessage(`Cannot read dirty content of unknown ${file}`)
        }
        this.contexts[file] = {content: fileContent, elements: {}, children: [], bibfiles: []}
        return fileContent
    }

    getCachedContent(filePath: string): Context {
        if (!(filePath in this.contexts)) {
            this.getDirtyContent(filePath)
        }
        return this.contexts[filePath]
    }

    removeCachedContent(filePath: string) {
        if (filePath in this.contexts) {
            delete this.contexts[filePath]
        }
    }

    get cachedFilePaths() {
        return Object.keys(this.contexts)
    }

    updateCachedContent(document: vscode.TextDocument) {
        const cache = this.getCachedContent(document.fileName)
        if (cache !== undefined) {
            cache.content = document.getText()
        }
        this.extension.eventBus.fire(eventbus.CacheUpdated)
    }

    /**
     * Return a string array which holds all imported bib files
     * from the given tex `file`. If `file` is `undefined`, traces from the
     * root file, or return empty array if the root file is `undefined`
     *
     * @param file The path of a LaTeX file
     */
    getIncludedBib(file?: string, includedBib: string[] = [], children: string[] = []): string[] {
        if (file === undefined) {
            file = this.extension.manager.rootFile
        }
        if (file === undefined) {
            return []
        }
        if (!this.has(file)) {
            return []
        }
        children.push(file)
        const cache = this.getCachedContent(file)
        includedBib.push(...cache.bibfiles)
        for (const child of cache.children) {
            if (children.includes(child.file)) {
                // Already parsed
                continue
            }
            this.getIncludedBib(child.file, includedBib)
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
     * @param file The path of a LaTeX file
     */
    getIncludedTeX(file?: string, includedTeX: string[] = []): string[] {
        if (file === undefined) {
            file = this.extension.manager.rootFile
        }
        if (file === undefined) {
            return []
        }
        if (!this.has(file)) {
            return []
        }
        includedTeX.push(file)
        for (const child of this.getCachedContent(file).children) {
            if (includedTeX.includes(child.file)) {
                // Already included
                continue
            }
            this.getIncludedTeX(child.file, includedTeX)
        }
        return includedTeX
    }

    /**
     * Return the list of files (recursively) included in `file`
     *
     * @param file The file in which children are recursively computed
     * @param baseFile The file currently considered as the rootFile
     * @param children The list of already computed children
     * @param content The content of `file`. If undefined, it is read from disk
     */
    getTeXChildren(file: string, baseFile: string, children: string[], content?: string): string[] {
        if (content === undefined) {
            content = utils.stripCommentsAndVerbatim(fs.readFileSync(file).toString())
        }

        // Update children of current file
        if (!this.has(file)) {
            this.getDirtyContent(file)
            const cache = this.getCachedContent(file)
            cache.content = content
            const inputFileRegExp = new InputFileRegExp()
            while (true) {
                const result = inputFileRegExp.exec(content, file, baseFile)
                if (!result) {
                    break
                }

                if (!fs.existsSync(result.path) ||
                    path.relative(result.path, baseFile) === '') {
                    continue
                }

                cache.children.push({
                    index: result.match.index,
                    file: result.path
                })
            }
        }

        this.getCachedContent(file).children.forEach(child => {
            if (children.includes(child.file)) {
                // Already included
                return
            }
            children.push(child.file)
            this.getTeXChildren(child.file, baseFile, children)
        })
        return children
    }
}

class Watcher {
    readonly watcher: chokidar.FSWatcher
    readonly watched: Set<string> = new Set()

    constructor(
        private readonly extension: Extension,
        private readonly cacher: Cacher
    ) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const watcherOption = {
            useFsEvents: false,
            usePolling: configuration.get('latex.watch.usePolling') as boolean,
            interval: configuration.get('latex.watch.interval') as number,
            binaryInterval: Math.max(configuration.get('latex.watch.interval') as number, 1000),
            awaitWriteFinish: {stabilityThreshold: configuration.get('latex.watch.delay') as number}
        }
        this.extension.logger.addLogMessage(`[Cacher][Watcher]Create watcher: ${JSON.stringify(watcherOption)}`)
        this.watcher = chokidar.watch([], watcherOption)

        this.watcher.on('add', (file: string) => this.onAdd(file))
        this.watcher.on('change', (file: string) => this.onChange(file))
        this.watcher.on('unlink', (file: string) => this.onUnlink(file))

        this.registerOptionReload()
    }

    add(filePath: string) {
        this.watcher.add(filePath)
        this.watched.add(filePath)
    }

    has(filePath: string) {
        return this.watched.has(filePath)
    }

    async reset() {
        await this.watcher.close()
        this.watched.clear()

        this.watcher.on('add', (file: string) => this.onAdd(file))
        this.watcher.on('change', (file: string) => this.onChange(file))
        this.watcher.on('unlink', (file: string) => this.onUnlink(file))
    }

    private onAdd(filePath: string) {
        this.extension.logger.addLogMessage(`[Cacher][Watcher] Watched ${filePath}.`)
        this.extension.eventBus.fire(eventbus.FileWatched, filePath)
    }

    private onChange(filePath: string) {
        if (canContext(filePath)) {
            void this.cacher.refreshContext(filePath)
        }
        void this.extension.manager.buildOnFileChanged(filePath)
        this.extension.logger.addLogMessage(`[Cacher][Watcher] Changed ${filePath}.`)
        this.extension.eventBus.fire(eventbus.FileChanged, filePath)
    }

    private onUnlink(filePath: string) {
        this.watcher.unwatch(filePath)
        this.watched.delete(filePath)
        this.cacher.removeCachedContent(filePath)
        if (filePath === this.extension.manager.rootFile) {
            this.extension.logger.addLogMessage(`[Cacher][Watcher] Root deleted ${filePath}.`)
            this.extension.manager.rootFile = undefined
            void this.extension.manager.findRoot()
        } else {
            this.extension.logger.addLogMessage(`[Cacher][Watcher] Deleted ${filePath}.`)
        }
        this.extension.eventBus.fire(eventbus.FileRemoved, filePath)
    }

    private registerOptionReload() {
        this.extension.context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
            const configuration = vscode.workspace.getConfiguration('latex-workshop')
            if (e.affectsConfiguration('latex-workshop.latex.watch.usePolling') ||
                e.affectsConfiguration('latex-workshop.latex.watch.interval') ||
                e.affectsConfiguration('latex-workshop.latex.watch.delay') ||
                e.affectsConfiguration('latex-workshop.latex.watch.pdf.delay')) {
                this.watcher.options.usePolling = configuration.get('latex.watch.usePolling') as boolean
                this.watcher.options.interval = configuration.get('latex.watch.interval') as number
                this.watcher.options.awaitWriteFinish = {stabilityThreshold: configuration.get('latex.watch.delay') as number}
            }
            if (e.affectsConfiguration('latex-workshop.latex.watch.files.ignore')) {
                this.watched.forEach(filePath => {
                    if (!isExcluded(filePath)) {
                        return
                    }
                    this.watcher.unwatch(filePath)
                    this.watched.delete(filePath)
                    this.cacher.removeCachedContent(filePath)
                    this.extension.logger.addLogMessage(`[Cacher][Watcher] Ignored ${filePath}.`)
                    void this.extension.manager.findRoot()
                })
            }
        }))
    }
}
