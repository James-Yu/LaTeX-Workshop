import * as utils from './utils.js'
import { getViewerEventBus, type LateXWorkshopPdfViewer } from '../latexworkshop.js'
import type { IPDFViewerApplication, PdfjsEventName } from './interface'
import type { PdfViewerParams, PdfViewerState } from '../../types/latex-workshop-protocol-types/index.js'
import { getTrimValue } from './trimming.js'
import { getSyncTeXEnabled, registerSyncTeX, setSyncTeXKey } from './synctex.js'
import { getAutoReloadEnabled } from './refresh.js'

declare const PDFViewerApplication: IPDFViewerApplication

// let viewerState: PdfViewerState | undefined

export async function initUploadState(extension: LateXWorkshopPdfViewer) {
//     window.addEventListener('message', (e) => {
//         const data = e.data as PanelManagerResponse
//         if (!data.type) {
//             console.log('LateXWorkshopPdfViewer received a message of unknown type: ' + JSON.stringify(data))
//             return
//         }
//         switch (data.type) {
//             case 'restore_state': {
//                 console.log(data.state)
//                 // viewerState = data.state
//                 break
//             }
//             default: {
//                 break
//             }
//         }
//     })

    window.addEventListener('scrollend', () => { uploadState(extension) }, true)

    const events: PdfjsEventName[] = ['scalechanged', 'zoomin', 'zoomout', 'zoomreset', 'scrollmodechanged', 'spreadmodechanged', 'pagenumberchanged']
    for (const ev of events) {
        (await getViewerEventBus()).on(ev, () => { uploadState(extension) })
    }
}

export function uploadState(extension: LateXWorkshopPdfViewer) {
    const state: PdfViewerState = {
        pdfFileUri: extension.pdfFileUri,
        scale: PDFViewerApplication.pdfViewer.currentScaleValue,
        trim: getTrimValue(),
        scrollMode: PDFViewerApplication.pdfViewer.scrollMode,
        sidebarView: PDFViewerApplication.pdfSidebar.visibleView,
        spreadMode: PDFViewerApplication.pdfViewer.spreadMode,
        scrollTop: (document.getElementById('viewerContainer') as HTMLElement).scrollTop,
        scrollLeft: (document.getElementById('viewerContainer') as HTMLElement).scrollLeft,
        synctexEnabled: getSyncTeXEnabled(),
        autoReloadEnabled: getAutoReloadEnabled()
    }
    extension.sendToPanelManager({type: 'state', state})
}

export async function setParams() {
    const params = await (await fetch('config.json')).json() as PdfViewerParams

    const htmlElement = document.querySelector('html') as HTMLHtmlElement
    const viewerContainer = document.querySelector('#viewerContainer') as HTMLHtmlElement
    const thumbnailView = document.querySelector('#thumbnailView') as HTMLHtmlElement
    const sidebarContent = document.querySelector('#sidebarContent') as HTMLHtmlElement

    PDFViewerApplication.pdfCursorTools.switchTool(params.hand ? 1 : 0)
    if (params.invertMode.enabled) {
        const { brightness, grayscale, hueRotate, invert, sepia } = params.invertMode
        const filter = `invert(${invert * 100}%) hue-rotate(${hueRotate}deg) grayscale(${grayscale}) sepia(${sepia}) brightness(${brightness})`
        if (utils.isPrefersColorSchemeDark(params.codeColorTheme)) {
            viewerContainer.style.filter = filter
            thumbnailView.style.filter = filter
            sidebarContent.style.background = 'var(--body-bg-color)'
        } else {
            htmlElement.style.filter = filter
            htmlElement.style.background = 'white'
        }
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

// export async function setState(extension: LateXWorkshopPdfViewer) {
//     const state = viewerState ?? await (await fetch('config.json')).json() as PdfViewerParams

//     if (state.trim !== undefined) {
//         setTrimValue(state.trim)
//     }

//     // By setting the scale, scaling will be invoked if necessary.
//     // The scale can be a non-number one.
//     if (state.scale !== undefined) {
//         PDFViewerApplication.pdfViewer.currentScaleValue = state.scale
//     }
//     if (state.scrollMode !== undefined) {
//         PDFViewerApplication.pdfViewer.scrollMode = state.scrollMode
//     }
//     if (state.spreadMode !== undefined) {
//         PDFViewerApplication.pdfViewer.spreadMode = state.spreadMode
//     }
//     if (!('scrollTop' in state)) {
//         return
//     }

//     if (state.scrollTop !== undefined) {
//         (document.getElementById('viewerContainer') as HTMLElement).scrollTop = state.scrollTop
//     }
//     if (state.scrollLeft !== undefined) {
//         (document.getElementById('viewerContainer') as HTMLElement).scrollLeft = state.scrollLeft
//     }
//     if (state.sidebarView !== undefined) {
//         PDFViewerApplication.pdfSidebar.switchView(state.sidebarView)
//     }
//     if (state.synctexEnabled !== undefined) {
//         extension.setSynctex(state.synctexEnabled)
//     }
//     if (state.autoReloadEnabled !== undefined) {
//         extension.setAutoReload(state.autoReloadEnabled)
//     }
// }
