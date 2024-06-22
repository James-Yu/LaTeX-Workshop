import * as utils from './utils.js'
import type { IPDFViewerApplication, IPDFViewerApplicationOptions } from './interface'
import { getTrimValue, setTrimValue } from './trimming.js'

declare const pdfjsLib: any
declare const PDFViewerApplication: IPDFViewerApplication
declare const PDFViewerApplicationOptions: IPDFViewerApplicationOptions

let prevState: {
    trimValue: number,
    scrollMode: number,
    sidebarView: number,
    spreadMode: number,
    scrollTop: number,
    scrollLeft: number
} | undefined

export async function refresh() {
    // Fail-safe. For unknown reasons, the pack may have null values #4076
    const currentState = {
        trimValue: getTrimValue(),
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

    const { encodedPath, docTitle } = parseURL()
    // eslint-disable-next-line
    PDFViewerApplication.load(await pdfjsLib.getDocument(`/${utils.pdfFilePrefix}${encodedPath}`).promise)
    // reset the document title to the original value to avoid duplication
    document.title = docTitle
}

export function restoreState() {
    if (prevState === undefined) {
        return
    }

    if (prevState.trimValue !== undefined) {
        setTrimValue(prevState.trimValue)
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
