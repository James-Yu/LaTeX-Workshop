export interface IDisposable {
    dispose(): unknown
}

export interface ILatexWorkshopPdfViewer {
    readonly documentTitle: string,
    readonly embedded: boolean,
    readonly encodedPdfFilePath: string,
    readonly pdfFileUri: string
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

export type PDFViewerEventBus = {
    on: (eventName: PdfjsEventName, listener: () => void) => void,
    off: (eventName: PdfjsEventName, listener: () => void) => void,
    dispatch: (eventName: string, payload: any) => void
}

export interface IPDFViewerApplication {
    eventBus: PDFViewerEventBus,
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
                rotation: number,
                convertToViewportPoint(x: number, y: number): [number, number]
            },
            getPagePoint(x: number, y: number): [number, number]
        }[],
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
