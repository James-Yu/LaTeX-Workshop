import * as utils from './utils.js'
import type { IPDFViewerApplication, IPDFViewerApplicationOptions } from './interface'

declare const pdfjsLib: any
declare const PDFViewerApplication: IPDFViewerApplication
declare const PDFViewerApplicationOptions: IPDFViewerApplicationOptions

let viewerState: {
    scrollMode: number,
    sidebarView: number,
    spreadMode: number,
    scrollTop: number,
    scrollLeft: number
} | undefined

export async function refresh() {
    // Fail-safe. For unknown reasons, the pack may have null values #4076
    const currentState = {
        scrollMode: PDFViewerApplication.pdfViewer.scrollMode ?? viewerState?.scrollMode,
        sidebarView: PDFViewerApplication.pdfSidebar.visibleView ?? viewerState?.sidebarView,
        spreadMode: PDFViewerApplication.pdfViewer.spreadMode ?? viewerState?.spreadMode,
        scrollTop: (document.getElementById('viewerContainer') as HTMLElement).scrollTop ?? viewerState?.scrollTop,
        scrollLeft: (document.getElementById('viewerContainer') as HTMLElement).scrollLeft ?? viewerState?.scrollLeft
    }
    viewerState = currentState

    // Note: without showPreviousViewOnLoad = false restoring the position after the refresh will fail if
    // the user has clicked on any link in the past (pdf.js will automatically navigate to that link).
    PDFViewerApplicationOptions.set('showPreviousViewOnLoad', false)

    // Override the spread mode specified in PDF documents with the current one.
    // https://github.com/James-Yu/LaTeX-Workshop/issues/1871
    if (typeof viewerState.spreadMode === 'number') {
        PDFViewerApplicationOptions.set('spreadModeOnLoad', viewerState.spreadMode)
    }

    const { encodedPath, docTitle } = parseURL()
    // eslint-disable-next-line
    PDFViewerApplication.load(await pdfjsLib.getDocument(`/${utils.pdfFilePrefix}${encodedPath}`).promise)
    // reset the document title to the original value to avoid duplication
    document.title = docTitle
    initState()
}

export function initState() {
    if (viewerState === undefined) {
        return
    }

    if (viewerState.sidebarView) {
        PDFViewerApplication.pdfSidebar.switchView(viewerState.sidebarView)
    }
    if (typeof viewerState.scrollMode === 'number' && PDFViewerApplication.pdfViewer.scrollMode !== viewerState.scrollMode) {
        PDFViewerApplication.pdfViewer.scrollMode = viewerState.scrollMode
    }
    if (typeof viewerState.spreadMode === 'number' && PDFViewerApplication.pdfViewer.spreadMode !== viewerState.spreadMode) {
        PDFViewerApplication.pdfViewer.spreadMode = viewerState.spreadMode
    }

    const viewerContainer = document.getElementById('viewerContainer')!
    if (typeof viewerState.scrollTop === 'number' && viewerContainer.scrollTop !== viewerState.scrollTop) {
        viewerContainer.scrollTop = viewerState.scrollTop
    }
    if (typeof viewerState.scrollLeft === 'number' && viewerContainer.scrollLeft !== viewerState.scrollLeft) {
        viewerContainer.scrollLeft = viewerState.scrollLeft
    }
}

function parseURL(): { encodedPath: string, docTitle: string } {
    const query = document.location.search.substring(1)
    const parts = query.split('&')

    for (let i = 0, ii = parts.length; i < ii; ++i) {
        const param = parts[i].split('=')
        if (param[0].toLowerCase() === 'file') {
            const encodedPath = param[1].replace(utils.pdfFilePrefix, '')
            const pdfFileUri = utils.decodePath(encodedPath)
            const docTitle = pdfFileUri.split(/[\\/]/).pop() ?? 'Untitled PDF'
            return { encodedPath, docTitle }
        }
    }
    throw new Error('file not given in the query.')
}
