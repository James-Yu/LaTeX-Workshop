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
    (document.getElementById('trimSelect') as HTMLElement).addEventListener('change', () => {
        const trimScale = getTrimScale()
        const trimSelect = document.getElementById('trimSelect') as HTMLSelectElement
        const scaleSelect = document.getElementById('scaleSelect') as HTMLSelectElement
        const ev = new Event('change')
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
            scaleSelect.dispatchEvent(ev)
        } else {
            for ( const opt of scaleSelect.options ) {
                opt.disabled = true
            }
            currentUserSelectScale = currentUserSelectScale ?? PDFViewerApplication.pdfViewer._currentScale
            originalUserSelectIndex = originalUserSelectIndex ?? scaleSelect.selectedIndex
            const opt = document.getElementById('trimOption') as HTMLOptionElement
            opt.value = (currentUserSelectScale * trimScale).toString()
            opt.selected = true
            scaleSelect.dispatchEvent(ev)
        }
    })
}

function trimPage(page: HTMLElement) {
    const trimScale = getTrimScale()
    const canvasWrapper = page.getElementsByClassName('canvasWrapper')[0] as HTMLElement
    const canvas = page.getElementsByTagName('canvas')[0]
    if ( !canvasWrapper || !canvas ) {
        if (page.style.width !== '250px') {
            page.style.width = '250px'
        }
        return
    }
    const w = canvas.style.width
    const m = w.match(/(\d+)/)
    if (!m) {
        return
    }
    // add -4px to ensure that no horizontal scroll bar appears.
    const rawWidth = Number(m[1])
    const width = Math.floor(rawWidth / trimScale) // - 4
    page.style.width = width + 'px'
    const layers = [
        page.getElementsByClassName('textLayer')[0] as HTMLElement,
        page.getElementsByClassName('annotationLayer')[0] as HTMLElement,
        canvas
    ]
    const offsetX = (rawWidth - width) / 2
    layers.forEach(layer => {
        layer.style.left = `-${offsetX}px`
    })
}

function setObserverToTrim() {
    const observer = new MutationObserver(records => {
        records.forEach(record => {
            const page = record.target as HTMLElement
            trimPage(page)
        })
    })
    const viewer = document.getElementById('viewer') as HTMLElement
    for( const page of viewer.getElementsByClassName('page') as HTMLCollectionOf<HTMLElement> ){
        if (page.dataset.isObserved !== 'observed') {
            observer.observe(page, {attributes: true, childList: true, attributeFilter: ['style']})
            page.setAttribute('data-is-observed', 'observed')
        }
    }
}

// We need to recaluculate scale and left offset for trim mode on each resize event.
window.addEventListener('resize', () =>{
    const trimSelect = document.getElementById('trimSelect') as HTMLSelectElement
    const ind = trimSelect.selectedIndex
    if (!trimSelect || ind <= 0) {
        return
    }
    trimSelect.selectedIndex = 0
    const e = new Event('change')
    trimSelect.dispatchEvent(e)
    trimSelect.selectedIndex = ind
    trimSelect.dispatchEvent(e)
})

export class PageTrimmer {
    private readonly lwApp: ILatexWorkshopPdfViewer

    constructor(lwApp: ILatexWorkshopPdfViewer) {
        this.lwApp = lwApp
        // Set observers after a pdf file is loaded in the first time.
        this.lwApp.onPagesLoaded(setObserverToTrim, {once: true})
        // Skip the first loading
        this.lwApp.onPagesInit(() => {
            // Set observers each time a pdf file is refresed.
            this.lwApp.onPagesInit(setObserverToTrim)
        }, {once: true})

        this.lwApp.onPagesLoaded(() => {
            // const container = document.getElementById('trimSelectContainer') as HTMLElement
            const select = document.getElementById('trimSelect') as HTMLSelectElement

            // tweak UI https://github.com/James-Yu/LaTeX-Workshop/pull/979
            // container.setAttribute('style', 'display: inherit;')
            // if (container.clientWidth > 0) {
            //     select.setAttribute('style', 'min-width: inherit;')
            //     const width = select.clientWidth + 8
            //     select.setAttribute('style', 'min-width: ' + (width + 22) + 'px;')
            //     container.setAttribute('style', 'min-width: ' + width + 'px; ' + 'max-width: ' + width + 'px;')
            // }

            if (select.selectedIndex <= 0) {
                return
            }
            const viewer = document.getElementById('viewer') as HTMLElement
            for( const page of viewer.getElementsByClassName('page') as HTMLCollectionOf<HTMLElement> ){
                trimPage(page)
            }
        })
    }
}
