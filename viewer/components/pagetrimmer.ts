import type { ILatexWorkshopPdfViewer } from './interface.js'

export function getTrimScale() {
    const viewer = document.getElementById('viewer') as HTMLElement
    return Number(viewer.style.getPropertyValue('--trim-factor'))
}

export function registerPageTrimmer(lwApp: ILatexWorkshopPdfViewer) {
    lwApp.onPagesLoaded(() => {
        resizeDOM()
        repositionDOM()
        setTrimScale()
    })
    const select = document.getElementById('trimSelect') as HTMLElement
    select.addEventListener('change', setTrimScale)
}

window.addEventListener('resize', resizeDOM)

function calcTrimScale() {
    const trimSelect = document.getElementById('trimSelect') as HTMLSelectElement
    if (trimSelect.selectedIndex <= 0) {
        return 1.0
    }
    const trimValue = trimSelect.options[trimSelect.selectedIndex].value
    return 1.0/(1 - 2*Number(trimValue))
}

function setTrimScale() {
    const trimScale = calcTrimScale()
    const viewer = document.getElementById('viewer') as HTMLElement
    viewer.style.setProperty('--trim-factor', `${trimScale}`)
}

function resizeDOM() {
    const viewer = document.getElementById('viewer') as HTMLElement
    for (const page of viewer.getElementsByClassName('page') as HTMLCollectionOf<HTMLElement>){
        page.style.setProperty('--unit-width', (page.style.width.match(/[0-9]+/) || ['0'])[0] + 'px')
        page.style.setProperty('--unit-height', (page.style.height.match(/[0-9]+/) || ['0'])[0] + 'px')
        // calc(var(--scale-factor) * 792px)
        page.style.height = page.style.height.replace('px)', 'px * var(--trim-factor))')
    }
}

function repositionDOM() {
    for (const anno of document.getElementsByClassName('textAnnotation') as HTMLCollectionOf<HTMLElement>) {
        if (parseFloat(anno.style.left) <= 50) {
            continue
        }
        for (const popup of anno.getElementsByClassName('popupWrapper') as HTMLCollectionOf<HTMLElement>) {
            popup.style.right = '100%'
            popup.style.left = ''
        }
    }
}
