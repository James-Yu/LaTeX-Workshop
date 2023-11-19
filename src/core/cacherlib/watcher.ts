import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { lw } from '../../lw'
import * as eventbus from '../event-bus'
import { getLogger } from '../../utils/logging/logger'
import { isBinary } from '../root-file'

const logger = getLogger('Cacher', 'Watcher')

export class Watcher {
    private readonly watchers: {[folder: string]: {watcher: vscode.FileSystemWatcher, files: Set<string>}} = {}
    private readonly onCreateHandlers: Set<(filePath: string) => void> = new Set()
    private readonly onChangeHandlers: Set<(filePath: string) => void> = new Set()
    private readonly onDeleteHandlers: Set<(filePath: string) => void> = new Set()
    private readonly polling: {[filePath: string]: {time: number, size: number}} = {}

    constructor(private readonly fileExt: string = '.*') {}

    onCreate(handler: (filePath: string) => void) {
        this.onCreateHandlers.add(handler)
    }

    onChange(handler: (filePath: string) => void) {
        this.onChangeHandlers.add(handler)
    }

    onDelete(handler: (filePath: string) => void) {
        this.onDeleteHandlers.add(handler)
    }

    private createWatcher(globPattern: vscode.GlobPattern): vscode.FileSystemWatcher {
        const watcher = vscode.workspace.createFileSystemWatcher(globPattern)
        watcher.onDidCreate((uri: vscode.Uri) => this.onDidChange('create', uri))
        watcher.onDidChange((uri: vscode.Uri) => this.onDidChange('change', uri))
        watcher.onDidDelete((uri: vscode.Uri) => {
            const fileName = path.basename(uri.fsPath)
            const folder = path.dirname(uri.fsPath)
            if (!this.watchers[folder]?.files.has(fileName)){
                return
            }
            logger.log(`"delete" emitted on ${uri.fsPath} .`)
            this.onDeleteHandlers.forEach(handler => handler(uri.fsPath))
            this.watchers[folder].files.delete(fileName)
            if (this.watchers[folder].files.size === 0) {
                this.watchers[folder].watcher.dispose()
                delete this.watchers[folder]
                logger.log(`Unwatched folder ${folder} .`)
            }
            lw.eventBus.fire(eventbus.FileRemoved, uri.fsPath)
        })
        return watcher
    }

    private onDidChange(event: string, uri: vscode.Uri) {
        if (!this.watchers[path.dirname(uri.fsPath)]?.files.has(path.basename(uri.fsPath))) {
            return
        }
        if (!isBinary(path.extname(uri.fsPath))) {
            logger.log(`"${event}" emitted on ${uri.fsPath} .`)
            this.onChangeHandlers.forEach(handler => handler(uri.fsPath))
            lw.eventBus.fire(eventbus.FileChanged, uri.fsPath)
            return
        }
        // Another event has initiated a polling on the file, just ignore this
        if (this.polling[uri.fsPath] !== undefined) {
            return
        }
        const firstChangeTime = Date.now()
        this.polling[uri.fsPath] = { size: fs.statSync(uri.fsPath).size, time: firstChangeTime }
        const polling = this.polling[uri.fsPath]
        const pollingInterval = setInterval(() => {
            // If does not exist, don't emit create/change
            if (!fs.existsSync(uri.fsPath)) {
                clearInterval(pollingInterval)
                delete this.polling[uri.fsPath]
                return
            }
            // Save the size
            const size = fs.statSync(uri.fsPath).size
            // Update the size and last change time
            if (size !== polling.size) {
                polling.size = size
                polling.time = Date.now()
                return
            }
            // Though size is not changed, the polling time is not met
            if (Date.now() - polling.time < 200) {
                return
            }
            logger.log(`"${event}" emitted on ${uri.fsPath} after polling for ${Date.now() - firstChangeTime} ms.`)
            clearInterval(pollingInterval)
            delete this.polling[uri.fsPath]
            this.onChangeHandlers.forEach(handler => handler(uri.fsPath))
            lw.eventBus.fire(eventbus.FileChanged, uri.fsPath)
        }, vscode.workspace.getConfiguration('latex-workshop').get('latex.watch.pdf.delay') as number)
    }

    add(filePath: string) {
        const fileName = path.basename(filePath)
        const folder = path.dirname(filePath)
        if (!this.watchers[folder]) {
            this.watchers[folder] = {
                watcher: this.createWatcher(new vscode.RelativePattern(folder, `*${this.fileExt}`)),
                files: new Set([fileName])
            }
            this.onCreateHandlers.forEach(handler => handler(filePath))
            logger.log(`Watched ${filePath} with a new watcher on ${folder} .`)
        } else {
            this.watchers[folder].files.add(fileName)
            this.onCreateHandlers.forEach(handler => handler(filePath))
            logger.log(`Watched ${filePath} .`)
        }
        lw.eventBus.fire(eventbus.FileWatched, filePath)
    }

    remove(filePath: string) {
        this.watchers[path.basename(filePath)]?.files.delete(path.basename(filePath))
    }

    has(filePath: string) {
        return this.watchers[path.dirname(filePath)]?.files.has(path.basename(filePath))
    }

    reset() {
        Object.entries(this.watchers).forEach(([folder, watcher]) => {
            watcher.watcher.dispose()
            delete this.watchers[folder]
        })
        logger.log('Reset.')
    }
}
