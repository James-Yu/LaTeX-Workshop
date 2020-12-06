import * as vscode from 'vscode'
import * as chokidar from 'chokidar'

import {Extension} from '../../main'

export class BibWatcher {
    private readonly extension: Extension
    private bibWatcher?: chokidar.FSWatcher
    private bibsWatched: string[] = []
    private watcherOptions: chokidar.WatchOptions

    constructor(extension: Extension) {
        this.extension = extension
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const usePolling = configuration.get('latex.watch.usePolling') as boolean
        const interval = configuration.get('latex.watch.interval') as number
        const delay = configuration.get('latex.watch.delay') as number
        this.watcherOptions = {
            useFsEvents: false,
            usePolling,
            interval,
            binaryInterval: Math.max(interval, 1000),
            awaitWriteFinish: {stabilityThreshold: delay}
        }
    }

    initiateBibWatcher() {
        if (this.bibWatcher !== undefined) {
            return
        }
        this.extension.logger.addLogMessage('Creating Bib file watcher.')
        this.bibWatcher = chokidar.watch([], this.watcherOptions)
        this.bibWatcher.on('change', (file: string) => this.onWatchedBibChanged(file))
        this.bibWatcher.on('unlink', (file: string) => this.onWatchedBibDeleted(file))
    }

    private onWatchedBibChanged(file: string) {
        this.extension.logger.addLogMessage(`Bib file watcher - file changed: ${file}`)
        this.extension.completer.citation.parseBibFile(file)
        this.extension.manager.buildOnFileChanged(file, true)
    }

    private onWatchedBibDeleted(file: string) {
        this.extension.logger.addLogMessage(`Bib file watcher - file deleted: ${file}`)
        if (this.bibWatcher) {
            this.bibWatcher.unwatch(file)
        }
        this.bibsWatched.splice(this.bibsWatched.indexOf(file), 1)
        this.extension.completer.citation.removeEntriesInFile(file)
    }

    watchBibFile(bibPath: string) {
        if (this.bibWatcher && !this.bibsWatched.includes(bibPath)) {
            this.extension.logger.addLogMessage(`Added to bib file watcher: ${bibPath}`)
            this.bibWatcher.add(bibPath)
            this.bibsWatched.push(bibPath)
            this.extension.completer.citation.parseBibFile(bibPath)
        }
    }

}
