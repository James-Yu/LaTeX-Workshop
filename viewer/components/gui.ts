import { send, sendPanel } from './connection.js'
import { scrollHistory } from './viewerhistory.js'
import { toggleSyncTeX } from './synctex.js'
import { toggleAutoReload } from './refresh.js'
import * as utils from './utils.js'
import type { PDFViewerApplicationType } from './interface.js'

declare const PDFViewerApplication: PDFViewerApplicationType

export function patchViewerUI() {
    if (utils.isEmbedded()) {
        document.getElementById('print')?.remove()
    }

    document.getElementById('outerContainer')!.onmousemove = (e) => {
        if (e.clientY <= 64) {
            showToolbar()
        }
    }

    document.getElementById('sidebarResizer')?.classList.add('hidden')
    document.getElementsByClassName('toolbar')[0]?.classList.add('hide')
    document.getElementById('firstPage')?.previousElementSibling?.classList.add('visibleLargeView')

    const template = document.createElement('template')
    template.innerHTML =
`<button id="TrimButton" class="secondaryToolbarButton" title="Trim margin" tabindex="70">
    <label for="trimPct">Trim margin by </label>
    <input type="number" id="trimPct" name="trimPct" min="0" max="99" value="0">
    <label for="trimPct">%</label>
</button>
<button id="synctexOnButton" class="secondaryToolbarButton" title="Enable SyncTeX" tabindex="71">
    <input id="synctexOn" type="checkbox" checked><span>Enable SyncTeX</span>
</button>
<button id="autoReloadOnButton" class="secondaryToolbarButton" title="Enable reload" tabindex="72">
    <input id="autoReloadOn" type="checkbox" checked><span>Enable reload</span>
</button>
<div class="horizontalToolbarSeparator"></div>`
    let anchor: HTMLElement | Element = document.getElementById('documentProperties')!
    for (const node of template.content.childNodes) {
        anchor.parentNode?.insertBefore(node, anchor)
    }

    registerSynctexCheckBox()
    registerAutoReloadCheckBox()

    template.innerHTML =
`<!-- History back button, useful in the embedded viewer -->
<button class="toolbarButton findPrevious" title="Back (←)" id="historyBack">
  <span>Back</span>
</button>
<button class="toolbarButton findNext" title="Forward (⇧←)" id="historyForward">
  <span>Forward</span>
</button>`
    anchor = document.getElementById('sidebarToggle')!.nextElementSibling!
    for (const node of template.content.childNodes) {
        anchor.parentNode?.insertBefore(node, anchor)
    }

    template.innerHTML = '<div id="synctex-indicator"></div>'
    anchor = document.getElementById('viewerContainer')!
    for (const node of template.content.childNodes) {
        anchor.appendChild(node)
    }
}

function registerSynctexCheckBox() {
    const synctexOn = document.getElementById('synctexOn')! as HTMLInputElement
    const synctexOnButton = document.getElementById('synctexOnButton')! as HTMLInputElement
    synctexOnButton.addEventListener('click', () => {
        synctexOn.checked = toggleSyncTeX()
        // PDFViewerApplication.secondaryToolbar.close()
    })
}

function registerAutoReloadCheckBox() {
    const autoReloadOn = document.getElementById('autoReloadOn')! as HTMLInputElement
    const autoReloadOnButton = document.getElementById('autoReloadOnButton')! as HTMLButtonElement
    autoReloadOnButton.addEventListener('click', () => {
        autoReloadOn.checked = toggleAutoReload()
        // PDFViewerApplication.secondaryToolbar.close()
    })
}

export function registerKeyBind() {
    // browser and embed keyboard bindings
    window.addEventListener('keydown', (evt: KeyboardEvent) => {
        // Following are shortcuts when focus is not in inputs, e.g., search
        // box or page input
        if ((evt.target as HTMLElement).nodeName === 'INPUT') {
            return
        }

        if (evt.key === 'Backspace') {
            scrollHistory.back()
        }
        if (evt.key === 'Backspace' && evt.shiftKey) {
            scrollHistory.forward()
        }

        // Configure VIM-like shortcut keys
        if (!evt.altKey && !evt.ctrlKey && !evt.metaKey && ['J', 'K', 'H', 'L'].includes(evt.key)) {
            evt.stopImmediatePropagation()
            const container = document.getElementById('viewerContainer') as HTMLElement

            const configMap: {[key: string]: ScrollToOptions} = {
                'J': { top: evt.repeat ? 20 : 40 },
                'K': { top: evt.repeat ? -20 : -40 },
                'H': { left: evt.repeat ? -20 : -40 },
                'L': { left: evt.repeat ? 20 : 40 },
            }

            if (configMap[evt.key]) {
                container.scrollBy({ ...configMap[evt.key], behavior: 'smooth' })
            }
        }
    })

    const setHistory = () => {
        const container = document.getElementById('viewerContainer') as HTMLElement
        // set positions before and after clicking to viewerHistory
        scrollHistory.set(container.scrollTop)
        setTimeout(() => { scrollHistory.set(container.scrollTop) }, 500)
    }

    ;(document.getElementById('viewerContainer') as HTMLElement).addEventListener('click', setHistory)
    ;(document.getElementById('sidebarContainer') as HTMLElement).addEventListener('click', setHistory)

    // back button (mostly useful for the embedded viewer)
    ;(document.getElementById('historyBack') as HTMLElement).addEventListener('click', () => { scrollHistory.back() })
    ;(document.getElementById('historyForward') as HTMLElement).addEventListener('click', () => { scrollHistory.forward() })

    document.addEventListener('mousedown', (ev) => {
        if(ev.button === 3) { scrollHistory.back() }
        if(ev.button === 4) { scrollHistory.forward() }
    })

    // Embed-only keyboard bindings
    if (!utils.isEmbedded()) {
        return
    }

    // if we're embedded we cannot open external links here. So we intercept clicks and forward them to the extension
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLAnchorElement
        if (target.nodeName === 'A' && !target.href.startsWith(window.location.href) && !target.href.startsWith('blob:')) { // is external link
            void send({ type:'external_link', url:target.href })
            e.preventDefault()
        }
    })

    window.addEventListener('keydown', (evt: KeyboardEvent) => {
        if (evt.key === 'c' && (evt.ctrlKey || evt.metaKey)) {
            const selection = window.getSelection()
            if (selection !== null && selection.toString().length > 0) {
                void send({ type: 'copy', content: selection.toString(), isMetaKey: evt.metaKey })
            }
        }

        // Chrome's usual Alt-Left/Right (Command-Left/Right on OSX) for history
        // Back/Forward don't work in the embedded viewer, so we simulate them.
        if (navigator.userAgent.includes('Mac OS') ? evt.metaKey : evt.altKey) {
            if (evt.key === 'ArrowLeft') {
                scrollHistory.back()
            } else if(evt.key === 'ArrowRight') {
                scrollHistory.forward()
            }
        }
    })

    // To enable keyboard shortcuts of VS Code when the iframe is focused,
    // we have to dispatch keyboard events in the parent window.
    // See https://github.com/microsoft/vscode/issues/65452#issuecomment-586036474
    document.addEventListener('keydown', e => {
        const obj = {
            altKey: e.altKey,
            code: e.code,
            keyCode: e.keyCode,
            ctrlKey: e.ctrlKey,
            isComposing: e.isComposing,
            key: e.key,
            location: e.location,
            metaKey: e.metaKey,
            repeat: e.repeat,
            shiftKey: e.shiftKey
        }
        if (utils.isPdfjsShortcut(obj)) {
            return
        }
        sendPanel({
            type: 'keyboard_event',
            event: obj
        })
    })
}

export function repositionAnnotation() {
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

let hideToolbarInterval: number | undefined
function showToolbar(animate: boolean=true) {
    if (hideToolbarInterval) {
        clearInterval(hideToolbarInterval)
    }
    const d = document.getElementsByClassName('toolbar')[0]
    d.className = d.className.replace(' hide', '') + (animate ? '' : ' notransition')

    hideToolbarInterval = setInterval(() => {
        if(!PDFViewerApplication.findBar.opened && !PDFViewerApplication.pdfSidebar.isOpen && !PDFViewerApplication.secondaryToolbar.isOpen) {
            d.className = d.className.replace(' notransition', '') + ' hide'
            clearInterval(hideToolbarInterval)
        }
    }, 3000)
}
