import * as vscode from 'vscode'
import * as chokidar from 'chokidar'

import {Extension} from '../../main'

export class PdfWatcher {
    private readonly extension: Extension
    private pdfsWatched: string[] = []
    private pdfWatcher?: chokidar.FSWatcher
    private pdfWatcherOptions: chokidar.WatchOptions

    constructor(extension: Extension) {
        this.extension = extension
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const usePolling = configuration.get('latex.watch.usePolling') as boolean
        const interval = configuration.get('latex.watch.interval') as number
        const pdfDelay = configuration.get('latex.watch.pdfDelay') as number
        this.pdfWatcherOptions = {
            useFsEvents: false,
            usePolling,
            interval,
            binaryInterval: Math.max(interval, 1000),
            awaitWriteFinish: {stabilityThreshold: pdfDelay}
        }
        this.initiatePdfWatcher()
    }

    private initiatePdfWatcher() {
        if (this.pdfWatcher !== undefined) {
            return
        }
        this.extension.logger.addLogMessage('Creating PDF file watcher.')
        this.pdfWatcher = chokidar.watch([], this.pdfWatcherOptions)
        this.pdfWatcher.on('change', (file: string) => this.onWatchedPdfChanged(file))
        this.pdfWatcher.on('unlink', (file: string) => this.onWatchedPdfDeleted(file))
    }

    private onWatchedPdfChanged(file: string) {
        this.extension.logger.addLogMessage(`PDF file watcher - file changed: ${file}`)
        this.extension.viewer.refreshExistingViewer()
    }

    private onWatchedPdfDeleted(file: string) {
        this.extension.logger.addLogMessage(`PDF file watcher - file deleted: ${file}`)
        if (this.pdfWatcher) {
            this.pdfWatcher.unwatch(file)
        }
        this.pdfsWatched.splice(this.pdfsWatched.indexOf(file), 1)
    }

    watchPdfFile(pdfPath: string) {
        if (this.pdfWatcher && !this.pdfsWatched.includes(pdfPath)) {
            this.extension.logger.addLogMessage(`Added to PDF file watcher: ${pdfPath}`)
            this.pdfWatcher.add(pdfPath)
            this.pdfsWatched.push(pdfPath)
        }
    }

}
