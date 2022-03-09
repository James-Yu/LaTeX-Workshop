import {EventEmitter} from 'stream'
import type {PdfViewerState} from 'viewer/components/protocol'
import type {Disposable} from 'vscode'

export const BuildFinished = 'buildfinished'
export const PdfViewerPagesLoaded = 'pdfviewerpagesloaded'
export const PdfViewerStatusChanged = 'pdfviewerstatuschanged'
export const RootFileChanged = 'rootfilechanged'
export const FindRootFileEnd = 'findrootfileend'
export const SyncTexForwardEnd = 'synctexforwardend'

type EventArgTypeMap = {
    [PdfViewerStatusChanged]: PdfViewerState,
    [RootFileChanged]: string
}

export type EventName = typeof BuildFinished
                    | typeof PdfViewerPagesLoaded
                    | typeof PdfViewerStatusChanged
                    | typeof RootFileChanged
                    | typeof FindRootFileEnd
                    | typeof SyncTexForwardEnd

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
        return this.registerLisneter('rootfilechanged', cb)
    }

    onDidEndFindRootFile(cb: () => void): Disposable {
        return this.registerLisneter('findrootfileend', cb)
    }

    onDidChangePdfViewerStatus(cb: (status: EventArgTypeMap['pdfviewerstatuschanged']) => void): Disposable {
        return this.registerLisneter('pdfviewerstatuschanged', cb)
    }

    private registerLisneter<T extends keyof EventArgTypeMap>(
        eventName: T,
        cb: (arg: EventArgTypeMap[T]) => void
    ): Disposable
    private registerLisneter<T extends EventName>(
        eventName: T,
        cb: () => void
    ): Disposable
    private registerLisneter<T extends EventName>(
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

}
