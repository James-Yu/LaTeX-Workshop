import {PageTrimmer} from './pagetrimmer.js'
import {ClientRequest} from './protocol.js'
import {SyncTex} from './synctex.js'
import {ViewerHistory} from './viewerhistory.js'

export interface IDisposable {
    dispose(): any
}

export interface ILatexWorkshopPdfViewer {
    readonly documentTitle: string,
    readonly embedded: boolean,
    readonly encodedPdfFilePath: string,
    readonly pageTrimmer: PageTrimmer,
    readonly pdfFilePath: string,
    readonly server: string,
    readonly synctex: SyncTex,
    readonly viewerHistory: ViewerHistory,

    /**
     * `cb` is called immediately before the viewer will starts.
     * Can be used to override the settings of PDFViewerApplication.
     */
    onWillStartPdfViewer(cb: () => any): IDisposable,

    /**
     * `cb` is called after the viewer started.
     */
    onDidStartPdfViewer(cb: () => any): IDisposable,

    /**
     * `cb` is called after a PDF document is loaded and reloaded.
     */
    onDidLoadPdfFile(cb: () => any, option?: {once: boolean}): IDisposable,

    /**
     * `cb` is called after the a PDF document is rendered.
     */
    onDidRenderPdfFile(cb: () => any, option?: {once: boolean}): IDisposable,

    send(message: ClientRequest): void
}

export interface IPDFViewerApplication {
    eventBus: {
        on: (eventName: string, listener: () => void) => void,
        off: (eventName: string, listener: () => void) => void,
        dispatch: (eventName: string) => void
    },
    findBar: {
        opened: boolean,
        open(): void
    },
    initializedPromise: Promise<void>,
    isViewerEmbedded: boolean,
    pdfViewer: {
        _currentScale: number,
        _pages: {
            viewport: {
                convertToViewportPoint(x: number, y: number): [number, number]
            },
            getPagePoint(x: number, y: number): [number, number]
        }[],
        currentScaleValue: string,
        scrollMode: number,
        spreadMode: number
    },
    pdfCursorTools: {
        handTool: {
            activate(): void,
            deactivate(): void
        }
    },
    pdfSidebar: {
        isOpen: boolean
    },
    secondaryToolbar: {
        isOpen: boolean
    },
    open(filePath: string): Promise<void>
}

export interface IPDFViewerApplicationOptions {
    set(name: string, value: any): void
}
