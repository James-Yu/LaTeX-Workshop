import { EventEmitter } from 'events'
import type { PdfViewerState } from '../../types/latex-workshop-protocol-types/index'
import type { Disposable } from 'vscode'

import { lw } from '../lw'

const logger = lw.log('Event')

export enum Events {
    BuildDone = 'BUILD_DONE',
    AutoBuildInitiated = 'AUTO_BUILD_INITIATED',
    RootFileChanged = 'ROOT_FILE_CHANGED',
    RootFileSearched = 'ROOT_FILE_SEARCHED',
    FileParsed = 'FILE_PARSED',
    ViewerPageLoaded = 'VIEWER_PAGE_LOADED',
    ViewerStatusChanged = 'VIEWER_STATUS_CHANGED',
    FileWatched = 'FILE_WATCHED',
    FileChanged = 'FILE_CHANGED',
    FileRemoved = 'FILE_REMOVED',
    DocumentChanged = 'DOCUMENT_CHANGED',
    StructureUpdated = 'STRUCTURE_UPDATED',
    AutoCleaned = 'AUTO_CLEANED'
}

export const event = {
    ...Events,
    on,
    fire,
    dispose
}

export type EventArgs = {
    [Events.AutoBuildInitiated]: {type: 'onFileChange' | 'onSave', file: string},
    [Events.RootFileChanged]: string,
    [Events.FileParsed]: string,
    [Events.ViewerStatusChanged]: PdfViewerState,
    [Events.FileWatched]: string,
    [Events.FileChanged]: string,
    [Events.FileRemoved]: string
}

const eventEmitter = new EventEmitter()

function dispose() {
    eventEmitter.removeAllListeners()
}


function fire<T extends keyof EventArgs>(eventName: T, arg: EventArgs[T]): void
function fire(eventName: Events): void
function fire(eventName: Events, arg?: any): void {
    if (![Events.DocumentChanged, Events.ViewerStatusChanged].includes(eventName)) {
        logger.log(eventName + (arg ? `: ${JSON.stringify(arg)}` : ''))
    }
    eventEmitter.emit(eventName, arg)
}

function on(eventName: Events, cb: (arg?: any) => void): Disposable {
    eventEmitter.on(eventName, cb)
    const disposable = {
        dispose: () => { eventEmitter.removeListener(eventName, cb) }
    }
    return disposable
}
