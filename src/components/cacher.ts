import * as vscode from 'vscode'
import * as fs from 'fs'
import * as chokidar from 'chokidar'
import {bibtexParser} from 'latex-utensils'

import type {Extension} from '../main'

/**
 * This class provides cached raw and parsed contents of all files related.
 * Including tex and bib files involved in this project, and bib files ever
 * opened.
 */
export class Cacher {
    readonly bib: BibCacher

    constructor(extension: Extension) {
        this.bib = new BibCacher(extension)
    }
}

class BibCacher {
    private readonly extension: Extension
    private readonly bibWatcher: chokidar.FSWatcher
    private readonly cache = Object.create(null) as {[filepath: string]: BibCache}
    private readonly onAddedCallbacks = new Set<(file: string) => void>()

    constructor(extension: Extension) {
        this.extension = extension
        this.bibWatcher = this.initWatcher()
        this.registerOnDeleted((file: string) => this.onBibDeleted(file))
        this.registerOnChanged((file: string) => this.onBibChanged(file))
    }

    private initWatcher() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const usePolling = configuration.get('latex.watch.usePolling') as boolean
        const interval = configuration.get('latex.watch.interval') as number
        const delay = configuration.get('latex.watch.delay') as number
        const watcherOptions = {
            useFsEvents: false,
            usePolling,
            interval,
            binaryInterval: Math.max(interval, 1000),
            awaitWriteFinish: {stabilityThreshold: delay}
        }
        this.extension.logger.addLogMessage(`Creating Bib cacher, options: ${JSON.stringify(watcherOptions)}`)
        return chokidar.watch([], watcherOptions)
    }

    /**
     * Add a new bibtex file to the watcher, and parse the content.
     * @param file The full path to the bib file.
     * @returns `BibCache` if the file is added and watched, `undefined` if it
     * exists.
     */
    async add(file: string): Promise<BibCache | undefined> {
        if (this.isCached(file)) {
            return undefined
        }
        this.extension.logger.addLogMessage(`Bib cacher file ADDED: ${file}`)
        this.bibWatcher.add(file)
        this.cache[file] = await this.parseBib(file)
        this.onAddedCallbacks.forEach(cb => cb(file))
        return this.cache[file]
    }

    /**
     * Get the cached content of a bibtex file given its path.
     * @param file The path of bibtex file to retrieve.
     * @param add Whether add the file if it has NOT been cached. Default is
     * `false`.
     * @returns `BibCache` if the file has been cached or added with `add` set
     * to `true`, otherwise `undefined`.
     */
    async get(file: string, add: boolean = false): Promise<BibCache | undefined> {
        if (add && !this.isCached(file)) {
            await this.add(file)
        }
        return this.cache[file]
    }

    private isCached(file: string): boolean {
        return this.getCached().includes(file)
    }

    private getCached(): string[] {
        return Object.keys(this.cache)
    }

    /**
     * Remove the cached content of a bibtex file given its path.
     * @param file The path of bibtex file to remove from the cache.
     * @returns The removed cache if the file has been cached, otherwise
     * `undefined`.
     */
    remove(file: string): BibCache | undefined {
        if (!this.isCached(file)) {
            return undefined
        }
        this.onBibDeleted(file)
        const cachedContent = this.cache[file]
        return cachedContent
    }

    dispose() {
        this.bibWatcher.close().catch((e) => {
            this.extension.logger.addLogMessage(
                `Error occurred when disposing BiBTeX file watcher: ${JSON.stringify(e)}`)
        })
    }

    registerOnAdded(cb: (file: string) => void) {
        this.onAddedCallbacks.add(cb)
    }

    registerOnDeleted(cb: (file: string) => void) {
        this.bibWatcher.on('unlink', cb)
    }

    registerOnChanged(cb: (file: string) => void) {
        this.bibWatcher.on('change', cb)
    }

    log() {
        this.extension.logger.addLogMessage(
            `BiBTeX Watcher: ${JSON.stringify(this.bibWatcher.getWatched())}`)
        this.extension.logger.addLogMessage(
            `BiBTeX Cacher: ${JSON.stringify(this.getCached())}`)
    }

    private onBibDeleted(file: string) {
        this.extension.logger.addLogMessage(`Bib cacher file DELETED: ${file}`)
        this.bibWatcher.unwatch(file)
        delete this.cache[file]
    }

    private async onBibChanged(file: string) {
        this.extension.logger.addLogMessage(`Bib cacher file CHANGED: ${file}`)
        this.cache[file] = await this.parseBib(file)
    }

    private async parseBib(file: string): Promise<BibCache> {
        const cache = Object.create(null) as BibCache
        // 1. Update cached content
        const content = fs.readFileSync(file).toString()
        cache.contentSaved = content
        cache.linesSaved = content.split('\n')

        // 2. Check the file size to avoid long parsing time, then update ast
        cache.astSaved = undefined
        const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(file))
        const maxFileSize = configuration.get('bibtex.maxFileSize') as number
        const fileSize = fs.statSync(file).size / 1024 / 1024
        if (fileSize > maxFileSize) {
            this.extension.logger.addLogMessage(`Bib file size ${fileSize.toFixed(2)}MB > ${maxFileSize}MB: ${file}`)
        } else {
            cache.astSaved = await this.extension.pegParser.parseBibtex(content)
            .catch((e) => {
                if (bibtexParser.isSyntaxError(e)) {
                    const line = e.location.start.line
                    this.extension.logger.addLogMessage(`Error parsing BibTeX: line ${line} in ${file}.`)
                    this.extension.logger.addLogMessage(`Error: ${JSON.stringify(e)}`)
                }
                return undefined
            })
        }

        // TODO: Call auto-build on file change
        // this.extension.manager.buildOnFileChanged(file, true)

        return cache
    }
}

type BibCache = {
    // The dirty content in vscode
    // contentDirty: string,

    // The saved content on disk
    contentSaved: string,

    // Dirty content split into lines
    // linesDirty: string[],

    // Saved content split into lines
    linesSaved: string[],

    // AST parsed from saved content. Undefined means over-sized bib file
    astSaved: bibtexParser.BibtexAst | undefined
}
