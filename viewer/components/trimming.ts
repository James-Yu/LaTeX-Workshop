import { IPDFViewerApplication } from './interface'

declare const PDFViewerApplication: IPDFViewerApplication

let viewerTrim = 0
;(globalThis as any).viewerTrim = 0

export function setTrimValue(trim: number, eventBus: { dispatch: (eventName: string, payload: any) => void }) {
    viewerTrim = Math.min(100, Math.max(0, trim))
    ;(globalThis as any).viewerTrim = viewerTrim
    const select = document.getElementById('scaleSelect') as HTMLInputElement
    eventBus.dispatch('scalechanged', { source: select, value: select.value })
    const trimPct = document.getElementById('trimPct') as HTMLInputElement
    trimPct.value = trim.toString()
}

export function initTrim(eventBus: { dispatch: (eventName: string, payload: any) => void }) {
    document.getElementById('viewer')!.style.setProperty('--trim-factor', (viewerTrim).toString())
    setTrimCSS(0)

    const trimPct = document.getElementById('trimPct') as HTMLInputElement
    trimPct.onchange = _ => {
        viewerTrim = Number.parseFloat(trimPct.value)
        document.getElementById('viewer')!.style.setProperty('--trim-factor', viewerTrim.toString())
        setTrimValue(viewerTrim, eventBus)
    }
}

export function setTrimCSS(rotation: number) {
    const css = document.styleSheets[document.styleSheets.length - 1]
    const prevCssCount = css.cssRules.length

    // Add new rules
    for (const [pageNum, page] of PDFViewerApplication.pdfViewer._pages.entries()) {
        let { pageHeight, pageWidth } = page.viewport.rawDims
        if ([90, 270].includes(page.viewport.rotation)) {
            const temp = pageHeight
            pageHeight = pageWidth
            pageWidth = temp
        }
        const { pageRule, canvasRule } = getCSSRules(pageNum, pageHeight, pageWidth, [0, 180].includes(rotation))
        css.insertRule(pageRule, css.cssRules.length)
        css.insertRule(canvasRule, css.cssRules.length)
    }

    // Remove previous rules
    for (let index = prevCssCount - 1; index >= 0; index--) {
        const rule = css.cssRules[index] as (CSSRule | CSSStyleRule)
        if ('selectorText' in rule && rule.selectorText.includes('.page')) {
            css.deleteRule(index)
        }
    }
}

function getCSSRules(pageNum: number, pageHeight: number, pageWidth: number, vertical: boolean = true): { pageRule: string, canvasRule: string } {
    const pageRule = `
        .page[data-page-number="${pageNum + 1}"] {
            width: calc(var(--scale-factor) * ${vertical ? pageWidth : pageHeight}px * (1 - var(--trim-factor) / 100)) !important;
            height: calc(var(--scale-factor) * ${vertical ? pageHeight : pageWidth}px * (1 - var(--trim-factor) / 100)) !important;
        }`
    const canvasRule = `
        .page[data-page-number="${pageNum + 1}"] .canvasWrapper,
        .page[data-page-number="${pageNum + 1}"] .textLayer,
        .page[data-page-number="${pageNum + 1}"] .annotationLayer {
            width: calc(var(--scale-factor) * ${vertical ? pageWidth : pageHeight}px) !important;
            height: calc(var(--scale-factor) * ${vertical ? pageHeight : pageWidth}px) !important;
            margin-left: calc(var(--scale-factor) * ${vertical ? pageWidth : pageHeight}px * var(--trim-factor) / -200) !important;
            margin-top: calc(var(--scale-factor) * ${vertical ? pageHeight : pageWidth}px * var(--trim-factor) / -200) !important;
        }`
    return { pageRule, canvasRule }
}
