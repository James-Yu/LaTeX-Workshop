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

    /**
     * `cb` is called immediately before the viewer will starts.
     * Can be used to override the settings of PDFViewerApplication.
     */
    onWillStartPdfViewer(cb: (e: Event) => any): IDisposable,

    /**
     * `cb` is called after the viewer started.
     */
    onDidStartPdfViewer(cb: (e: Event) => any): IDisposable,

    /**
     * `cb` is called after a PDF document is loaded and reloaded.
     */
    onDidLoadPdfFile(cb: (e: Event) => any, option?: {once: boolean}): IDisposable,

    /**
     * `cb` is called after the a PDF document is rendered.
     */
    onDidRenderPdfFile(cb: (e: Event) => any, option?: {once: boolean}): IDisposable
}
