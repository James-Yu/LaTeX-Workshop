import * as chokidar from 'chokidar'

import type {Extension} from '../../main'

export abstract class Cacher<CacheType> {
    protected readonly extension: Extension
    private readonly watcher: chokidar.FSWatcher
    protected readonly cache = Object.create(null) as {[filepath: string]: CacheType}
    private readonly onAddedCallbacks = new Set<(file: string) => void>()
    private readonly tag: string

    constructor(extension: Extension, watcher: chokidar.FSWatcher, tag: string) {
        this.extension = extension
        this.watcher = watcher
        this.registerOnDeleted((file: string) => this.onDeleted(file))
        this.registerOnChanged((file: string) => this.onChanged(file))
        this.tag = tag
    }

    /**
     * Add a new file to the watcher, and parse the content.
     * @param file The full path to the file.
     * @returns `CacheType` if the file is added and watched, `undefined` if it
     * exists.
     */
    async add(file: string): Promise<CacheType | undefined> {
        if (this.isCached(file)) {
            return undefined
        }
        this.extension.logger.addLogMessage(`${this.tag} cacher file ADDED: ${file}`)
        this.watcher.add(file)
        this.cache[file] = await this.parse(file)
        this.onAddedCallbacks.forEach(cb => cb(file))
        return this.cache[file]
    }

    /**
     * Get the cached content of a file given its path.
     * @param file The path of the file to retrieve.
     * @param add Whether add the file if it has NOT been cached. Default is
     * `false`.
     * @returns `CacheType` if the file has been cached or added with `add` set
     * to `true`, otherwise `undefined`.
     */
    async get(file: string, add: boolean = false): Promise<CacheType | undefined> {
        if (add && !this.isCached(file)) {
            await this.add(file)
        }
        return this.cache[file]
    }

    private isCached(file: string): boolean {
        return this.getCached().includes(file)
    }

    private getCached(): string[] {
        return Object.keys(this.cache)
    }

    /**
     * Remove the cached content of a file given its path.
     * @param file The path of the file to remove from the cache.
     * @returns The removed cache if the file has been cached, otherwise
     * `undefined`.
     */
    remove(file: string): CacheType | undefined {
        if (!this.isCached(file)) {
            return undefined
        }
        this.onDeleted(file)
        const cachedContent = this.cache[file]
        return cachedContent
    }

    dispose() {
        this.watcher.close().catch((e) => {
            this.extension.logger.addLogMessage(
                `Error occurred when disposing BiBTeX file watcher: ${JSON.stringify(e)}`)
        })
    }

    registerOnAdded(cb: (file: string) => void) {
        this.onAddedCallbacks.add(cb)
    }

    registerOnDeleted(cb: (file: string) => void) {
        this.watcher.on('unlink', cb)
    }

    registerOnChanged(cb: (file: string) => void) {
        this.watcher.on('change', cb)
    }

    log() {
        this.extension.logger.addLogMessage(
            `BiBTeX Watcher: ${JSON.stringify(this.watcher.getWatched())}`)
        this.extension.logger.addLogMessage(
            `BiBTeX Cacher: ${JSON.stringify(this.getCached())}`)
    }

    private onDeleted(file: string) {
        this.extension.logger.addLogMessage(`${this.tag} cacher file DELETED: ${file}`)
        this.watcher.unwatch(file)
        delete this.cache[file]
    }

    private async onChanged(file: string) {
        this.extension.logger.addLogMessage(`${this.tag} cacher file CHANGED: ${file}`)
        this.cache[file] = await this.parse(file)
    }

    protected abstract parse(file: string): Promise<CacheType>
}
