import {ILatexWorkshopPdfViewer} from './interface.js'

declare const PDFViewerApplication: any

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


document.getElementById('trimSelect').addEventListener('change', () => {
    const trimScale = getTrimScale()
    const trimSelect = document.getElementById('trimSelect') as HTMLSelectElement
    const scaleSelect = document.getElementById('scaleSelect') as HTMLSelectElement
    const e = new Event('change')
    let o
    if (trimSelect.selectedIndex <= 0) {
        for ( o of scaleSelect.options ) {
            o.disabled = false
        }
        (document.getElementById('trimOption') as HTMLOptionElement).disabled = true
        document.getElementById('trimOption').hidden = true
        if (originalUserSelectIndex !== undefined) {
            scaleSelect.selectedIndex = originalUserSelectIndex
        }
        scaleSelect.dispatchEvent(e)
        currentUserSelectScale = undefined
        originalUserSelectIndex = undefined
        const viewer = document.getElementById('viewer')
        for ( const page of viewer.getElementsByClassName('page') ) {
            for ( const layer of page.getElementsByClassName('annotationLayer') ) {
                for ( const secionOfAnnotation of layer.getElementsByTagName('section') ) {
                    if (secionOfAnnotation.dataset.originalLeft !== undefined) {
                        secionOfAnnotation.style.left = secionOfAnnotation.dataset.originalLeft
                    }
                }
            }
        }
        return
    }
    for ( o of scaleSelect.options ) {
        o.disabled = true
    }
    if (currentUserSelectScale === undefined) {
        currentUserSelectScale = PDFViewerApplication.pdfViewer._currentScale
    }
    if (originalUserSelectIndex === undefined) {
        originalUserSelectIndex = scaleSelect.selectedIndex
    }
    o = document.getElementById('trimOption') as HTMLOptionElement
    o.value = (currentUserSelectScale * trimScale).toString()
    o.selected = true
    scaleSelect.dispatchEvent(e)
})


function trimPage(page: HTMLElement) {
    const trimScale = getTrimScale()
    const textLayer = page.getElementsByClassName('textLayer')[0] as HTMLElement
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
    if (m) {
        // add -4px to ensure that no horizontal scroll bar appears.
        const widthNum = Math.floor(Number(m[1])/trimScale) - 4
        const width = widthNum + 'px'
        page.style.width = width
        canvasWrapper.style.width = width
        const offsetX = - Number(m[1]) * (1 - 1/trimScale) / 2
        canvas.style.left = offsetX + 'px'
        canvas.style.position = 'relative'
        canvas.setAttribute('data-is-trimmed', 'trimmed')
        if ( textLayer && textLayer.dataset.isTrimmed !== 'trimmed' ) {
            textLayer.style.width = widthNum - offsetX + 'px'
            textLayer.style.left = offsetX + 'px'
            textLayer.setAttribute('data-is-trimmed', 'trimmed')
        }
        const secionOfAnnotationArray = page.getElementsByTagName('section')
        for ( const secionOfAnnotation of secionOfAnnotationArray ) {
            let originalLeft = secionOfAnnotation.style.left
            if (secionOfAnnotation.dataset.originalLeft === undefined) {
                secionOfAnnotation.setAttribute('data-original-left', secionOfAnnotation.style.left)
            } else {
                originalLeft = secionOfAnnotation.dataset.originalLeft
            }
            const mat = originalLeft.match(/(\d+)/)
            if (mat) {
                secionOfAnnotation.style.left = (Number(mat[1]) + offsetX) + 'px'
            }
        }
    }
}

function setObserverToTrim() {
    const observer = new MutationObserver(records => {
        const trimSelect = document.getElementById('trimSelect') as HTMLSelectElement
        if (trimSelect.selectedIndex <= 0) {
            return
        }
        records.forEach(record => {
            const page = record.target as HTMLElement
            trimPage(page)
        })
    })
    const viewer = document.getElementById('viewer')
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
        this.lwApp.onDidRenderPdfFile(setObserverToTrim, {once: true})
        // Skip the first loading
        this.lwApp.onDidLoadPdfFile( () => {
            // Set observers each time a pdf file is refresed.
            this.lwApp.onDidLoadPdfFile(setObserverToTrim)
        }, {once: true})

        this.lwApp.onDidRenderPdfFile( () => {
            const container = document.getElementById('trimSelectContainer')
            const select = document.getElementById('trimSelect') as HTMLSelectElement
            container.setAttribute('style', 'display: inherit;')
            if (container.clientWidth > 0) {
                select.setAttribute('style', 'min-width: inherit;')
                const width = select.clientWidth + 8
                select.setAttribute('style', 'min-width: ' + (width + 22) + 'px;')
                container.setAttribute('style', 'min-width: ' + width + 'px; ' + 'max-width: ' + width + 'px;')
            }
            if (select.selectedIndex <= 0) {
                return
            }
            const viewer = document.getElementById('viewer')
            for( const page of viewer.getElementsByClassName('page') as HTMLCollectionOf<HTMLElement> ){
                trimPage(page)
            }
        })
    }
}
