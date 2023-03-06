import type {ClientRequest} from '../../types/latex-workshop-protocol-types/index'
import type {SyncTex} from './synctex.js'
import type {ViewerHistory} from './viewerhistory.js'

export interface IDisposable {
    dispose(): unknown
}

export interface ILatexWorkshopPdfViewer {
    readonly documentTitle: string,
    readonly embedded: boolean,
    readonly encodedPdfFilePath: string,
    readonly pdfFileUri: string,
    readonly synctex: SyncTex,
    readonly viewerHistory: ViewerHistory,

    /**
     * `cb` is called after the viewer started.
     */
    onDidStartPdfViewer(cb: () => unknown): IDisposable,

    /**
     * `cb` is called after a PDF document is loaded and reloaded.
     */
    onPagesInit(cb: () => unknown, option?: {once: boolean}): IDisposable,

    /**
     * `cb` is called after the a PDF document is rendered.
     */
    onPagesLoaded(cb: () => unknown, option?: {once: boolean}): IDisposable,

    /**
     * `cb` is called after the a PDF document is rendered.
     */
    onPageRendered(cb: () => unknown, option?: {once: boolean}): IDisposable,

    /**
     * `cb` is called after the view is (re-)rendered.
     */
    onViewUpdated(cb: (payload: { source: IPDFViewer, location: IPDFViewerLocation }) => unknown, option?: {once: boolean}): IDisposable,

    onEvent(eventName: string, cb: () => unknown, option?: {once: boolean}): IDisposable,

    send(message: ClientRequest): void
}

export type PdfjsEventName = string
    // = 'documentloaded'
    // | 'pagesinit'
    // | 'pagesloaded'
    // | 'pagerendered'
    // | 'scroll'
    // | 'scalechanged'
    // | 'zoomin'
    // | 'zoomout'
    // | 'zoomreset'
    // | 'scrollmodechanged'
    // | 'spreadmodechanged'
    // | 'pagenumberchanged'
    // | 'updateviewarea'

export interface IPDFViewerApplication {
    eventBus: {
        on: (eventName: PdfjsEventName, listener: (payload: any) => void) => void,
        off: (eventName: PdfjsEventName, listener: (payload: any) => void) => void,
        dispatch: (eventName: string) => void
    },
    findBar: {
        opened: boolean,
        open(): void
    },
    initializedPromise: Promise<void>,
    isViewerEmbedded: boolean,
    pdfViewer: IPDFViewer,
    pdfCursorTools: {
        handTool: {
            activate(): void,
            deactivate(): void
        }
    },
    pdfSidebar: {
        isOpen: boolean,
        visibleView: number,
        switchView(view: number): void
    },
    secondaryToolbar: {
        close: () => void,
        isOpen: boolean
    },
    open(filePath: string): Promise<void>
}

export interface IPDFViewer {
    _currentScale: number,
    _currentPageNumber: number,
    _scrollMode: number,
    _spreadMode: number,
    _pageWidthScaleFactor: 1 | 2,
    _pages: {
        width: number,
        height: number,
        scale: number,
        viewport: {
            convertToViewportPoint(x: number, y: number): [number, number]
        },
        getPagePoint(x: number, y: number): [number, number]
    }[],
    _location: IPDFViewerLocation,
    currentScaleValue: string,
    isInPresentationMode: boolean,
    scrollMode: number,
    spreadMode: number,
    removePageBorders: boolean,
    refresh(noUpdate?: boolean, updateArgs?: any): void,
    update({scale = 0, rotation = null, optionalContentConfigPromise = null, drawingDelay = -1}): void
}

export interface IPDFViewerLocation {
    pageNumber: number,
    scale: number | string,
    top: number,
    left: number,
    rotation: number,
    pdfOpenParams: string
}

export interface IPDFViewerApplicationOptions {
    set(name: string, value: unknown): void,
    setAll(options: unknown): void
}
