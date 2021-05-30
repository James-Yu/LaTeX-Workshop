import * as vscode from 'vscode'
import * as chokidar from 'chokidar'

import type {Extension} from '../../main'

export class PdfWatcher {
    private readonly extension: Extension
    private readonly pdfsWatched = new Set<string>()
    private readonly pdfWatcher: chokidar.FSWatcher

    constructor(extension: Extension) {
        this.extension = extension
        this.pdfWatcher = this.initiatePdfWatcher()
    }

    private initiatePdfWatcher() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const usePolling = configuration.get('latex.watch.usePolling') as boolean
        const interval = configuration.get('latex.watch.interval') as number
        const pdfDelay = configuration.get('latex.watch.pdfDelay') as number
        const pdfWatcherOptions = {
            useFsEvents: false,
            usePolling,
            interval,
            binaryInterval: Math.max(interval, 1000),
            awaitWriteFinish: {stabilityThreshold: pdfDelay}
        }
        this.extension.logger.addLogMessage('Creating PDF file watcher.')
        this.extension.logger.addLogMessage(`watcherOptions: ${JSON.stringify(pdfWatcherOptions)}`)
        const pdfWatcher = chokidar.watch([], pdfWatcherOptions)
        pdfWatcher.on('change', (file: string) => this.onWatchedPdfChanged(file))
        pdfWatcher.on('unlink', (file: string) => this.onWatchedPdfDeleted(file))
        return pdfWatcher
    }

    private onWatchedPdfChanged(file: string) {
        this.extension.logger.addLogMessage(`PDF file watcher - file changed: ${file}`)
        this.extension.viewer.refreshExistingViewer()
    }

    private onWatchedPdfDeleted(file: string) {
        this.extension.logger.addLogMessage(`PDF file watcher - file deleted: ${file}`)
        this.pdfWatcher.unwatch(file)
        this.pdfsWatched.delete(file)
    }

    watchPdfFile(pdfPath: string) {
        if (!this.pdfsWatched.has(pdfPath)) {
            this.extension.logger.addLogMessage(`Added to PDF file watcher: ${pdfPath}`)
            this.pdfWatcher.add(pdfPath)
            this.pdfsWatched.add(pdfPath)
        }
    }

}
