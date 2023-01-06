import * as vscode from 'vscode'
import * as chokidar from 'chokidar'

import { Extension } from '../../main'
import * as eventbus from '../eventbus'
import { Cacher } from '../cacher'
import { canContext, isExcluded } from './cacherutils'
import { Logger } from '../logger'

export class Watcher {
    watcher: chokidar.FSWatcher
    readonly watched: Set<string> = new Set()

    constructor(
        private readonly extension: Extension,
        private readonly cacher: Cacher
    ) {
        this.watcher = chokidar.watch([], this.getWatcherOptions())
        this.initializeWatcher()
        this.registerOptionReload()
    }

    private initializeWatcher() {
        this.watcher.on('add', (file: string) => this.onAdd(file))
        this.watcher.on('change', (file: string) => this.onChange(file))
        this.watcher.on('unlink', (file: string) => this.onUnlink(file))
    }

    private getWatcherOptions() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        return {
            useFsEvents: false,
            usePolling: configuration.get('latex.watch.usePolling') as boolean,
            interval: configuration.get('latex.watch.interval') as number,
            binaryInterval: Math.max(configuration.get('latex.watch.interval') as number, 1000),
            awaitWriteFinish: {stabilityThreshold: configuration.get('latex.watch.delay') as number}
        }
    }

    add(filePath: string) {
        this.watcher.add(filePath)
        this.watched.add(filePath)
    }

    has(filePath: string) {
        return this.watched.has(filePath)
    }

    async reset() {
        await this.watcher.close()
        this.watched.clear()
        this.initializeWatcher()
    }

    private onAdd(filePath: string) {
        Logger.log(`[Cacher][Watcher] Watched ${filePath}.`)
        this.extension.eventBus.fire(eventbus.FileWatched, filePath)
    }

    private onChange(filePath: string) {
        if (canContext(filePath)) {
            void this.cacher.refreshContext(filePath)
        }
        void this.extension.builder.buildOnFileChanged(filePath)
        Logger.log(`[Cacher][Watcher] Changed ${filePath}.`)
        this.extension.eventBus.fire(eventbus.FileChanged, filePath)
    }

    private onUnlink(filePath: string) {
        this.watcher.unwatch(filePath)
        this.watched.delete(filePath)
        this.cacher.remove(filePath)
        if (filePath === this.extension.manager.rootFile) {
            Logger.log(`[Cacher][Watcher] Root deleted ${filePath}.`)
            this.extension.manager.rootFile = undefined
            void this.extension.manager.findRoot()
        } else {
            Logger.log(`[Cacher][Watcher] Deleted ${filePath}.`)
        }
        this.extension.eventBus.fire(eventbus.FileRemoved, filePath)
    }

    private registerOptionReload() {
        this.extension.context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
            if (e.affectsConfiguration('latex-workshop.latex.watch.usePolling') ||
                e.affectsConfiguration('latex-workshop.latex.watch.interval') ||
                e.affectsConfiguration('latex-workshop.latex.watch.delay')) {
                    void this.watcher.close()
                    this.watcher = chokidar.watch([], this.getWatcherOptions())
                    this.watched.forEach(filePath => this.watcher.add(filePath))
                    this.initializeWatcher()
            }
            if (e.affectsConfiguration('latex-workshop.latex.watch.files.ignore')) {
                this.watched.forEach(filePath => {
                    if (!isExcluded(filePath)) {
                        return
                    }
                    this.watcher.unwatch(filePath)
                    this.watched.delete(filePath)
                    this.cacher.remove(filePath)
                    Logger.log(`[Cacher][Watcher] Ignored ${filePath}.`)
                    void this.extension.manager.findRoot()
                })
            }
        }))
    }
}
