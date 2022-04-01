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
    private readonly bib: BibCacher

    constructor(extension: Extension) {
        this.bib = new BibCacher(extension)
    }
}

class BibCacher {
    private readonly extension: Extension
    private readonly bibWatcher: chokidar.FSWatcher
    private readonly bibWatched = new Set<string>()
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
        this.extension.logger.addLogMessage(`Creating bib watcher, options: ${JSON.stringify(watcherOptions)}`)
        return chokidar.watch([], watcherOptions)
    }

    /**
     * Add a new bibtex file to the watcher, and parse the content.
     * @param file The full path to the bib file.
     * @returns `true` if the file is added and watched, `false` if it already
     * exists.
     */
    add(file: string): boolean {
        if (this.bibWatched.has(file)) {
            return false
        }
        this.extension.logger.addLogMessage(`Bib watcher file ADDED: ${file}`)
        this.bibWatcher.add(file)
        this.bibWatched.add(file)
        this.parseBib(file)
        this.onAddedCallbacks.forEach(cb => cb(file))
        return true
    }

    /**
     * Get the cached content of a bibtex file given its path.
     * @param file The path of bibtex file to retrieve.
     * @returns BibCache if the file has been cached, otherwise `undefined`.
     */
    get(file: string): BibCache | undefined {
        return this.cache[file]
    }

    /**
     * Remove the cached content of a bibtex file given its path.
     * @param file The path of bibtex file to remove from the cache.
     * @returns The removed cache if the file has been cached, otherwise
     * `undefined`.
     */
    remove(file: string): BibCache | undefined {
        if (!this.bibWatched.has(file)) {
            return undefined
        }
        this.onBibDeleted(file)
        const cachedContent = this.cache[file]
        delete this.cache[file]
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
            `BiBTeX Cacher: ${JSON.stringify(Array.from(this.bibWatched))}`)
    }

    private onBibDeleted(file: string) {
        this.extension.logger.addLogMessage(`Bib watcher file DELETED: ${file}`)
        this.bibWatcher.unwatch(file)
        this.bibWatched.delete(file)
        // TODO: Remove respective bib entries from intellisense.
        // this.extension.completer.citation.removeEntriesInFile(file)
    }

    private onBibChanged(file: string) {
        this.extension.logger.addLogMessage(`Bib watcher file CHANGED: ${file}`)
        this.parseBib(file)
    }

    private parseBib(file: string) {
        // 1. Update cached content
        const content = fs.readFileSync(file).toString()
        this.cache[file].contentSaved = content
        this.cache[file].linesSaved = content.split('\n')

        // 2. Check the file size to avoid long parsing time, then update ast
        this.cache[file].astSaved = undefined
        const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(file))
        const maxFileSize = configuration.get('bibtex.maxFileSize') as number
        const fileSize = fs.statSync(file).size / 1024 / 1024
        if (fileSize > maxFileSize) {
            this.extension.logger.addLogMessage(`Bib file size ${fileSize.toFixed(2)}MB > ${maxFileSize}MB: ${file}`)
        } else {
            this.extension.pegParser.parseBibtex(content)
            .then(ast => this.cache[file].astSaved = ast)
            .catch((e) => {
                if (bibtexParser.isSyntaxError(e)) {
                    const line = e.location.start.line
                    this.extension.logger.addLogMessage(`Error parsing BibTeX: line ${line} in ${file}.`)
                    this.extension.logger.addLogMessage(`Error: ${JSON.stringify(e)}`)
                }
            })
        }

        // 3. Call auto-build on file change
        this.extension.manager.buildOnFileChanged(file, true)
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
