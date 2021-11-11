import * as vscode from 'vscode'
import * as chokidar from 'chokidar'

import type {Extension} from '../../main'

export class PdfWatcher {
    private readonly extension: Extension
    private readonly pdfsWatched = new Set<string>()
    private readonly pdfWatcher: chokidar.FSWatcher
    readonly vscodeFsWatcher: vscode.FileSystemWatcher

    constructor(extension: Extension) {
        this.extension = extension
        this.pdfWatcher = this.initiatePdfWatcher()
        this.vscodeFsWatcher = this.initiateVscodeFsWatcher()
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

    private initiateVscodeFsWatcher() {
        const vscodeFsWatcher = vscode.workspace.createFileSystemWatcher('**/*.{pdf,PDF}', true)
        vscodeFsWatcher.onDidChange((ev) => {
            const isWatched = this.pdfsWatched.has(ev.toString(true))
            console.log(ev.toString())
            if (isWatched) {
                this.extension.viewer.refreshExistingViewer()
            }
        })
        return vscodeFsWatcher
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

    watchPdfFile(pdfFileUri: vscode.Uri) {
        const isLocal = this.extension.lwfs.isLocalUri(pdfFileUri)
        if (isLocal) {
            const pdfPath = pdfFileUri.fsPath
            if (!this.pdfsWatched.has(pdfPath)) {
                this.extension.logger.addLogMessage(`Added to PDF file watcher: ${pdfPath}`)
                this.pdfWatcher.add(pdfPath)
                this.pdfsWatched.add(pdfPath)
            }
        } else {
            this.pdfsWatched.add(pdfFileUri.toString(true))
        }
    }

    logWatchedFiles() {
        this.extension.logger.addLogMessage(`PdfWatcher.pdfWatcher.getWatched: ${JSON.stringify(this.pdfWatcher.getWatched())}`)
        this.extension.logger.addLogMessage(`PdfWatcher.pdfsWatched: ${JSON.stringify(Array.from(this.pdfsWatched))}`)
    }

}
