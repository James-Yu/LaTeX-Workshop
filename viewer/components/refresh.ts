import * as utils from './utils.js'
import { sendLog } from './connection.js'
import { viewerState, viewerStatePromise } from './state.js'
import { type PDFViewerApplicationType, type PDFViewerApplicationOptionsType, RenderingStates } from './interface.js'

declare const PDFViewerApplication: PDFViewerApplicationType
declare const PDFViewerApplicationOptions: PDFViewerApplicationOptionsType

let autoRefreshEnabled = true
export function IsAutoRefreshEnabled() {
    return autoRefreshEnabled
}
export function toggleAutoRefresh() {
    autoRefreshEnabled = !autoRefreshEnabled
    return autoRefreshEnabled
}

let prevState: {
    page: number,
    scale: string,
    scrollMode: number,
    sidebarView: number,
    spreadMode: number,
    scrollTop: number,
    scrollLeft: number
} | undefined

let refreshing = false
let shouldRefreshAgain = false
export async function refresh() {
    if (!IsAutoRefreshEnabled()) {
        sendLog('Auto reload temporarily disabled.')
        return
    }
    if (refreshing) {
        shouldRefreshAgain = true
        sendLog('Auto reload rate-limiting.')
        return
    }
    refreshing = true
    try {
        await PDFViewerApplication.initializedPromise
        await PDFViewerApplication.pdfLoadingTask?.promise.catch(() => {})
        await reloadDocument()
    } catch (error) {
        sendLog(`PDF refresh failed: ${String(error)}`)
    } finally {
        refreshing = false
        if (shouldRefreshAgain) {
            shouldRefreshAgain = false
            void refresh()
        }
    }
}

async function reloadDocument() {
    // Fail-safe. For unknown reasons, the pack may have null values #4076
    const currentState = {
        page: PDFViewerApplication.pdfViewer.currentPageNumber ?? prevState?.page,
        scale: PDFViewerApplication.pdfViewer.currentScaleValue ?? prevState?.scale,
        scrollMode: PDFViewerApplication.pdfViewer.scrollMode ?? prevState?.scrollMode,
        sidebarView: PDFViewerApplication.viewsManager.visibleView ?? prevState?.sidebarView,
        spreadMode: PDFViewerApplication.pdfViewer.spreadMode ?? prevState?.spreadMode,
        scrollTop: document.getElementById('viewerContainer')!.scrollTop ?? prevState?.scrollTop,
        scrollLeft: document.getElementById('viewerContainer')!.scrollLeft ?? prevState?.scrollLeft
    }
    prevState = currentState

    // Without viewOnLoad = INITIAL (1), restoring the position after the refresh can fail if
    // the user has clicked on any link in the past (pdf.js will automatically navigate to that link).
    PDFViewerApplicationOptions.set('viewOnLoad', 1)

    // Override the spread mode specified in PDF documents with the current one.
    // https://github.com/James-Yu/LaTeX-Workshop/issues/1871
    if (typeof prevState.spreadMode === 'number') {
        PDFViewerApplicationOptions.set('spreadModeOnLoad', prevState.spreadMode)
    }

    const { encodedPath, docTitle } = utils.parseURL()
    const masks = addMasks()
    let renderTimeout = 0
    let onPageRendered: (() => void) | undefined
    try {
        // open() closes the previous document and destroys its loading task and worker.
        await PDFViewerApplication.open({ url: `${utils.pdfFilePrefix}${encodedPath}` })
        const rendered = new Promise<void>(resolve => {
            onPageRendered = () => {
                if (allPagesRendered()) {
                    resolve()
                }
            }
            PDFViewerApplication.eventBus.on('pagerendered', onPageRendered)
            onPageRendered()
        })
        await Promise.race([
            Promise.all([PDFViewerApplication.pdfViewer.pagesPromise, rendered]),
            new Promise<void>(resolve => { renderTimeout = window.setTimeout(resolve, 1000) })
        ])
    } finally {
        clearTimeout(renderTimeout)
        if (onPageRendered) {
            PDFViewerApplication.eventBus.off('pagerendered', onPageRendered)
        }
        removeMasks(masks)
        document.title = docTitle
    }
}

export async function restoreState() {
    if (prevState === undefined) {
        await restoreDefault()
        return
    }

    if (prevState.page !== undefined) {
        PDFViewerApplication.pdfViewer.currentPageNumber = prevState.page
    }
    if (prevState.scale !== undefined) {
        PDFViewerApplication.pdfViewer.currentScaleValue = prevState.scale
    }
    if (prevState.sidebarView) {
        PDFViewerApplication.viewsManager.switchView(prevState.sidebarView)
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
    const params = await utils.getParams()

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

    if (!utils.isEmbedded()) {
        return
    }

    await viewerStatePromise
    const viewerContainer = document.getElementById('viewerContainer')!
    if (typeof viewerState.scrollTop === 'number' && viewerContainer.scrollTop !== viewerState.scrollTop) {
        viewerContainer.scrollTop = viewerState.scrollTop
    }
    if (typeof viewerState.scrollLeft === 'number' && viewerContainer.scrollLeft !== viewerState.scrollLeft) {
        viewerContainer.scrollLeft = viewerState.scrollLeft
    }
}

function addMasks() {
    const viewerDom = document.getElementById('viewer')!
    const viewerContainer = document.getElementById('viewerContainer')!
    const masks: HTMLDivElement[] = []
    if (!viewerContainer || !viewerDom) {
        return masks
    }

    const visiblePages = PDFViewerApplication.pdfViewer._getVisiblePages()
    for (const visiblePage of visiblePages.views) {
        const canvas = visiblePage.view.canvas
        if (!canvas) {
            continue
        }

        const viewerBound = viewerDom.getBoundingClientRect()
        const pageBound = visiblePage.view.div.getBoundingClientRect()
        const canvasBound = canvas.getBoundingClientRect()

        const div = document.createElement('div')
        div.className = 'page-loading-mask'
        masks.push(div)
        div.style.display = 'none'
        div.style.left = pageBound.x - viewerBound.x + 'px'
        div.style.top = pageBound.y - viewerBound.y + 'px'
        div.style.width = pageBound.width + 'px'
        div.style.height = pageBound.height + 'px'

        const img = new Image()
        img.src = canvas.toDataURL() ?? ''
        img.style.left = canvasBound.x - pageBound.x + 'px'
        img.style.top = canvasBound.y - pageBound.y + 'px'
        img.style.width = canvasBound.width + 'px'
        img.style.height = canvasBound.height + 'px'

        div.appendChild(img)
        viewerContainer.appendChild(div)
        div.style.display = 'inherit'
    }
    return masks
}

function allPagesRendered() {
    return PDFViewerApplication.pdfViewer._getVisiblePages().views.every(view => view.view.renderingState === RenderingStates.FINISHED)
}

function removeMasks(masks: HTMLDivElement[]) {
    for (const mask of masks) {
        mask.classList.add('remove')
    }
    setTimeout(() => {
        for (const mask of masks) {
            mask.remove()
        }
    }, 250)
}
