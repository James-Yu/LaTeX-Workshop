import * as utils from './utils.js'
import { getTrimValue, setTrimValue } from './trimming.js'
import { sendLog } from './connection.js'
import type { IPDFViewerApplication, IPDFViewerApplicationOptions } from './interface'
import type { PdfViewerParams } from '../../types/latex-workshop-protocol-types/index.js'

declare const pdfjsLib: any
declare const PDFViewerApplication: IPDFViewerApplication
declare const PDFViewerApplicationOptions: IPDFViewerApplicationOptions

let autoReloadEnabled = true
export function setAutoReloadEnabled(enabled: boolean) {
    autoReloadEnabled = enabled
}
export function getAutoReloadEnabled() {
    return autoReloadEnabled
}

let prevState: {
    page: number,
    trim: number,
    scale: string,
    scrollMode: number,
    sidebarView: number,
    spreadMode: number,
    scrollTop: number,
    scrollLeft: number
} | undefined

export async function refresh() {
    if (!getAutoReloadEnabled()) {
        sendLog('Auto reload temporarily disabled.')
        return
    }

    // Fail-safe. For unknown reasons, the pack may have null values #4076
    const currentState = {
        page: PDFViewerApplication.pdfViewer.currentPageNumber ?? prevState?.page,
        trim: getTrimValue(),
        scale: PDFViewerApplication.pdfViewer.currentScaleValue ?? prevState?.scale,
        scrollMode: PDFViewerApplication.pdfViewer.scrollMode ?? prevState?.scrollMode,
        sidebarView: PDFViewerApplication.pdfSidebar.visibleView ?? prevState?.sidebarView,
        spreadMode: PDFViewerApplication.pdfViewer.spreadMode ?? prevState?.spreadMode,
        scrollTop: (document.getElementById('viewerContainer') as HTMLElement).scrollTop ?? prevState?.scrollTop,
        scrollLeft: (document.getElementById('viewerContainer') as HTMLElement).scrollLeft ?? prevState?.scrollLeft
    }
    prevState = currentState

    // Note: without showPreviousViewOnLoad = false restoring the position after the refresh will fail if
    // the user has clicked on any link in the past (pdf.js will automatically navigate to that link).
    PDFViewerApplicationOptions.set('showPreviousViewOnLoad', false)

    // Override the spread mode specified in PDF documents with the current one.
    // https://github.com/James-Yu/LaTeX-Workshop/issues/1871
    if (typeof prevState.spreadMode === 'number') {
        PDFViewerApplicationOptions.set('spreadModeOnLoad', prevState.spreadMode)
    }

    const { encodedPath, docTitle } = utils.parseURL()
    // eslint-disable-next-line
    PDFViewerApplication.load(await pdfjsLib.getDocument(`/${utils.pdfFilePrefix}${encodedPath}`).promise)
    // reset the document title to the original value to avoid duplication
    document.title = docTitle
    PDFViewerApplicationOptions.setAll({ cMapUrl: '../cmaps/' })
}

export async function restoreState() {
    if (prevState === undefined) {
        await restoreDefault()
        return
    }

    if (prevState.page !== undefined) {
        PDFViewerApplication.pdfViewer.currentPageNumber = prevState.page
    }
    if (prevState.trim !== undefined) {
        setTrimValue(prevState.trim)
    }
    if (prevState.scale !== undefined) {
        PDFViewerApplication.pdfViewer.currentScaleValue = prevState.scale
    }
    if (prevState.sidebarView) {
        PDFViewerApplication.pdfSidebar.switchView(prevState.sidebarView)
    }
    if (typeof prevState.scrollMode === 'number' && PDFViewerApplication.pdfViewer.scrollMode !== prevState.scrollMode) {
        PDFViewerApplication.pdfViewer.scrollMode = prevState.scrollMode
    }
    if (typeof prevState.spreadMode === 'number' && PDFViewerApplication.pdfViewer.spreadMode !== prevState.spreadMode) {
        PDFViewerApplication.pdfViewer.spreadMode = prevState.spreadMode
    }

    const viewerContainer = document.getElementById('viewerContainer')!
    if (typeof prevState.scrollTop === 'number' && viewerContainer.scrollTop !== prevState.scrollTop) {
        viewerContainer.scrollTop = prevState.scrollTop
    }
    if (typeof prevState.scrollLeft === 'number' && viewerContainer.scrollLeft !== prevState.scrollLeft) {
        viewerContainer.scrollLeft = prevState.scrollLeft
    }
}

async function restoreDefault() {
    const params = await (await fetch('config.json')).json() as PdfViewerParams

    if (params.trim !== undefined) {
        setTrimValue(params.trim)
    }
    // By setting the scale, scaling will be invoked if necessary.
    // The scale can be a non-number one.
    if (params.scale !== undefined) {
        PDFViewerApplication.pdfViewer.currentScaleValue = params.scale
    }
    if (params.scrollMode !== undefined) {
        PDFViewerApplication.pdfViewer.scrollMode = params.scrollMode
    }
    if (params.spreadMode !== undefined) {
        PDFViewerApplication.pdfViewer.spreadMode = params.spreadMode
    }
}
