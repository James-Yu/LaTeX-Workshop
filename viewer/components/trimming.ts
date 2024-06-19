import { IPDFViewerApplication } from './interface'

declare const PDFViewerApplication: IPDFViewerApplication

let viewerTrim = 0
;(globalThis as any).viewerTrim = viewerTrim

export function changePDFViewerTrim(trim: number, eventBus: { dispatch: (eventName: string, payload: any) => void }) {
    viewerTrim = Math.min(1, Math.max(0, trim))
    ;(globalThis as any).viewerTrim = viewerTrim
    const select = document.getElementById('scaleSelect') as HTMLInputElement
    eventBus.dispatch('scalechanged', { source: select, value: select.value })
    const trimPct = document.getElementById('trimPct') as HTMLInputElement
    trimPct.value = (trim * 100).toString()
}

export function registerPDFViewerTrim(eventBus: { dispatch: (eventName: string, payload: any) => void }) {
    document.getElementById('viewer')!.style.setProperty('--trim-factor', viewerTrim.toString())
    const { pageHeight, pageWidth } = PDFViewerApplication.pdfViewer._pages[0].viewport.rawDims
    const css = document.styleSheets[document.styleSheets.length - 1]
    css.insertRule(`
        .page {
            width: calc(var(--scale-factor) * ${pageWidth}px * (1 - var(--trim-factor))) !important;
            height: calc(var(--scale-factor) * ${pageHeight}px * (1 - var(--trim-factor))) !important;
        }`, css.cssRules.length)
    css.insertRule(`
        .canvasWrapper,
        .textLayer,
        .annotationLayer {
            width: calc(var(--scale-factor) * ${pageWidth}px) !important;
            height: calc(var(--scale-factor) * ${pageHeight}px) !important;
            margin-left: calc(var(--scale-factor) * ${pageWidth}px * var(--trim-factor) / -2) !important;
            margin-top: calc(var(--scale-factor) * ${pageHeight}px * var(--trim-factor) / -2) !important;
        }`, css.cssRules.length)
    const trimPct = document.getElementById('trimPct') as HTMLInputElement
    trimPct.onchange = _ => {
        viewerTrim = Number.parseFloat(trimPct.value) / 100
        document.getElementById('viewer')!.style.setProperty('--trim-factor', viewerTrim.toString())
        changePDFViewerTrim(viewerTrim, eventBus)
    }
}
