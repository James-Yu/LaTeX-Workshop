export type PdfjsEventName
    = 'documentloaded'
    | 'pagesinit'
    | 'pagesloaded'
    | 'scalechanged'
    | 'zoomin'
    | 'zoomout'
    | 'zoomreset'
    | 'scrollmodechanged'
    | 'spreadmodechanged'
    | 'pagenumberchanged'
    | 'rotationchanging'

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

export type PDFViewerApplicationOptionsType = {
    set(name: string, value: unknown): void,
    setAll(options: unknown): void
}
