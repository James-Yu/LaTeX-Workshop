import * as vscode from 'vscode'
import * as chokidar from 'chokidar'

import type {Extension} from '../../main'

export class PdfWatcher {
    private readonly extension: Extension
    private readonly watchedPdfLocalPaths = new Set<string>()
    private readonly pdfWatcher: chokidar.FSWatcher
    private readonly watchedPdfVirtualUris = new Set<string>()
    private readonly ignoredPdfUris = new Set<string>()

    constructor(extension: Extension) {
        this.extension = extension
        this.pdfWatcher = this.initiatePdfWatcher()
        this.initiateVirtualUriWatcher()
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

    private isWatchedVirtualUri(pdfFile: vscode.Uri): boolean {
        if (this.extension.lwfs.isVirtualUri(pdfFile)) {
            const key = this.toKey(pdfFile)
            return this.watchedPdfVirtualUris.has(key)
        } else {
            return false
        }
    }

    private initiateVirtualUriWatcher() {
        const virtualUriWatcher = vscode.workspace.createFileSystemWatcher('**/*.{pdf,PDF}', false, false, true)
        const cb = (fileUri: vscode.Uri) => {
            if (this.isIgnored(fileUri)) {
                return
            }
            if (this.isWatchedVirtualUri(fileUri)) {
                this.extension.viewer.refreshExistingViewer()
            }
        }
        // It is recommended to react to both change and create events.
        // See https://github.com/microsoft/vscode/issues/136460#issuecomment-982605100
        virtualUriWatcher.onDidChange(cb)
        virtualUriWatcher.onDidCreate(cb)
        return virtualUriWatcher
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
        this.watchedPdfLocalPaths.delete(file)
    }

    watchPdfFile(pdfFileUri: vscode.Uri) {
        const isLocal = this.extension.lwfs.isLocalUri(pdfFileUri)
        if (isLocal) {
            const pdfFilePath = pdfFileUri.fsPath
            if (!this.watchedPdfLocalPaths.has(pdfFilePath)) {
                this.extension.logger.addLogMessage(`Added to PDF file watcher: ${pdfFileUri.toString(true)}`)
                this.pdfWatcher.add(pdfFilePath)
                this.watchedPdfLocalPaths.add(pdfFilePath)
            }
        } else {
            this.watchedPdfVirtualUris.add(this.toKey(pdfFileUri))
        }
    }

    private isIgnored(pdfFile: vscode.Uri | string): boolean {
        let pdfFileUri: vscode.Uri
        if (typeof pdfFile === 'string') {
            pdfFileUri = vscode.Uri.file(pdfFile)
        } else {
            pdfFileUri = pdfFile
        }
        const key = this.toKey(pdfFileUri)
        return this.ignoredPdfUris.has(key)
    }

    ignorePdfFile(pdfFileUri: vscode.Uri) {
        this.ignoredPdfUris.add(this.toKey(pdfFileUri))
    }

    logWatchedFiles() {
        this.extension.logger.addLogMessage(`PdfWatcher.pdfWatcher.getWatched: ${JSON.stringify(this.pdfWatcher.getWatched())}`)
        this.extension.logger.addLogMessage(`PdfWatcher.pdfsWatched: ${JSON.stringify(Array.from(this.watchedPdfLocalPaths))}`)
    }

}
