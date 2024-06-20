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

    // Remove previous rules
    const pageRuleIndex = ([...css.cssRules] as (CSSRule | CSSStyleRule)[])
        .findIndex(rule => 'selectorText' in rule && rule.selectorText.includes('.page'))
    if (pageRuleIndex > -1) {
        css.deleteRule(pageRuleIndex)
    }
    const canvasRuleIndex = ([...css.cssRules] as (CSSRule | CSSStyleRule)[])
        .findIndex(rule => 'selectorText' in rule && rule.selectorText.includes('.canvasWrapper'))
    if (canvasRuleIndex > -1) {
        css.deleteRule(canvasRuleIndex)
    }

    // Add new rules
    const { pageRule, canvasRule } = getCSSRules([0, 180].includes(rotation))
    css.insertRule(pageRule, css.cssRules.length)
    css.insertRule(canvasRule, css.cssRules.length)
}

function getCSSRules(vertical: boolean = true): { pageRule: string, canvasRule: string } {
    const { pageHeight, pageWidth } = PDFViewerApplication.pdfViewer._pages[0].viewport.rawDims
    const pageRule = `
        .page {
            width: calc(var(--scale-factor) * ${vertical ? pageWidth : pageHeight}px * (1 - var(--trim-factor) / 100)) !important;
            height: calc(var(--scale-factor) * ${vertical ? pageHeight : pageWidth}px * (1 - var(--trim-factor) / 100)) !important;
        }`
    const canvasRule = `
        .canvasWrapper,
        .textLayer,
        .annotationLayer {
            width: calc(var(--scale-factor) * ${vertical ? pageWidth : pageHeight}px) !important;
            height: calc(var(--scale-factor) * ${vertical ? pageHeight : pageWidth}px) !important;
            margin-left: calc(var(--scale-factor) * ${vertical ? pageWidth : pageHeight}px * var(--trim-factor) / -200) !important;
            margin-top: calc(var(--scale-factor) * ${vertical ? pageHeight : pageWidth}px * var(--trim-factor) / -200) !important;
        }`
    return { pageRule, canvasRule }
}
