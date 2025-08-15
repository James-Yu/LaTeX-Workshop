import * as utils from './utils.js'
import type { PDFViewerApplicationType } from './interface'
import type { PanelManagerResponse, PdfViewerState } from '../../types/latex-workshop-protocol-types/index.js'
import { getTrimValue } from './trimming.js'
import { isSyncTeXEnabled, registerSyncTeX, setSyncTeXKey } from './synctex.js'
import { IsAutoRefreshEnabled } from './refresh.js'
import { sendPanel } from './connection.js'

declare const PDFViewerApplication: PDFViewerApplicationType

export let viewerState: PdfViewerState
let viewerStatePromiseResolve: () => void
export const viewerStatePromise = new Promise<void>(resolve => viewerStatePromiseResolve = resolve)

export function initUploadState() {
    window.addEventListener('message', (e) => {
        const data = e.data as PanelManagerResponse
        if (!data.type) {
            console.log('LateXWorkshopPdfViewer received a message of unknown type: ' + JSON.stringify(data))
            return
        }
        switch (data.type) {
            case 'restore_state': {
                viewerState = data.state
                viewerStatePromiseResolve()
                break
            }
            default: {
                break
            }
        }
    })

    window.addEventListener('scrollend', () => { uploadState() }, true)

    sendPanel({ type: 'initialized' })
}

export function uploadState() {
    const state: PdfViewerState = {
        pdfFileUri: utils.parseURL().pdfFileUri,
        scale: PDFViewerApplication.pdfViewer.currentScaleValue,
        trim: getTrimValue(),
        scrollMode: PDFViewerApplication.pdfViewer.scrollMode,
        sidebarView: PDFViewerApplication.pdfSidebar.visibleView,
        spreadMode: PDFViewerApplication.pdfViewer.spreadMode,
        scrollTop: document.getElementById('viewerContainer')!.scrollTop,
        scrollLeft: document.getElementById('viewerContainer')!.scrollLeft,
        synctexEnabled: isSyncTeXEnabled(),
        autoReloadEnabled: IsAutoRefreshEnabled()
    }
    sendPanel({type: 'state', state})
}

export async function setParams() {
    const params = await utils.getParams()

    const viewer = document.querySelector('#viewer') as HTMLHtmlElement
    const viewerContainer = document.querySelector('#viewerContainer') as HTMLHtmlElement
    const thumbnailView = document.querySelector('#thumbnailView') as HTMLHtmlElement
    const sidebarContent = document.querySelector('#sidebarContent') as HTMLHtmlElement

    if (params.sidebar.open === 'on' || params.sidebar.open === 'persist' && localStorage.getItem('lw-pdf-sidebar-open') === 'true') {
        PDFViewerApplication.pdfSidebar.open()
    } else if (params.sidebar.open === 'off' || params.sidebar.open === 'persist' && localStorage.getItem('lw-pdf-sidebar-open') === 'false') {
        PDFViewerApplication.pdfSidebar.close()
    }

    if (params.sidebar.view === 'thumbnails') {
        PDFViewerApplication.pdfSidebar.switchView(1)
    } else if (params.sidebar.view === 'outline') {
        PDFViewerApplication.pdfSidebar.switchView(2)
    } else if (params.sidebar.view === 'attachments') {
        PDFViewerApplication.pdfSidebar.switchView(3)
    } else if (params.sidebar.view === 'layers') {
        PDFViewerApplication.pdfSidebar.switchView(4)
    } else if (params.sidebar.view === 'persist') {
        PDFViewerApplication.pdfSidebar.switchView(parseInt(localStorage.getItem('lw-pdf-sidebar-view') ?? '1'))
    }

    PDFViewerApplication.pdfCursorTools.switchTool(params.hand ? 1 : 0)
    if (params.invertMode.enabled) {
        const { brightness, grayscale, hueRotate, invert, sepia } = params.invertMode
        const filter = `invert(${invert * 100}%) hue-rotate(${hueRotate}deg) grayscale(${grayscale}) sepia(${sepia}) brightness(${brightness})`
        viewer.style.filter = filter
        thumbnailView.style.filter = filter
        sidebarContent.style.background = 'var(--body-bg-color)'
    }

    const backgroundColor = utils.isPrefersColorSchemeDark(params.codeColorTheme) ? params.color.dark.backgroundColor : params.color.light.backgroundColor
    viewerContainer.style.background = backgroundColor

    const css = document.styleSheets[document.styleSheets.length - 1]
    const pageBorderColor = utils.isPrefersColorSchemeDark(params.codeColorTheme) ? params.color.dark.pageBorderColor : params.color.light.pageBorderColor
    css.insertRule(`.pdfViewer.removePageBorders .page {box-shadow: 0px 0px 0px 1px ${pageBorderColor}}`, css.cssRules.length)

    if (params.keybindings) {
        setSyncTeXKey(params.keybindings['synctex'])
        registerSyncTeX()
    }
}
