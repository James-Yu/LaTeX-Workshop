import {PageTrimmer} from './pagetrimmer.js'
import {SyncTex} from './synctex.js'
import {ViewerHistory} from './viewerhistory.js'

export interface IDisposable {
    dispose(): any
}

export interface ILatexWorkshopPdfViewer {
    readonly documentTitle: string,
    readonly embedded: boolean,
    readonly encodedPdfFilePath: string,
    readonly hideToolbarInterval: number | undefined,
    readonly pageTrimmer: PageTrimmer,
    readonly pdfFilePath: string,
    readonly server: string,
    readonly socket: WebSocket,
    readonly synctex: SyncTex,
    readonly viewerHistory: ViewerHistory,
    onWillStartPdfViewer(cb: (e: Event) => any): IDisposable,
    onDidStartPdfViewer(cb: (e: Event) => any): IDisposable,
    onDidLoadPdfFile(cb: (e: Event) => any, option?: {once: boolean}): IDisposable,
    onDidRenderPdfFile(cb: (e: Event) => any, option?: {once: boolean}): IDisposable
}
