import * as vscode from 'vscode'
import * as path from 'path'
import { lw } from '../lw'

const logger = lw.log('Cacher', 'Watcher')

class Watcher {
    /**
     * Map of folder paths to watcher information. Each folder has its own
     * watcher to save resources.
     */
    private readonly watchers: {[folder: string]: {watcher: vscode.FileSystemWatcher, files: Set<string>}} = {}

    /**
     * Set of handlers to be called when a file is created.
     */
    private readonly onCreateHandlers: Set<(filePath: string) => void> = new Set()
    /**
     * Set of handlers to be called when a file is changed.
     */
    private readonly onChangeHandlers: Set<(filePath: string) => void> = new Set()
    /**
     * Set of handlers to be called when a file is deleted.
     */
    private readonly onDeleteHandlers: Set<(filePath: string) => void> = new Set()
    /**
     * Map of file paths to polling information. This may be of particular use
     * when large binary files are progressively write to disk, and multiple
     * 'change' events are therefore emitted in a short period of time.
     */
    private readonly polling: {[filePath: string]: {time: number, size: number}} = {}

    readonly _test = {
        handlers: {
            onCreateHandlers: this.onCreateHandlers,
            onChangeHandlers: this.onChangeHandlers,
            onDeleteHandlers: this.onDeleteHandlers,
        },
        getWatchers: () => this.watchers,
        onDidChange: (...args: Parameters<Watcher['onDidChange']>) => this.onDidChange(...args),
        onDidDelete: (...args: Parameters<Watcher['onDidDelete']>) => this.onDidDelete(...args)
    }

    /**
     * Creates a new Watcher instance.
     *
     * @param {'.*' | '.bib' | '.pdf'} [fileExt='.*'] - The file extension to watch.
     */
    constructor(readonly fileExt: '.*' | '.bib' | '.pdf' = '.*') {}

    /**
     * Adds a handler for file creation events.
     *
     * @param {(filePath: string) => void} handler - The handler function.
     */
    onCreate(handler: (filePath: string) => void) {
        this.onCreateHandlers.add(handler)
    }

    /**
     * Adds a handler for file change events.
     *
     * @param {(filePath: string) => void} handler - The handler function.
     */
    onChange(handler: (filePath: string) => void) {
        this.onChangeHandlers.add(handler)
    }

    /**
     * Adds a handler for file deletion events.
     *
     * @param {(filePath: string) => void} handler - The handler function.
     */
    onDelete(handler: (filePath: string) => void) {
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
        } else if (!this.polling[uri.fsPath]) {
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
        const filePath = uri.fsPath
        logger.log(`"${event}" emitted on ${filePath}.`)
        this.onChangeHandlers.forEach(handler => handler(filePath))
        lw.event.fire(lw.event.FileChanged, filePath)
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
        const filePath = uri.fsPath
        const firstChangeTime = Date.now()
        const size = (await lw.external.stat(vscode.Uri.file(filePath))).size

        this.polling[filePath] = { size, time: firstChangeTime }

        const pollingInterval = setInterval(async () => {
            await this.handlePolling(filePath, size, firstChangeTime, pollingInterval)
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
     * @param {string} filePath - The path of the changed file.
     * @param {number} size - The size of the file.
     * @param {number} firstChangeTime - The timestamp of the first change.
     * @param {NodeJS.Timeout} interval - The polling interval.
     */
    private async handlePolling(filePath: string, size: number, firstChangeTime: number, interval: NodeJS.Timeout): Promise<void> {
        if (!await lw.file.exists(filePath)) {
            clearInterval(interval)
            delete this.polling[filePath]
            return
        }

        const currentSize = (await lw.external.stat(vscode.Uri.file(filePath))).size

        if (currentSize !== size) {
            this.polling[filePath].size = currentSize
            this.polling[filePath].time = Date.now()
            return
        }

        if (Date.now() - this.polling[filePath].time >= 200) {
            logger.log(`"change" emitted on ${filePath} after polling for ${Date.now() - firstChangeTime} ms.`)
            clearInterval(interval)
            delete this.polling[filePath]
            this.onChangeHandlers.forEach(handler => handler(filePath))
            lw.event.fire(lw.event.FileChanged, filePath)
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

        const filePath = uri.fsPath
        logger.log(`"delete" emitted on ${filePath}.`)
        return new Promise(resolve => {
            setTimeout(async () => {
                if (await lw.file.exists(filePath)) {
                    logger.log(`File deleted and re-created: ${filePath} .`)
                    resolve()
                    return
                }
                logger.log(`File deletion confirmed: ${filePath} .`)
                this.onDeleteHandlers.forEach(handler => handler(filePath))
                watcherInfo.files.delete(fileName)

                if (watcherInfo.files.size === 0) {
                    this.disposeWatcher(folder)
                }

                lw.event.fire(lw.event.FileRemoved, filePath)
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
     * @param {string} filePath - The path of the file to watch.
     */
    add(filePath: string) {
        const fileName = path.basename(filePath)
        const folder = path.dirname(filePath)
        if (!this.watchers[folder]) {
            this.watchers[folder] = {
                watcher: this.createWatcher(new vscode.RelativePattern(folder, `*${this.fileExt}`)),
                files: new Set([fileName])
            }
            this.onCreateHandlers.forEach(handler => handler(filePath))
            logger.log(`Watched ${filePath} with a new ${this.fileExt} watcher on ${folder} .`)
        } else {
            this.watchers[folder].files.add(fileName)
            this.onCreateHandlers.forEach(handler => handler(filePath))
            logger.log(`Watched ${filePath} by the ${this.fileExt} watcher.`)
        }
        lw.event.fire(lw.event.FileWatched, filePath)
    }

    /**
     * Removes a file from being watched.
     *
     * @param {string} filePath - The path of the file to stop watching.
     */
    remove(filePath: string) {
        this.watchers[path.dirname(filePath)]?.files.delete(path.basename(filePath))
    }

    /**
     * Checks if a file is currently being watched.
     *
     * @param {string} filePath - The path of the file to check.
     * @returns {boolean} - Indicates whether the file is being watched.
     */
    has(filePath: string): boolean {
        return this.watchers[path.dirname(filePath)]?.files.has(path.basename(filePath))
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
    bib: new Watcher('.bib')
}
