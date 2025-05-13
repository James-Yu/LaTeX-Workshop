import * as vscode from 'vscode'
import * as path from 'path'
import { lw } from '../lw'

const logger = lw.log('Cacher', 'Watcher')

class Watcher {
    /**
     * Map of folder paths to watcher information. Each folder has its own
     * watcher to save resources.
     */
    private get watchers() {
        return this._watchers
    }
    private readonly _watchers: {[folder: string]: {watcher: vscode.FileSystemWatcher, files: Set<string>}} = {}

    /**
     * Set of handlers to be called when a file is created.
     */
    private get onCreateHandlers() {
        return this._onCreateHandlers
    }
    private readonly _onCreateHandlers: Set<(uri: vscode.Uri) => void> = new Set()
    /**
     * Set of handlers to be called when a file is changed.
     */
    private get onChangeHandlers() {
        return this._onChangeHandlers
    }
    private readonly _onChangeHandlers: Set<(uri: vscode.Uri) => void> = new Set()
    /**
     * Set of handlers to be called when a file is deleted.
     */
    private get onDeleteHandlers() {
        return this._onDeleteHandlers
    }
    private readonly _onDeleteHandlers: Set<(uri: vscode.Uri) => void> = new Set()
    /**
     * Map of file paths to polling information. This may be of particular use
     * when large binary files are progressively write to disk, and multiple
     * 'change' events are therefore emitted in a short period of time.
     */
    private readonly polling: {[uriString: string]: {time: number, size: number}} = {}

    /**
     * Creates a new Watcher instance.
     *
     * @param {'.*' | '.bib' | '.pdf'} [fileExt='.*'] - The file extension to watch.
     */
    constructor(readonly fileExt: '.*' | '.bib' | '.pdf' = '.*') {}

    /**
     * Adds a handler for file creation events.
     *
     * @param {(uri: vscode.Uri) => void} handler - The handler function.
     */
    onCreate(handler: (uri: vscode.Uri) => void) {
        this.onCreateHandlers.add(handler)
    }

    /**
     * Adds a handler for file change events.
     *
     * @param {(uri: vscode.Uri) => void} handler - The handler function.
     */
    onChange(handler: (uri: vscode.Uri) => void) {
        this.onChangeHandlers.add(handler)
    }

    /**
     * Adds a handler for file deletion events.
     *
     * @param {(uri: vscode.Uri) => void} handler - The handler function.
     */
    onDelete(handler: (uri: vscode.Uri) => void) {
        this.onDeleteHandlers.add(handler)
    }

    /**
     * Creates a new file system watcher based on the provided glob pattern.
     *
     * @param {vscode.GlobPattern} globPattern - The glob pattern for the
     * watcher.
     * @returns {vscode.FileSystemWatcher} - The created file system watcher.
     */
    private createWatcher(globPattern: vscode.GlobPattern): vscode.FileSystemWatcher {
        const watcher = vscode.workspace.createFileSystemWatcher(globPattern)
        watcher.onDidCreate((uri: vscode.Uri) => this.onDidChange('create', uri))
        watcher.onDidChange((uri: vscode.Uri) => this.onDidChange('change', uri))
        watcher.onDidDelete((uri: vscode.Uri) => this.onDidDelete(uri))
        return watcher
    }

    /**
     * Handles file change events.
     *
     * @param {'create' | 'change'} event - The type of event.
     * @param {vscode.Uri} uri - The URI of the changed file.
     */
    private async onDidChange(event: 'create' | 'change', uri: vscode.Uri): Promise<void> {
        const folder = path.dirname(uri.fsPath)
        const fileName = path.basename(uri.fsPath)
        const watcherInfo = this.watchers[folder]

        if (!watcherInfo?.files.has(fileName)) {
            return
        }

        if (!lw.file.hasBinaryExt(path.extname(uri.fsPath))) {
            this.handleNonBinaryFileChange(event, uri)
        } else if (!this.polling[uri.toString(true)]) {
            await this.initiatePolling(uri)
        }
    }

    /**
     * Handles non-binary file (e.g., TeX and Bib) change events.
     *
     * @param {'create' | 'change'} event - The type of event.
     * @param {vscode.Uri} uri - The URI of the changed file.
     */
    private handleNonBinaryFileChange(event: string, uri: vscode.Uri): void {
        const uriString = uri.toString(true)
        logger.log(`"${event}" emitted on ${uriString}.`)
        this.onChangeHandlers.forEach(handler => handler(uri))
        lw.event.fire(lw.event.FileChanged, uriString)
    }

    /**
     * Initiates polling for a binary file.
     *
     * This function is triggered when a non-binary file is changed, and polling
     * is required to accurately detect the change. It sets up an interval to
     * periodically check for changes in the file's size. When a change is
     * detected, the `handlePolling` function is called to further validate the
     * change and trigger the appropriate handlers.
     *
     * @param {vscode.Uri} uri - The URI of the changed file.
     */
    private async initiatePolling(uri: vscode.Uri): Promise<void> {
        const uriString = uri.toString(true)
        const firstChangeTime = Date.now()
        const size = (await lw.external.stat(uri)).size

        this.polling[uriString] = { size, time: firstChangeTime }

        const pollingInterval = setInterval(() => {
            void this.handlePolling(uri, firstChangeTime, pollingInterval)
        }, vscode.workspace.getConfiguration('latex-workshop').get('latex.watch.pdf.delay') as number)
    }

    /**
     * Handles polling.
     *
     * This function is responsible for polling a file to accurately detect
     * changes when the file is non-binary and other events have initiated
     * polling. It compares the current size of the file with the recorded size
     * during the initiation of polling. If the size remains unchanged for a
     * specified time (200 milliseconds), it is considered a valid change, and
     * the appropriate handlers are triggered.
     *
     * @param {vscode.Uri} uri - The uri of the changed file.
     * @param {number} firstChangeTime - The timestamp of the first change.
     * @param {NodeJS.Timeout} interval - The polling interval.
     */
    private async handlePolling(uri: vscode.Uri, firstChangeTime: number, interval: NodeJS.Timeout): Promise<void> {
        const uriString = uri.toString(true)
        if (!await lw.file.exists(uri)) {
            clearInterval(interval)
            delete this.polling[uriString]
            return
        }

        // Resume vscode may cause accidental "change", do nothing
        if (!(uriString in this.polling)) {
            clearInterval(interval)
            return
        }

        const currentSize = (await lw.external.stat(uri)).size

        if (currentSize !== this.polling[uriString].size) {
            this.polling[uriString].size = currentSize
            this.polling[uriString].time = Date.now()
            return
        }

        if (Date.now() - this.polling[uriString].time >= 200) {
            logger.log(`"change" emitted on ${uriString} after polling for ${Date.now() - firstChangeTime} ms.`)
            clearInterval(interval)
            delete this.polling[uriString]
            this.onChangeHandlers.forEach(handler => handler(uri))
            lw.event.fire(lw.event.FileChanged, uriString)
        }
    }

    /**
     * Handles file deletion events.
     *
     * @param {vscode.Uri} uri - The URI of the deleted file.
     */
    private async onDidDelete(uri: vscode.Uri): Promise<void> {
        const folder = path.dirname(uri.fsPath)
        const fileName = path.basename(uri.fsPath)
        const watcherInfo = this.watchers[folder]

        if (!watcherInfo?.files.has(fileName)) {
            return
        }

        const uriString = uri.toString(true)
        logger.log(`"delete" emitted on ${uriString}.`)
        return new Promise(resolve => {
            setTimeout(async () => {
                if (await lw.file.exists(uri)) {
                    logger.log(`File deleted and re-created: ${uriString} .`)
                    resolve()
                    return
                }
                logger.log(`File deletion confirmed: ${uriString} .`)
                this.onDeleteHandlers.forEach(handler => handler(uri))
                watcherInfo.files.delete(fileName)

                if (watcherInfo.files.size === 0) {
                    this.disposeWatcher(folder)
                }

                lw.event.fire(lw.event.FileRemoved, uriString)
                resolve()
            }, vscode.workspace.getConfiguration('latex-workshop').get('latex.watch.delay') as number)
        })
    }

    /**
     * Disposes of a watcher for a specific folder.
     *
     * @param {string} folder - The path of the folder.
     */
    private disposeWatcher(folder: string): void {
        const watcherInfo = this.watchers[folder]
        watcherInfo.watcher.dispose()
        delete this.watchers[folder]
        logger.log(`Unwatched folder ${folder}.`)
    }

    /**
     * Adds a file to be watched.
     *
     * This function is responsible for adding a file to the list of watched
     * files. It checks whether a watcher for the file's folder already exists.
     * If not, a new watcher is created for the folder, and the file is added to
     * the set of files being watched. If a watcher already exists, the file is
     * simply added to the set of files being watched by the existing watcher.
     *
     * @param {vscode.Uri} uri - The uri of the file to watch.
     */
    add(uri: vscode.Uri) {
        const fileName = path.basename(uri.fsPath)
        const folder = path.dirname(uri.fsPath)
        if (!this.watchers[folder]) {
            this.watchers[folder] = {
                watcher: this.createWatcher(new vscode.RelativePattern(folder, `*${this.fileExt}`)),
                files: new Set([fileName])
            }
            this.onCreateHandlers.forEach(handler => handler(uri))
            logger.log(`Watched ${uri.toString(true)} with a new ${this.fileExt} watcher on ${folder} .`)
        } else {
            this.watchers[folder].files.add(fileName)
            this.onCreateHandlers.forEach(handler => handler(uri))
            logger.log(`Watched ${uri.toString(true)} by the ${this.fileExt} watcher.`)
        }
        lw.event.fire(lw.event.FileWatched, uri.toString(true))
    }

    /**
     * Removes a file from being watched.
     *
     * @param {vscode.Uri} uri - The uri of the file to stop watching.
     */
    remove(uri: vscode.Uri) {
        this.watchers[path.dirname(uri.fsPath)]?.files.delete(path.basename(uri.fsPath))
    }

    /**
     * Checks if a file is currently being watched.
     *
     * @param {vscode.Uri} uri - The uri of the file to check.
     * @returns {boolean} - Indicates whether the file is being watched.
     */
    has(uri: vscode.Uri): boolean {
        return this.watchers[path.dirname(uri.fsPath)]?.files.has(path.basename(uri.fsPath))
    }

    /**
     * Resets all watchers.
     */
    reset() {
        Object.entries(this.watchers).forEach(([folder, watcher]) => {
            watcher.watcher.dispose()
            delete this.watchers[folder]
        })
        logger.log('Reset.')
    }
}

export const watcher = {
    src: new Watcher(),
    pdf: new Watcher('.pdf'),
    bib: new Watcher('.bib'),
    glossary: new Watcher('.bib')
}
