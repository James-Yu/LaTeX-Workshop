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

    send(message: ClientRequest): void
}

export type PdfjsEventName
    = 'documentloaded'
    | 'pagesinit'
    | 'pagesloaded'
    | 'updateviewarea'
    | 'scroll'
    | 'scalechanged'
    | 'zoomin'
    | 'zoomout'
    | 'zoomreset'
    | 'scrollmodechanged'
    | 'spreadmodechanged'
    | 'pagenumberchanged'
    | 'rotationchanging'

export interface IPDFViewerApplication {
    eventBus: {
        on: (eventName: PdfjsEventName, listener: () => void) => void,
        off: (eventName: PdfjsEventName, listener: () => void) => void,
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
                rawDims: {
                    pageHeight: number,
                    pageWidth: number,
                    pageX: number,
                    pageY: number
                },
                convertToViewportPoint(x: number, y: number): [number, number]
            },
            getPagePoint(x: number, y: number): [number, number]
        }[],
        currentScaleValue: string,
        scrollMode: number,
        spreadMode: number
    },
    pdfCursorTools: {
        switchTool(tool: 0 | 1): void
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
    load(doc: any): void
}

export interface IPDFViewerApplicationOptions {
    set(name: string, value: unknown): void,
    setAll(options: unknown): void
}
