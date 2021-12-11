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
    }

    initiateBibwatcher() {
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
        this.extension.logger.addLogMessage('Creating Bib file watcher.')
        this.extension.logger.addLogMessage(`watcherOptions: ${JSON.stringify(watcherOptions)}`)
        const bibWatcher = chokidar.watch([], watcherOptions)
        bibWatcher.on('change', (file: string) => this.onWatchedBibChanged(file))
        bibWatcher.on('unlink', (file: string) => this.onWatchedBibDeleted(file))
        return bibWatcher
    }

    private async onWatchedBibChanged(file: string) {
        this.extension.logger.addLogMessage(`Bib file watcher - file changed: ${file}`)
        await this.extension.completer.citation.parseBibFile(file)
        await this.extension.manager.buildOnFileChanged(file, true)
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
