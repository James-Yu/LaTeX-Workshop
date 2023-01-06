import * as vscode from 'vscode'
import * as chokidar from 'chokidar'

import type {Extension} from '../../main'
import { Logger } from '../logger'

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

    private async onWatchedBibChanged(file: string) {
        Logger.log(`Bib file watcher - file changed: ${file}`)
        await this.extension.completer.citation.parseBibFile(file)
        await this.extension.builder.buildOnFileChanged(file, true)
    }

    private onWatchedBibDeleted(file: string) {
        Logger.log(`Bib file watcher - file deleted: ${file}`)
        this.bibWatcher.unwatch(file)
        this.bibsWatched.delete(file)
        this.extension.completer.citation.removeEntriesInFile(file)
    }

    async watchBibFile(bibPath: string) {
        if (!this.bibsWatched.has(bibPath)) {
            Logger.log(`Added to bib file watcher: ${bibPath}`)
            this.bibWatcher.add(bibPath)
            this.bibsWatched.add(bibPath)
            await this.extension.completer.citation.parseBibFile(bibPath)
        }
    }

    logWatchedFiles() {
        Logger.log(`BibWatcher.bibWatcher.getWatched: ${JSON.stringify(this.bibWatcher.getWatched())}`)
        Logger.log(`BibWatcher.bibsWatched: ${JSON.stringify(Array.from(this.bibsWatched))}`)
    }

}
