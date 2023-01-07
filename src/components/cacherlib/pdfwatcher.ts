import * as vscode from 'vscode'
import * as chokidar from 'chokidar'

import type {Extension} from '../../main'
import { getLogger } from '../logger'

const logger = getLogger('Cacher', 'PDF')

export class PdfWatcher {
    private readonly watchedPdfLocalPaths = new Set<string>()
    private pdfWatcher: chokidar.FSWatcher
    private readonly watchedPdfVirtualUris = new Set<string>()
    private readonly ignoredPdfUris = new Set<string>()

    constructor(private readonly extension: Extension) {
        this.pdfWatcher = chokidar.watch([], this.getWatcherOptions())
        this.initializeWatcher()
        this.initiateVirtualUriWatcher()

        this.extension.context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
            if (e.affectsConfiguration('latex-workshop.latex.watch.usePolling') ||
                e.affectsConfiguration('latex-workshop.latex.watch.interval') ||
                e.affectsConfiguration('latex-workshop.latex.watch.pdf.delay')) {
                void this.pdfWatcher.close()
                this.pdfWatcher = chokidar.watch([], this.getWatcherOptions())
                this.watchedPdfLocalPaths.forEach(filePath => this.pdfWatcher.add(filePath))
                this.initializeWatcher()
            }
        }))
    }

    async dispose() {
        await this.pdfWatcher.close()
    }

    private toKey(fileUri: vscode.Uri) {
        return fileUri.toString(true)
    }

    private initializeWatcher() {
        this.pdfWatcher.on('change', (file: string) => this.onWatchedPdfChanged(file))
        this.pdfWatcher.on('unlink', (file: string) => this.onWatchedPdfDeleted(file))
    }

    private getWatcherOptions() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        return {
            useFsEvents: false,
            usePolling: configuration.get('latex.watch.usePolling') as boolean,
            interval: configuration.get('latex.watch.interval') as number,
            binaryInterval: Math.max(configuration.get('latex.watch.interval') as number, 1000),
            awaitWriteFinish: {stabilityThreshold: configuration.get('latex.watch.pdf.delay') as number}
        }
    }

    private isWatchedVirtualUri(fileUri: vscode.Uri): boolean {
        if (this.extension.lwfs.isVirtualUri(fileUri)) {
            const key = this.toKey(fileUri)
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

    private onWatchedPdfChanged(filePath: string) {
        if (this.isIgnored(filePath)) {
            return
        }
        this.extension.viewer.refreshExistingViewer(undefined, filePath)
        logger.log(`Changed ${filePath} .`)
    }

    private onWatchedPdfDeleted(filePath: string) {
        this.pdfWatcher.unwatch(filePath)
        this.watchedPdfLocalPaths.delete(filePath)
        logger.log(`Unlinked ${filePath} .`)
    }

    watchPdfFile(fileUri: vscode.Uri) {
        const isLocal = this.extension.lwfs.isLocalUri(fileUri)
        if (isLocal) {
            const pdfFilePath = fileUri.fsPath
            if (!this.watchedPdfLocalPaths.has(pdfFilePath)) {
                this.pdfWatcher.add(pdfFilePath)
                this.watchedPdfLocalPaths.add(pdfFilePath)
                logger.log(`Watched ${fileUri.toString(true)} .`)
            }
        } else {
            this.watchedPdfVirtualUris.add(this.toKey(fileUri))
            logger.log(`Watched ${this.toKey(fileUri)} .`)
        }
    }

    private isIgnored(file: vscode.Uri | string): boolean {
        let pdfFileUri: vscode.Uri
        if (typeof file === 'string') {
            pdfFileUri = vscode.Uri.file(file)
        } else {
            pdfFileUri = file
        }
        const key = this.toKey(pdfFileUri)
        return this.ignoredPdfUris.has(key)
    }

    ignorePdfFile(fileUri: vscode.Uri) {
        this.ignoredPdfUris.add(this.toKey(fileUri))
    }

    logWatchedFiles() {
        logger.log(`${JSON.stringify(this.pdfWatcher.getWatched())}`)
        logger.log(`${JSON.stringify(Array.from(this.watchedPdfLocalPaths))}`)
        logger.log(`${JSON.stringify(Array.from(this.watchedPdfVirtualUris))}`)
        logger.log(`${JSON.stringify(Array.from(this.ignoredPdfUris))}`)
    }

}
