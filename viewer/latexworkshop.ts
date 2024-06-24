import {editHTML} from './components/htmleditor.js'
import * as utils from './components/utils.js'
import {ExternalPromise} from './components/externalpromise.js'
import { registerHistoryKeyBind, scrollHistory } from './components/viewerhistory.js'

import type { PdfjsEventName, IDisposable, ILatexWorkshopPdfViewer, IPDFViewerApplication, IPDFViewerApplicationOptions } from './components/interface.js'
import type { PanelRequest, PdfViewerParams } from '../types/latex-workshop-protocol-types/index'
import { initTrim, setTrimCSS } from './components/trimming.js'
import { getAutoReloadEnabled, restoreState, setAutoReloadEnabled } from './components/refresh.js'
import { initUploadState, setParams, uploadState } from './components/state.js'
import { initConnect, send } from './components/connection.js'
import { getSyncTeXEnabled, registerSyncTeX, setSyncTeXEnabled } from './components/synctex.js'

declare const PDFViewerApplication: IPDFViewerApplication
declare const PDFViewerApplicationOptions: IPDFViewerApplicationOptions

export class LateXWorkshopPdfViewer implements ILatexWorkshopPdfViewer {
    readonly documentTitle: string = ''
    readonly embedded = window.parent !== window
    readonly encodedPdfFilePath: string
    readonly pdfFileUri: string

    private hideToolbarInterval: number | undefined

    private readonly setupAppOptionsPromise = new ExternalPromise<void>()

    constructor() {
        const pack = this.decodeQuery()
        this.encodedPdfFilePath = pack.encodedPdfFilePath
        this.documentTitle = pack.documentTitle || ''
        document.title = this.documentTitle
        this.pdfFileUri = pack.pdfFileUri

        editHTML()

        this.hidePrintButton()
        this.registerKeybinding()
        this.registerSynctexCheckBox()
        this.registerAutoReloadCheckBox()
        this.startRebroadcastingKeyboardEvent()

        this.onViewUpdated(() => this.repositionDOM())
    }

    private repositionDOM() {
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

    onViewUpdated(cb: () => unknown, option?: {once: boolean}): IDisposable {
        const viewUpdatedEvent = 'updateviewarea'
        const cb0 = () => {
            cb()
            if (option?.once) {
                PDFViewerApplication.eventBus.off(viewUpdatedEvent, cb0)
            }
        }
        void getViewerEventBus().then(eventBus => {
            eventBus.on(viewUpdatedEvent, cb0)
        })
        return { dispose: () => PDFViewerApplication.eventBus.off(viewUpdatedEvent, cb0) }
    }

    async waitSetupAppOptionsFinished() {
        return this.setupAppOptionsPromise.promise
    }

    private showToolbar(animate: boolean) {
        if (this.hideToolbarInterval) {
            clearInterval(this.hideToolbarInterval)
        }
        const d = document.getElementsByClassName('toolbar')[0]
        d.className = d.className.replace(' hide', '') + (animate ? '' : ' notransition')

        this.hideToolbarInterval = setInterval(() => {
            if(!PDFViewerApplication.findBar.opened && !PDFViewerApplication.pdfSidebar.isOpen && !PDFViewerApplication.secondaryToolbar.isOpen) {
                d.className = d.className.replace(' notransition', '') + ' hide'
                clearInterval(this.hideToolbarInterval)
            }
        }, 3000)
    }

    private decodeQuery() {
        const query = document.location.search.substring(1)
        const parts = query.split('&')

        for (let i = 0, ii = parts.length; i < ii; ++i) {
            const param = parts[i].split('=')
            if (param[0].toLowerCase() === 'file') {
                const encodedPdfFilePath = param[1].replace(utils.pdfFilePrefix, '')
                const pdfFileUri = utils.decodePath(encodedPdfFilePath)
                const documentTitle = pdfFileUri.split(/[\\/]/).pop()
                return {encodedPdfFilePath, pdfFileUri, documentTitle}
            }
        }
        throw new Error('file not given in the query.')
    }

    private hidePrintButton() {
        if (this.embedded) {
            const dom = document.getElementById('print') as HTMLElement
            dom.style.display = 'none'
        }
    }

    private registerKeybinding() {
        // if we're embedded we cannot open external links here. So we intercept clicks and forward them to the extension
        if (this.embedded) {
            document.addEventListener('click', (e) => {
                const target = e.target as HTMLAnchorElement
                if (target.nodeName === 'A' && !target.href.startsWith(window.location.href) && !target.href.startsWith('blob:')) { // is external link
                    void send({ type:'external_link', url:target.href })
                    e.preventDefault()
                }
            })
        }

        // keyboard bindings
        window.addEventListener('keydown', (evt: KeyboardEvent) => {
            if (this.embedded && evt.key === 'c' && (evt.ctrlKey || evt.metaKey)) {
                const selection = window.getSelection()
                if (selection !== null && selection.toString().length > 0) {
                    void send({ type: 'copy', content: selection.toString(), isMetaKey: evt.metaKey })
                }
            }

            // Chrome's usual Alt-Left/Right (Command-Left/Right on OSX) for history
            // Back/Forward don't work in the embedded viewer, so we simulate them.
            if (this.embedded && (navigator.userAgent.includes('Mac OS') ? evt.metaKey : evt.altKey)) {
                if (evt.key === 'ArrowLeft') {
                    scrollHistory.back()
                } else if(evt.key === 'ArrowRight') {
                    scrollHistory.forward()
                }
            }

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

        ;(document.getElementById('outerContainer') as HTMLElement).onmousemove = (e) => {
            if (e.clientY <= 64) {
                this.showToolbar(true)
            }
        }
    }

    setSynctex(flag: boolean) {
        const synctexOff = document.getElementById('synctexOff') as HTMLInputElement
        if (flag) {
            if (synctexOff.checked) {
                synctexOff.checked = false
            }
            setSyncTeXEnabled(true)
        } else {
            if (!synctexOff.checked) {
                synctexOff.checked = true
            }
            setSyncTeXEnabled(false)
        }
        uploadState(this)
    }

    private registerSynctexCheckBox() {
        const synctexOff = document.getElementById('synctexOff') as HTMLInputElement
        synctexOff.addEventListener('change', () => {
            this.setSynctex(!synctexOff.checked)
            PDFViewerApplication.secondaryToolbar.close()
        })
        const synctexOffButton = document.getElementById('synctexOffButton') as HTMLButtonElement
        synctexOffButton.addEventListener('click', () => {
            this.setSynctex(!getSyncTeXEnabled())
            PDFViewerApplication.secondaryToolbar.close()
        })
    }

    setAutoReload(flag: boolean) {
        const autoReloadOff = document.getElementById('autoReloadOff') as HTMLInputElement
        if (flag) {
            if (autoReloadOff.checked) {
                autoReloadOff.checked = false
            }
            setAutoReloadEnabled(true)
        } else {
            if (!autoReloadOff.checked) {
                autoReloadOff.checked = true
            }
            setAutoReloadEnabled(false)
        }
        uploadState(this)
    }

    private registerAutoReloadCheckBox() {
        const autoReloadOff = document.getElementById('autoReloadOff') as HTMLInputElement
        autoReloadOff.addEventListener('change', () => {
            this.setAutoReload(!autoReloadOff.checked)
            PDFViewerApplication.secondaryToolbar.close()
        })
        const autoReloadOffButton = document.getElementById('autoReloadOffButton') as HTMLButtonElement
        autoReloadOffButton.addEventListener('click', () => {
            this.setAutoReload(!getAutoReloadEnabled())
            PDFViewerApplication.secondaryToolbar.close()
        })
    }

    sendToPanelManager(msg: PanelRequest) {
        if (!this.embedded) {
            return
        }
        window.parent?.postMessage(msg, '*')
    }

    // To enable keyboard shortcuts of VS Code when the iframe is focused,
    // we have to dispatch keyboard events in the parent window.
    // See https://github.com/microsoft/vscode/issues/65452#issuecomment-586036474
    private startRebroadcastingKeyboardEvent() {
        if (!this.embedded) {
            return
        }
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
            this.sendToPanelManager({
                type: 'keyboard_event',
                event: obj
            })
        })
    }
}

// The 'webviewerloaded' event is fired just before the initialization of PDF.js.
// We can set PDFViewerApplicationOptions at the time.
// - https://github.com/mozilla/pdf.js/wiki/Third-party-viewer-usage#initialization-promise
// - https://github.com/mozilla/pdf.js/pull/10318
const webViewerLoaded = new Promise<void>((resolve) => {
    document.addEventListener('webviewerloaded', () => resolve() )

    // https://github.com/James-Yu/LaTeX-Workshop/pull/4220#issuecomment-2034520751
    try {
        parent.document.addEventListener('webviewerloaded', () => resolve() )
    } catch(err) { /* do nothing */ }
})

// For the details of the initialization of PDF.js,
// see https://github.com/mozilla/pdf.js/wiki/Third-party-viewer-usage
// We should use only the promises provided by PDF.js here, not the ones defined by us,
// to avoid deadlock.
export async function getViewerEventBus() {
    await webViewerLoaded
    await PDFViewerApplication.initializedPromise
    return PDFViewerApplication.eventBus
}

export async function dispatchViewerEvent(eventName: string, payload: any) {
    (await getViewerEventBus()).dispatch(eventName, payload)
}

function onPDFViewerEvent(event: PdfjsEventName, cb: (evt?: any) => unknown, option?: { once: boolean }): IDisposable {
    const cb0 = (evt?: unknown) => {
        cb(evt)
        if (option?.once) { PDFViewerApplication.eventBus.off(event, cb0) }
    }
    void getViewerEventBus().then(eventBus => eventBus.on(event, cb0))
    return { dispose: () => PDFViewerApplication.eventBus.off(event, cb0) }
}

async function initialization() {
    const worker = new Worker('build/pdf.worker.mjs', { type: 'module' })
    const params = await (await fetch('config.json')).json() as PdfViewerParams
    document.addEventListener('webviewerloaded', () => {
        const color = utils.isPrefersColorSchemeDark(params.codeColorTheme) ? params.color.dark : params.color.light
        const options = {
            annotationEditorMode: -1,
            disablePreferences: true,
            enableScripting: false,
            cMapUrl: '../cmaps/',
            sidebarViewOnLoad: 0,
            standardFontDataUrl: '../standard_fonts/',
            workerPort: worker,
            workerSrc: './build/pdf.worker.mjs',
            forcePageColors: true,
            ...color
        }
        PDFViewerApplicationOptions.setAll(options)
    })
    initConnect()
    registerHistoryKeyBind()
}

const extension = new LateXWorkshopPdfViewer()
await initialization()
onPDFViewerEvent('documentloaded', () => {
    void setParams()
    void initUploadState(extension)
}, { once: true })
onPDFViewerEvent('pagesinit', async () => {
    initTrim()
    await restoreState()
    registerSyncTeX()
})
onPDFViewerEvent('pagesloaded', async () => {
    initTrim()
    await restoreState()
    void uploadState(extension)
    void send({ type: 'loaded', pdfFileUri: extension.pdfFileUri })
})
onPDFViewerEvent('rotationchanging', () => setTrimCSS())

/* eslint-disable */
let oldVisiblePages: number[]
let oldScrollHeight: number
let oldPageCount: number
;(globalThis as any).lwRecordRender = (pdfViewer: any) => {
    oldVisiblePages = pdfViewer._getVisiblePages().ids
    oldPageCount = pdfViewer.viewer.children.length
    let oldScale = pdfViewer.currentScale
    oldScrollHeight = pdfViewer.pdfDocument ? document.getElementById('viewerContainer')!.scrollHeight : 0
    return oldScale
}
;(globalThis as any).lwRenderSync = async (pdfViewer: any, pdfDocument: any, pagesCount: number) => {
    await Array.from(oldVisiblePages)
        .filter(pageNum => pageNum <= pagesCount)
        .map(pageNum => pdfDocument.getPage(pageNum)
            .then((pdfPage: [number, any]) => [pageNum, pdfPage])
        )
        .reduce((accPromise, currPromise) => accPromise.then(() =>
            // This forces all visible pages to be rendered synchronously rather than asynchronously to avoid race condition involving this.renderingQueue.highestPriorityPage
            currPromise.then(([pageNum, pdfPage]: [number, any]) => {
                const pageView = pdfViewer._pages[pageNum - 1]
                if (!pageView.pdfPage) {
                    pageView.setPdfPage(pdfPage)
                }
                pdfViewer.renderingQueue.highestPriorityPage = pageView.renderingId
                return pdfViewer._pages[pageNum - 1].draw().finally(() => {
                    pdfViewer.renderingQueue.renderHighestPriority()
                })
            })), Promise.resolve()
        )
    document.getElementById('viewerContainer')!.scrollTop += oldScrollHeight
    for (let i = 1; i <= oldPageCount; i++) {
        pdfViewer.viewer.removeChild(pdfViewer.viewer.firstChild)
    }
}
/* eslint-enable */

// @ts-expect-error Must import viewer.mjs here, otherwise some config won't work. #4096
await import('../../viewer/viewer.mjs')
