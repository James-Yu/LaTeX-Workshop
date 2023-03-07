export interface IDisposable {
    dispose(): unknown
}

export type PdfjsEventName
    = 'documentloaded'
    | 'pagesinit'
    | 'pagesloaded'
    | 'pagerendered'
    | 'updateviewarea'
    | 'spreadmodechanged'
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
