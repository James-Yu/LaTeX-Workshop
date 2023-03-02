import type {ILatexWorkshopPdfViewer, IPDFViewerApplication} from './interface.js'

declare const PDFViewerApplication: IPDFViewerApplication

let currentUserSelectScale: number | undefined
let originalUserSelectIndex: number | undefined

function getTrimScale() {
    const trimSelect = document.getElementById('trimSelect') as HTMLSelectElement
    if (trimSelect.selectedIndex <= 0) {
        return 1.0
    }
    const trimValue = trimSelect.options[trimSelect.selectedIndex].value
    return 1.0/(1 - 2*Number(trimValue))
}

export function registerPageTrimmer() {
    (document.getElementById('trimSelect') as HTMLElement).addEventListener('change', trimPages)
}

function trimPages() {
    const trimScale = getTrimScale()
    const viewer = document.getElementById('viewer') as HTMLElement
    const prevTrim = Number(viewer.style.getPropertyValue('--trim-factor'))
    const prevScale = Number(viewer.style.getPropertyValue('--scale-factor'))
    viewer.style.setProperty('--scale-factor', `${prevScale / prevTrim * trimScale}`)
    viewer.style.setProperty('--trim-factor', `${trimScale}`)
    resizeDOM(viewer)

    const trimSelect = document.getElementById('trimSelect') as HTMLSelectElement
    const scaleSelect = document.getElementById('scaleSelect') as HTMLSelectElement
    if (trimSelect.selectedIndex <= 0) {
        for ( const opt of scaleSelect.options ) {
            opt.disabled = false
        }
        (document.getElementById('trimOption') as HTMLOptionElement).disabled = true;
        (document.getElementById('trimOption') as HTMLOptionElement).hidden = true
        if (originalUserSelectIndex !== undefined) {
            /**
             * If the original scale is custom, selectedIndex === 4,
             * we use page-width, selectedIndex === 3.
             * There is no way to set the custom scale.
             */
            if (originalUserSelectIndex === 4) {
                scaleSelect.selectedIndex = 3
            } else {
                scaleSelect.selectedIndex = originalUserSelectIndex
            }
        }
        currentUserSelectScale = undefined
        originalUserSelectIndex = undefined
    } else {
        for ( const opt of scaleSelect.options ) {
            opt.disabled = true
        }
        currentUserSelectScale = currentUserSelectScale ?? PDFViewerApplication.pdfViewer._currentScale
        originalUserSelectIndex = originalUserSelectIndex ?? scaleSelect.selectedIndex
        const opt = document.getElementById('trimOption') as HTMLOptionElement
        opt.value = (currentUserSelectScale * trimScale).toString()
        opt.selected = true
    }
}

window.addEventListener('resize', initCSS)

function initCSS() {
    const viewer = document.getElementById('viewer') as HTMLElement
    resizeDOM(viewer)
}

function resizeDOM(viewer: HTMLElement) {
    for (const page of viewer.getElementsByClassName('page') as HTMLCollectionOf<HTMLElement>){
        page.style.setProperty('--unit-width', (page.style.width.match(/[0-9]+/) || ['0'])[0] + 'px')
        page.style.width = page.style.width.includes('--trim-factor') ? page.style.width : page.style.width.slice(0, -1) + ' / var(--trim-factor))'

        const canvas = page.getElementsByTagName('canvas')[0]
        const text = page.getElementsByClassName('textLayer')[0] as HTMLElement | undefined
        if (canvas && text) {
            canvas.style.height = text.style.height
            canvas.style.width = text.style.width
        }
    }
}

export class PageTrimmer {
    constructor(lwApp: ILatexWorkshopPdfViewer) {
        lwApp.onPagesLoaded(() => {
            const viewer = document.getElementById('viewer') as HTMLElement
            viewer.style.setProperty('--trim-factor', '1')
            initCSS()
            trimPages()
        })
    }
}
