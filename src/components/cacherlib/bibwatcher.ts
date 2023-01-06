import * as vscode from 'vscode'
import * as chokidar from 'chokidar'

import type {Extension} from '../../main'

export class BibWatcher {
    private readonly extension: Extension
    private readonly bibWatcher: chokidar.FSWatcher
    private readonly bibsWatched = new Set<string>()

    constructor(extension: Extension) {
        this.extension = extension
        this.bibWatcher = this.initiateBibwatcher()

        this.extension.context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
            if (e.affectsConfiguration('latex-workshop.latex.watch.usePolling') ||
                e.affectsConfiguration('latex-workshop.latex.watch.interval') ||
                e.affectsConfiguration('latex-workshop.latex.watch.delay')) {
                this.updateWatcherOptions()
            }
        }))
    }

    async dispose() {
        await this.bibWatcher.close()
    }

    initiateBibwatcher() {
        this.extension.logger.addLogMessage('Creating Bib file watcher.')
        const bibWatcher = chokidar.watch([], {useFsEvents: false})
        this.updateWatcherOptions()
        bibWatcher.on('change', (file: string) => this.onWatchedBibChanged(file))
        bibWatcher.on('unlink', (file: string) => this.onWatchedBibDeleted(file))
        return bibWatcher
    }

    private updateWatcherOptions() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        this.bibWatcher.options.usePolling = configuration.get('latex.watch.usePolling') as boolean
        this.bibWatcher.options.interval = configuration.get('latex.watch.interval') as number
        this.bibWatcher.options.binaryInterval = Math.max(configuration.get('latex.watch.interval') as number, 1000)
        this.bibWatcher.options.awaitWriteFinish = {stabilityThreshold: configuration.get('latex.watch.delay') as number}
    }

    private async onWatchedBibChanged(file: string) {
        this.extension.logger.addLogMessage(`Bib file watcher - file changed: ${file}`)
        await this.extension.completer.citation.parseBibFile(file)
        await this.extension.builder.buildOnFileChanged(file, true)
    }

    private onWatchedBibDeleted(file: string) {
        this.extension.logger.addLogMessage(`Bib file watcher - file deleted: ${file}`)
        this.bibWatcher.unwatch(file)
        this.bibsWatched.delete(file)
        this.extension.completer.citation.removeEntriesInFile(file)
    }

    async watchBibFile(bibPath: string) {
        if (!this.bibsWatched.has(bibPath)) {
            this.extension.logger.addLogMessage(`Added to bib file watcher: ${bibPath}`)
            this.bibWatcher.add(bibPath)
            this.bibsWatched.add(bibPath)
            await this.extension.completer.citation.parseBibFile(bibPath)
        }
    }

    logWatchedFiles() {
        this.extension.logger.addLogMessage(`BibWatcher.bibWatcher.getWatched: ${JSON.stringify(this.bibWatcher.getWatched())}`)
        this.extension.logger.addLogMessage(`BibWatcher.bibsWatched: ${JSON.stringify(Array.from(this.bibsWatched))}`)
    }

}
