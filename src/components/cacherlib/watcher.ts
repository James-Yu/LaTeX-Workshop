import * as vscode from 'vscode'
import * as path from 'path'
import * as lw from '../../lw'
import * as eventbus from '../eventbus'
import { getLogger } from '../logger'

const logger = getLogger('Cacher', 'Watcher')

export class Watcher {
    private readonly watchers: {[folder: string]: {watcher: vscode.FileSystemWatcher, files: Set<string>}} = {}
    private readonly onCreateHandlers: Set<(filePath: string) => void> = new Set()
    private readonly onChangeHandlers: Set<(filePath: string) => void> = new Set()
    private readonly onDeleteHandlers: Set<(filePath: string) => void> = new Set()

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
        watcher.onDidChange((uri: vscode.Uri) => {
            if (!this.watchers[path.dirname(uri.fsPath)]?.files.has(path.basename(uri.fsPath))){
                return
            }
            logger.log(`Changed ${uri.fsPath} .`)
            this.onChangeHandlers.forEach(handler => handler(uri.fsPath))
            lw.eventBus.fire(eventbus.FileChanged, uri.fsPath)
        })
        watcher.onDidDelete((uri: vscode.Uri) => {
            const fileName = path.basename(uri.fsPath)
            const folder = path.dirname(uri.fsPath)
            if (!this.watchers[folder]?.files.has(fileName)){
                return
            }
            logger.log(`Deleted ${uri.fsPath} .`)
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
