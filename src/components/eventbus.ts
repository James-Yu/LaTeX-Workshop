import {EventEmitter} from 'events'
import type {PdfViewerState} from '../../types/latex-workshop-protocol-types/index'
import type {Disposable} from 'vscode'

export const BuildFinished = 'buildfinished'
export const PdfViewerPagesLoaded = 'pdfviewerpagesloaded'
export const PdfViewerStatusChanged = 'pdfviewerstatuschanged'
export const RootFileChanged = 'rootfilechanged'
export const FindRootFileEnd = 'findrootfileend'
export const CachedContentUpdated = 'cachedcontentupdated'

type EventArgTypeMap = {
    [PdfViewerStatusChanged]: PdfViewerState,
    [RootFileChanged]: string
}

export type EventName = typeof BuildFinished
                    | typeof PdfViewerPagesLoaded
                    | typeof PdfViewerStatusChanged
                    | typeof RootFileChanged
                    | typeof FindRootFileEnd
                    | typeof CachedContentUpdated

export class EventBus {
    private readonly eventEmitter = new EventEmitter()

    dispose() {
        this.eventEmitter.removeAllListeners()
    }

    fire<T extends keyof EventArgTypeMap>(eventName: T, arg: EventArgTypeMap[T]): void
    fire(eventName: EventName): void
    fire(eventName: EventName, arg?: any): void {
        this.eventEmitter.emit(eventName, arg)
    }

    onDidChangeRootFile(cb: (rootFile: EventArgTypeMap['rootfilechanged']) => void): Disposable {
        return this.registerListener('rootfilechanged', cb)
    }

    onDidEndFindRootFile(cb: () => void): Disposable {
        return this.registerListener('findrootfileend', cb)
    }

    onDidUpdateCachedContent(cb: () => void): Disposable {
        return this.registerListener('cachedcontentupdated', cb)
    }

    onDidChangePdfViewerStatus(cb: (status: EventArgTypeMap['pdfviewerstatuschanged']) => void): Disposable {
        return this.registerListener('pdfviewerstatuschanged', cb)
    }

    private registerListener<T extends keyof EventArgTypeMap>(
        eventName: T,
        cb: (arg: EventArgTypeMap[T]) => void
    ): Disposable
    private registerListener<T extends EventName>(
        eventName: T,
        cb: () => void
    ): Disposable
    private registerListener<T extends EventName>(
        eventName: T,
        cb: (arg?: any) => void
    ): Disposable
     {
        this.eventEmitter.on(eventName, cb)
        const disposable = {
            dispose: () => { this.eventEmitter.removeListener(eventName, cb) }
        }
        return disposable
    }

    on(eventName: EventName, argCb: () => void) {
        const cb = () => argCb()
        this.eventEmitter.on(eventName, cb)
        const disposable = {
            dispose: () => { this.eventEmitter.removeListener(eventName, cb) }
        }
        return disposable
    }

}
