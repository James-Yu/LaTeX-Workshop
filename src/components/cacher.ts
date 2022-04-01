import * as vscode from 'vscode'
import * as chokidar from 'chokidar'

import type {Extension} from '../main'
import {BibCacher} from './cacherlib/bibcache'

/**
 * This class provides cached raw and parsed contents of all files related.
 * Including tex and bib files involved in this project, and bib files ever
 * opened.
 */
export class Cacher {
    private readonly extension: Extension
    readonly bib: BibCacher

    constructor(extension: Extension) {
        this.extension = extension
        this.bib = new BibCacher(extension, this.initWatcher())
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
        this.extension.logger.addLogMessage(`Creating cacher with options: ${JSON.stringify(watcherOptions)}`)
        return chokidar.watch([], watcherOptions)
    }
}

