import * as vscode from 'vscode'
import * as chokidar from 'chokidar'

import {TexCacher} from './cacherlib/texcache'
import {BibCacher} from './cacherlib/bibcache'
import type {Extension} from '../main'
import type {BibCache} from './cacherlib/bibcache'
import { AuxCacher } from './cacherlib/auxcache'

/**
 * This class provides cached raw and parsed contents of all files related.
 * Including tex and bib files involved in this project, and bib files ever
 * opened.
 */
export class Cacher {
    private readonly extension: Extension
    /**
     * Cache of all tex-like files.
     */
    readonly tex: TexCacher
    /**
     * Cache of all bibtex files.
     */
    readonly bib: BibCacher
    /**
     * Cache of all bibtex files that does not belong to the current project but
     * is opened in vscode.
     */
    readonly bibOtherOpened: BibCacher
    /**
     * A file watcher that watches all files the current project relies on,
     * i.e., change or delete of which should trigger an auto-build. This
     * watcher does not include tex-like files, just only bibtex and auxiliary
     * ones (aux, fls, pdf, png, etc.).
     */
    readonly aux: AuxCacher

    constructor(extension: Extension) {
        this.extension = extension
        this.tex = new TexCacher(extension, this.initWatcher(), 'TEX')
        this.bib = new BibCacher(extension, this.initWatcher(), 'BIB')
        this.bibOtherOpened = new BibCacher(extension, this.initWatcher(), 'OTHERBIB')
        this.aux = new AuxCacher(extension, this.initWatcher(), 'AUX')
    }

    initWatcher() {
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
        this.extension.logger.addLogMessage(`Creating cacher with options: ${JSON.stringify(watcherOptions)}`)
        return chokidar.watch([], watcherOptions)
    }

    /**
     * When root file is changed, the project dependency needs reparse. Just
     * call this.
     */
    reset() {
        this.tex.dispose()
        this.bib.dispose()
        this.aux.dispose()
    }

    /**
     * This function should be called when a new bib file is opened, but we
     * do not know if it belongs to the current project. This function checks
     * whether the bib watcher has the file included, which is updated from
     * parsing the root file. If not, this file will be cached using
     * `bibOtherOpened`.
     * @param file The full path to the file.
     * @returns `CacheType` if the file is added and watched, `undefined` if it
     * exists.
     */
    async openedBibFile(file: string): Promise<BibCache | undefined> {
        if (this.bib.isCached(file)) {
            return
        }
        return this.bibOtherOpened.add(file)
    }

    /**
     * This function should be called when an opened bib file is closed, but we
     * do not know if it belongs to the current project. This function checks
     * whether the bib watcher has the file included, which is updated from
     * parsing the root file. If not, this file will be un-cached from
     * `bibOtherOpened`.
     * @param file The full path to the file.
     * @returns `CacheType` if the file is removed, `undefined` if it belongs
     * to the project.
     */
    closedBibFile(file: string): BibCache | undefined {
        if (this.bib.isCached(file)) {
            return
        }
        return this.bibOtherOpened.remove(file)
    }

    async getBibCache(file: string): Promise<BibCache | undefined> {
        if (this.bib.isCached(file)) {
            return this.bib.get(file)
        }
        // If never cached, add the file to cacher
        return this.bibOtherOpened.get(file, true)
    }
}

