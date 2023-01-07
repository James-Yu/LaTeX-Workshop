import * as vscode from 'vscode'
import * as chokidar from 'chokidar'

import type {Extension} from '../../main'
import { getLogger } from '../logger'

const logger = getLogger('Cacher', 'Bib')

export class BibWatcher {
    private bibWatcher: chokidar.FSWatcher
    private readonly bibsWatched = new Set<string>()

    constructor(private readonly extension: Extension) {
        this.bibWatcher = chokidar.watch([], this.getWatcherOptions())
        this.initializeWatcher()

        this.extension.context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
            if (e.affectsConfiguration('latex-workshop.latex.watch.usePolling') ||
                e.affectsConfiguration('latex-workshop.latex.watch.interval') ||
                e.affectsConfiguration('latex-workshop.latex.watch.delay')) {
                void this.bibWatcher.close()
                this.bibWatcher = chokidar.watch([], this.getWatcherOptions())
                this.bibsWatched.forEach(filePath => this.bibWatcher.add(filePath))
                this.initializeWatcher()
            }
        }))
    }

    async dispose() {
        await this.bibWatcher.close()
    }

    initializeWatcher() {
        this.bibWatcher.on('change', (file: string) => this.onWatchedBibChanged(file))
        this.bibWatcher.on('unlink', (file: string) => this.onWatchedBibDeleted(file))
    }

    private getWatcherOptions() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        return {
            useFsEvents: false,
            usePolling: configuration.get('latex.watch.usePolling') as boolean,
            interval: configuration.get('latex.watch.interval') as number,
            binaryInterval: Math.max(configuration.get('latex.watch.interval') as number, 1000),
            awaitWriteFinish: {stabilityThreshold: configuration.get('latex.watch.delay') as number}
        }
    }

    private onWatchedBibChanged(filePath: string) {
        void this.extension.completer.citation.parseBibFile(filePath)
        void this.extension.builder.buildOnFileChanged(filePath, true)
        logger.log(`File changed ${filePath} .`)
    }

    private onWatchedBibDeleted(filePath: string) {
        this.bibWatcher.unwatch(filePath)
        this.bibsWatched.delete(filePath)
        this.extension.completer.citation.removeEntriesInFile(filePath)
        logger.log(`File unlinked ${filePath} .`)
    }

    async watchBibFile(filePath: string) {
        if (!this.bibsWatched.has(filePath)) {
            this.bibWatcher.add(filePath)
            this.bibsWatched.add(filePath)
            logger.log(`File watched ${filePath} .`)
            await this.extension.completer.citation.parseBibFile(filePath)
        }
    }

    logWatchedFiles() {
        logger.log(`getWatched() => ${JSON.stringify(this.bibWatcher.getWatched())}`)
        logger.log(`bibsWatched() => ${JSON.stringify(Array.from(this.bibsWatched))}`)
    }

}
