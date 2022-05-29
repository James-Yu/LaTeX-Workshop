import type {PageTrimmer} from './pagetrimmer.js'
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
    readonly pageTrimmer: PageTrimmer,
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
    | 'scroll'
    | 'scalechanged'
    | 'zoomin'
    | 'zoomout'
    | 'zoomreset'
    | 'scrollmodechanged'
    | 'spreadmodechanged'
    | 'pagenumberchanged'

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
        close: () => void,
        isOpen: boolean
    },
    open(filePath: string): Promise<void>
}

export interface IPDFViewerApplicationOptions {
    set(name: string, value: unknown): void,
    setAll(options: unknown): void
}
