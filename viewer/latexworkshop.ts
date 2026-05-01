import { patchViewerUI, registerKeyBind, registerPersistentState, repositionAnnotation } from './components/gui.js'
import * as utils from './components/utils.js'

import type { PdfjsEventName, PDFViewerApplicationType, PDFViewerApplicationOptionsType } from './components/interface.js'
import { initTrim, setTrimCSS } from './components/trimming.js'
import { doneRefresh, restoreState } from './components/refresh.js'
import { initUploadState, setParams, uploadState } from './components/state.js'
import { initConnect, send } from './components/connection.js'
import { registerSyncTeX } from './components/synctex.js'

declare const PDFViewerApplication: PDFViewerApplicationType
declare const PDFViewerApplicationOptions: PDFViewerApplicationOptionsType
declare const pdfjsLib: {
    OutputScale?: {
        readonly pixelRatio: number
    }
}

const FRACTIONAL_DPI_EPSILON = 1e-3
const MIN_FRACTIONAL_DPI_CANVAS_SCALE = 2

// Chromium-based viewers are visibly soft when PDF.js renders page canvases at
// fractional DPR values such as Windows 125%. Render at an integral backing
// scale so Chromium does not have to stretch the PDF canvas.
function getCanvasPixelRatio() {
    const pixelRatio = window.devicePixelRatio || 1
    if (!Number.isFinite(pixelRatio) || pixelRatio <= 1) {
        return 1
    }
    if (Math.abs(pixelRatio - Math.round(pixelRatio)) < FRACTIONAL_DPI_EPSILON) {
        return pixelRatio
    }
    return Math.max(MIN_FRACTIONAL_DPI_CANVAS_SCALE, Math.ceil(pixelRatio))
}

function patchFractionalDpiCanvasScale() {
    const outputScale = pdfjsLib.OutputScale
    if (!outputScale) {
        return
    }
    const descriptor = Object.getOwnPropertyDescriptor(outputScale, 'pixelRatio')
    if (descriptor && !descriptor.configurable) {
        return
    }
    Object.defineProperty(outputScale, 'pixelRatio', {
        configurable: true,
        get: getCanvasPixelRatio
    })
}

// The 'webviewerloaded' event is fired just before the initialization of PDF.js.
// We can set PDFViewerApplicationOptions at the time.
// - https://github.com/mozilla/pdf.js/wiki/Third-party-viewer-usage#initialization-promise
// - https://github.com/mozilla/pdf.js/pull/10318
const webViewerLoaded = new Promise<void>((resolve) => {
    document.addEventListener('webviewerloaded', () => resolve() )

    // https://github.com/James-Yu/LaTeX-Workshop/pull/4220#issuecomment-2034520751
    try {
        parent.document.addEventListener('webviewerloaded', () => resolve() )
    } catch(_) { /* do nothing */ }
})

// For the details of the initialization of PDF.js,
// see https://github.com/mozilla/pdf.js/wiki/Third-party-viewer-usage
// We should use only the promises provided by PDF.js here, not the ones defined by us,
// to avoid deadlock.
async function getViewerEventBus() {
    await webViewerLoaded
    await PDFViewerApplication.initializedPromise
    return PDFViewerApplication.eventBus
}

function onPDFViewerEvent(event: PdfjsEventName, cb: (evt?: any) => unknown, option?: { once: boolean }): { dispose: () => void } {
    const cb0 = (evt?: unknown) => {
        cb(evt)
        if (option?.once) { PDFViewerApplication.eventBus.off(event, cb0) }
    }
    void getViewerEventBus().then(eventBus => eventBus.on(event, cb0))
    return { dispose: () => PDFViewerApplication.eventBus.off(event, cb0) }
}

async function initialization() {
    document.title = utils.parseURL().docTitle

    patchFractionalDpiCanvasScale()

    const params = await utils.getParams()
    document.addEventListener('webviewerloaded', () => {
        const color = utils.isPrefersColorSchemeDark(params.codeColorTheme) ? params.color.dark : params.color.light
        const options = {
            annotationEditorMode: -1,
            disablePreferences: true,
            enableScripting: false,
            // The following paths are requested from ./build/cmaps/, ./build/standard_fonts/, and ./build/wasm/
            cMapUrl: '../cmaps/',
            standardFontDataUrl: '../standard_fonts/',
            wasmUrl: '../wasm/',
            sidebarViewOnLoad: 0,
            workerSrc: './build/pdf.worker.mjs',
            forcePageColors: true,
            // The following allow clear display with large zoom values. This is necessary to enable trimming.
            maxCanvasPixels: -1,
            maxCanvasDim: -1,
            enableDetailCanvas: false,
            ...color
        }
        PDFViewerApplicationOptions.setAll(options)
    })

    initConnect()
    await patchViewerUI()
    registerKeyBind()
}

await initialization()
onPDFViewerEvent('documentloaded', () => {
    void setParams()
    initUploadState()
    void getViewerEventBus().then(eventbus => {
        const events: PdfjsEventName[] = ['scalechanged', 'zoomin', 'zoomout', 'zoomreset', 'scrollmodechanged', 'spreadmodechanged', 'pagenumberchanged']
        events.forEach(event => {
            eventbus.on(event, () => { uploadState() })
        })
    })
}, { once: true })
onPDFViewerEvent('pagesinit', () => {
    initTrim()
    void restoreState()
    registerSyncTeX()
    registerPersistentState()
})
onPDFViewerEvent('pagesloaded', () => {
    initTrim()
    void restoreState()
        .then(() => uploadState())
        .then(() => send({ type: 'loaded', pdfFileUri: utils.parseURL().pdfFileUri }))
    repositionAnnotation()
    doneRefresh()
})
onPDFViewerEvent('rotationchanging', () => setTrimCSS())

// @ts-expect-error Must import viewer.mjs here, otherwise some config won't work. #4096
await import('../../viewer/viewer.mjs')
