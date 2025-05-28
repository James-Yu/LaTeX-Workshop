export type PdfjsEventName
    = 'documentloaded'
    | 'pagesinit'
    | 'pagesloaded'
    | 'pagerendered'
    | 'scalechanged'
    | 'zoomin'
    | 'zoomout'
    | 'zoomreset'
    | 'scrollmodechanged'
    | 'spreadmodechanged'
    | 'pagenumberchanged'
    | 'rotationchanging'
    | 'sidebarviewchanged'

type PDFViewerPage = {
    viewport: {
        rawDims: {
            pageHeight: number,
            pageWidth: number,
            pageX: number,
            pageY: number
        },
        rotation: number,
        convertToViewportPoint(x: number, y: number): [number, number]
    },
    canvas: HTMLCanvasElement | undefined,
    div: HTMLDivElement,
    getPagePoint(x: number, y: number): [number, number],
    get renderingState(): RenderingStates
}

export enum RenderingStates {
    INITIAL = 0,
    RUNNING = 1,
    PAUSED = 2,
    FINISHED = 3,
}

export type PDFViewerApplicationType = {
    eventBus: {
        on: (eventName: PdfjsEventName, listener: () => void) => void,
        off: (eventName: PdfjsEventName, listener: () => void) => void,
        dispatch: (eventName: string, payload: any) => void
    },
    findBar: {
        opened: boolean,
        open(): void
    },
    initializedPromise: Promise<void>,
    isViewerEmbedded: boolean,
    pdfViewer: {
        _currentScale: number,
        _getVisiblePages(): { first: number, last: number, views: { id: number, x: number, y: number, view: PDFViewerPage, percent: number }[], ids: Set<number> },
        _pages: PDFViewerPage[],
        currentPageNumber: number,
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
        switchView(view: number): void,
        open(): void,
        close(): void
    },
    secondaryToolbar: {
        close: () => void,
        isOpen: boolean
    },
    load(doc: any): void
}

export type PDFViewerApplicationOptionsType = {
    set(name: string, value: unknown): void,
    setAll(options: unknown): void
}
