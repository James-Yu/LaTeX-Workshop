import type { ILatexWorkshopPdfViewer } from './interface.js'

export function getTrimScale() {
    const trimSelect = document.getElementById('trimSelect') as HTMLSelectElement
    if (trimSelect.selectedIndex <= 0) {
        return 1.0
    }
    const trimValue = trimSelect.options[trimSelect.selectedIndex].value
    return 1.0/(1 - 2*Number(trimValue))
}

export function registerPageTrimmer(lwApp: ILatexWorkshopPdfViewer) {
    lwApp.onPagesLoaded(() => {
        initCSS()
        trimPages()
    });
    (document.getElementById('trimSelect') as HTMLElement).addEventListener('change', trimPages)
}

function trimPages() {
    const trimScale = getTrimScale()
    const viewer = document.getElementById('viewer') as HTMLElement
    viewer.style.setProperty('--trim-factor', `${trimScale}`)
}

window.addEventListener('resize', initCSS)

function initCSS() {
    const viewer = document.getElementById('viewer') as HTMLElement
    resizeDOM(viewer)
}

function resizeDOM(viewer: HTMLElement) {
    for (const page of viewer.getElementsByClassName('page') as HTMLCollectionOf<HTMLElement>){
        page.style.setProperty('--unit-width', (page.style.width.match(/[0-9]+/) || ['0'])[0] + 'px')
        page.style.setProperty('--unit-height', (page.style.height.match(/[0-9]+/) || ['0'])[0] + 'px')
        // calc(var(--scale-factor) * 792px)
        page.style.height = page.style.height.replace('px)', 'px * var(--trim-factor))')
    }
}
