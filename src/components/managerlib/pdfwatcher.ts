import * as vscode from 'vscode'
import * as chokidar from 'chokidar'

import type {Extension} from '../../main'

export class PdfWatcher {
    private readonly extension: Extension
    private readonly pdfsWatched = new Set<string>()
    private readonly pdfWatcher: chokidar.FSWatcher
    readonly vscodeFsWatcher: vscode.FileSystemWatcher
    private readonly pdfUrisWatched = new Set<string>()
    readonly ignoredPdfFiles = new Set<string>()

    constructor(extension: Extension) {
        this.extension = extension
        this.pdfWatcher = this.initiatePdfWatcher()
        this.vscodeFsWatcher = this.initiateVscodeFsWatcher()
    }

    private toKey(pdfFileUri: vscode.Uri) {
        return pdfFileUri.toString(true)
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

    private isIgnored(pdfFile: vscode.Uri | string): boolean {
        let pdfFileUri: vscode.Uri
        if (typeof pdfFile === 'string') {
            pdfFileUri = vscode.Uri.file(pdfFile)
        } else {
            pdfFileUri = pdfFile
        }
        const key = this.toKey(pdfFileUri)
        return this.ignoredPdfFiles.has(key)
    }

    private isWatched(pdfFile: vscode.Uri): boolean {
        const key = this.toKey(pdfFile)
        return this.pdfsWatched.has(key)
    }

    private initiateVscodeFsWatcher() {
        const vscodeFsWatcher = vscode.workspace.createFileSystemWatcher('**/*.{pdf,PDF}', true)
        vscodeFsWatcher.onDidChange((fileUri) => {
            if (this.isIgnored(fileUri)) {
                return
            }
            if (this.isWatched(fileUri)) {
                this.extension.viewer.refreshExistingViewer()
            }
        })
        vscodeFsWatcher.onDidDelete((fileUri) => {
            this.pdfsWatched.delete(this.toKey(fileUri))
        })
        return vscodeFsWatcher
    }

    private onWatchedPdfChanged(file: string) {
        if (this.isIgnored(file)) {
            return
        }
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
            const pdfFilePath = pdfFileUri.fsPath
            if (!this.pdfsWatched.has(pdfFilePath)) {
                this.extension.logger.addLogMessage(`Added to PDF file watcher: ${pdfFileUri.toString(true)}`)
                this.pdfWatcher.add(pdfFilePath)
                this.pdfsWatched.add(pdfFilePath)
            }
        } else {
            this.pdfUrisWatched.add(this.toKey(pdfFileUri))
        }
    }

    ignorePdfFile(pdfFileUri: vscode.Uri) {
        this.ignoredPdfFiles.add(this.toKey(pdfFileUri))
    }

    logWatchedFiles() {
        this.extension.logger.addLogMessage(`PdfWatcher.pdfWatcher.getWatched: ${JSON.stringify(this.pdfWatcher.getWatched())}`)
        this.extension.logger.addLogMessage(`PdfWatcher.pdfsWatched: ${JSON.stringify(Array.from(this.pdfsWatched))}`)
    }

}
