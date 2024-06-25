import { PDFViewerApplicationType } from './interface'

declare const PDFViewerApplication: PDFViewerApplicationType

let viewerTrim = 0
;(globalThis as any).viewerTrim = 0

export function getTrimValue() {
    return viewerTrim
}

export function setTrimValue(trim: number) {
    viewerTrim = Math.min(100, Math.max(0, trim))
    ;(globalThis as any).viewerTrim = viewerTrim
    const select = document.getElementById('scaleSelect') as HTMLSelectElement
    if (select.value === 'custom') {
        PDFViewerApplication.pdfViewer.currentScaleValue = ((JSON.parse(select.options[select.selectedIndex].getAttribute('data-l10n-args')!) as any).scale / 100).toString()
    } else {
        PDFViewerApplication.pdfViewer.currentScaleValue = select.value
    }
    // Set the value again to avoid displaying decimals like 7.00
    const trimPct = document.getElementById('trimPct') as HTMLInputElement
    trimPct.value = viewerTrim.toString()
}

export function initTrim() {
    document.getElementById('viewer')!.style.setProperty('--trim-factor', getTrimValue().toString())
    setTrimCSS()

    const trimPct = document.getElementById('trimPct') as HTMLInputElement
    trimPct.onchange = _ => {
        viewerTrim = Number.parseFloat(trimPct.value)
        document.getElementById('viewer')!.style.setProperty('--trim-factor', viewerTrim.toString())
        setTrimValue(viewerTrim)
    }
}

export function setTrimCSS() {
    const css = document.styleSheets[document.styleSheets.length - 1]
    const prevCssCount = css.cssRules.length

    // Add new rules
    for (const [pageNum, page] of PDFViewerApplication.pdfViewer._pages.entries()) {
        let { pageHeight, pageWidth } = page.viewport.rawDims
        if ([90, 270].includes(page.viewport.rotation)) {
            [ pageHeight, pageWidth ] = [ pageWidth, pageHeight ]
        }
        const { pageRule, canvasRule } = getCSSRules(pageNum, pageHeight, pageWidth)
        css.insertRule(pageRule, css.cssRules.length)
        css.insertRule(canvasRule, css.cssRules.length)
    }

    // Remove previous rules
    for (let index = prevCssCount - 1; index >= 0; index--) {
        const rule = css.cssRules[index] as (CSSRule | CSSStyleRule)
        if ('selectorText' in rule && rule.selectorText.includes('.page[data-page-number=')) {
            css.deleteRule(index)
        }
    }
}

function getCSSRules(pageNum: number, pageHeight: number, pageWidth: number): { pageRule: string, canvasRule: string } {
    const pageRule = `
        .page[data-page-number="${pageNum + 1}"] {
            width: calc(var(--scale-factor) * ${pageWidth}px * (1 - var(--trim-factor) / 100)) !important;
            height: calc(var(--scale-factor) * ${pageHeight}px * (1 - var(--trim-factor) / 100)) !important;
        }`
    const canvasRule = `
        .page[data-page-number="${pageNum + 1}"] .canvasWrapper,
        .page[data-page-number="${pageNum + 1}"] .textLayer,
        .page[data-page-number="${pageNum + 1}"] .annotationLayer {
            width: calc(var(--scale-factor) * ${pageWidth}px) !important;
            height: calc(var(--scale-factor) * ${pageHeight}px) !important;
            margin-left: calc(var(--scale-factor) * ${pageWidth}px * var(--trim-factor) / -200) !important;
            margin-top: calc(var(--scale-factor) * ${pageHeight}px * var(--trim-factor) / -200) !important;
        }`
    return { pageRule, canvasRule }
}
