import type { PDFViewer } from '../latexworkshop'
import type { IPDFViewer, IPDFViewerApplication, IPDFViewerLocation } from './interface.js'

declare const PDFViewerApplication: IPDFViewerApplication

export function getTrimScale() {
    const viewer = document.getElementById('viewer') as HTMLElement
    return Number(viewer.style.getPropertyValue('--trim-factor'))
}

export function registerPageTrimmer(lwViewer: PDFViewer) {
    lwViewer.onEvent('pagesloaded', () => {
        resizeDOM()
        repositionDOM()
    })
    lwViewer.onEvent('updateviewarea', (payload: { source: IPDFViewer, location: IPDFViewerLocation }) => {
        const pageNumber = payload.location.pageNumber
        const canvas = document.getElementsByClassName('canvasWrapper')[pageNumber - 1] as HTMLElement
        const text = document.getElementsByClassName('textLayer')[pageNumber - 1] as HTMLElement
        canvas.style.width = text.offsetWidth + 'px'
        canvas.style.height = text.offsetHeight + 'px'
    })
    lwViewer.onEvent('spreadmodechanged', setTrimScale)
    const trimSelect = document.getElementById('trimSelect') as HTMLElement
    trimSelect.addEventListener('change', setTrimScale)
    window.addEventListener('resize', setTrimScale)
}

function calcTrimScale() {
    const trimSelect = document.getElementById('trimSelect') as HTMLSelectElement
    if (trimSelect.selectedIndex <= 0) {
        return 1.0
    }
    const trimValue = trimSelect.options[trimSelect.selectedIndex].value
    return 1.0 / (1 - 2 * Number(trimValue))
}

function setTrimScale() {
    const viewer = document.getElementById('viewer') as HTMLElement
    const prevTrimScale = parseFloat(viewer.style.getPropertyValue('--trim-factor')) || 1.0
    const trimScale = calcTrimScale()
    viewer.style.setProperty('--trim-factor', trimScale.toString())
    const select = document.getElementById('scaleSelect') as HTMLSelectElement
    for (let index = 0; index < select.length; ++index) {
        const option = select.options[index]
        if (index < 4) {
            option.value = (calcScale(index) * trimScale).toString()
        } else {
            option.value = ((Number(option.value)) / prevTrimScale * trimScale).toString()
        }
    }
    select.dispatchEvent(new Event('change'))
}

function calcScale(index: number) {
    const pdf = PDFViewerApplication.pdfViewer
    const currentPage = pdf._pages[pdf._currentPageNumber - 1]
    let hPadding = 40
    let vPadding = 5
    if (pdf.isInPresentationMode) {
        hPadding = vPadding = 4
        if (pdf._spreadMode !== 0) { // Not NONE
            hPadding *= 2
        }
    } else if (pdf.removePageBorders) {
        hPadding = vPadding = 0
    } else if (pdf._scrollMode === 1) { // Horizontal scroll
        [hPadding, vPadding] = [vPadding, hPadding]
    }
    const container = document.getElementById('viewerContainer') as HTMLElement
    const pageWidthScale = (container.clientWidth - hPadding - (pdf._pageWidthScaleFactor - 1) * 22 - 2) / currentPage.width * currentPage.scale / pdf._pageWidthScaleFactor
    const pageHeightScale = (container.clientHeight - vPadding) / currentPage.height * currentPage.scale / getTrimScale()
    const horizontalScale = currentPage.width <= currentPage.height ? pageWidthScale : Math.min(pageHeightScale, pageWidthScale)
    switch (index) {
        case 2: // Width
            return pageWidthScale
        case 1: // Fit
            return Math.min(pageWidthScale, pageHeightScale)
        case 0: // Auto
            return Math.min(1.3, horizontalScale)
        default:
            return 1.0
    }
}

function resizeDOM() {
    const viewer = document.getElementById('viewer') as HTMLElement
    for (const page of viewer.getElementsByClassName('page') as HTMLCollectionOf<HTMLElement>){
        page.style.setProperty('--unit-width', (page.style.width.match(/[0-9]+/) || ['0'])[0] + 'px')
        page.style.setProperty('--unit-height', (page.style.height.match(/[0-9]+/) || ['0'])[0] + 'px')
        page.style.width = page.style.width.replace('px)', 'px / var(--trim-factor) - 2px )')
    }
    const css = document.styleSheets[document.styleSheets.length - 1]
    css.insertRule(`
        .textLayer,
        .annotationLayer,
        .canvasWrapper {
            left: calc(var(--scale-factor) * var(--unit-width) * (1 / var(--trim-factor) - 1) / 2) !important;
        }`, css.cssRules.length)
}

function repositionDOM() {
    for (const anno of document.getElementsByClassName('textAnnotation') as HTMLCollectionOf<HTMLElement>) {
        if (parseFloat(anno.style.left) <= 50) {
            continue
        }
        for (const popupWrapper of anno.getElementsByClassName('popupWrapper') as HTMLCollectionOf<HTMLElement>) {
            popupWrapper.style.right = '100%'
            popupWrapper.style.left = ''
        }
        for (const popup of anno.getElementsByClassName('popup') as HTMLCollectionOf<HTMLElement>) {
            popup.style.right = '0px'
        }
    }
}
