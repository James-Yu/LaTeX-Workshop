import {IConnectionPort, createConnectionPort} from './components/connection.js'
import {editHTML} from './components/htmleditor.js'
import {SyncTex} from './components/synctex.js'
import * as utils from './components/utils.js'
import {ExternalPromise} from './components/externalpromise.js'
import {ViewerHistory} from './components/viewerhistory.js'

import type {PdfjsEventName, IDisposable, ILatexWorkshopPdfViewer, IPDFViewerApplication, IPDFViewerApplicationOptions} from './components/interface.js'
import type {ClientRequest, ServerResponse, PanelRequest, PdfViewerParams, SynctexData, SynctexRangeData} from '../types/latex-workshop-protocol-types/index'
import { initTrim, setTrimCSS } from './components/trimming.js'
import { restoreState, refresh } from './components/refresh.js'
import { setParams } from './components/state.js'

declare const PDFViewerApplication: IPDFViewerApplication
declare const PDFViewerApplicationOptions: IPDFViewerApplicationOptions

export class LateXWorkshopPdfViewer implements ILatexWorkshopPdfViewer {
    readonly documentTitle: string = ''
    readonly embedded = window.parent !== window
    readonly encodedPdfFilePath: string
    readonly pdfFileUri: string
    readonly synctex: SyncTex
    readonly viewerHistory: ViewerHistory

    private hideToolbarInterval: number | undefined

    private connectionPort: IConnectionPort
    synctexEnabled = true
    autoReloadEnabled = true
    private readonly setupAppOptionsPromise = new ExternalPromise<void>()

    constructor() {
        const pack = this.decodeQuery()
        this.encodedPdfFilePath = pack.encodedPdfFilePath
        this.documentTitle = pack.documentTitle || ''
        document.title = this.documentTitle
        this.pdfFileUri = pack.pdfFileUri

        editHTML()

        this.viewerHistory = new ViewerHistory(this)
        this.connectionPort = createConnectionPort(this)
        this.synctex = new SyncTex(this)

        this.setupConnectionPort()
            .catch((e) => console.error('Setting up connection port failed:', e))

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

    send(message: ClientRequest) {
        void this.connectionPort.send(message)
    }

    addLogMessage(message: string) {
        this.send({ type: 'add_log', message})
    }

    async waitSetupAppOptionsFinished() {
        return this.setupAppOptionsPromise.promise
    }

    private scrollToPosition(page: HTMLElement, posX: number, posY: number, isCircle: boolean = false): { scrollX: number, scrollY: number } {
        const container = document.getElementById('viewerContainer') as HTMLElement
        const maxScrollX = window.innerWidth * (isCircle ? 0.9 : 1)
        const minScrollX = window.innerWidth * (isCircle ? 0.1 : 0)
        let scrollX = page.offsetLeft + posX
        scrollX = Math.min(scrollX, maxScrollX)
        scrollX = Math.max(scrollX, minScrollX)
        const scrollY = page.offsetTop + page.offsetHeight - posY

        this.viewerHistory.set(container.scrollTop)
        if (PDFViewerApplication.pdfViewer.scrollMode === 1) {
            container.scrollLeft = page.offsetLeft
        } else {
            container.scrollTop = scrollY - document.body.offsetHeight * 0.4
        }
        this.viewerHistory.set(container.scrollTop)

        return { scrollX, scrollY }
    }

    private createIndicator(type: 'rect' | 'circ', scrollX: number, scrollY: number, width_px?: number, height_px?: number): void {
        let indicator = document.getElementById('synctex-indicator') as HTMLElement

        if (type === 'rect') {
            const parent = indicator.parentNode as HTMLElement
            indicator = indicator.cloneNode(true) as HTMLElement
            indicator.id = ''
            indicator.classList.add('synctex-indicator-rect')
            indicator.style.width = `${width_px}px`
            indicator.style.height = `${height_px}px`
            indicator.addEventListener('animationend', () => {
                indicator.style.display = 'none'
                parent.removeChild(indicator)
            })
            parent.appendChild(indicator)
        } else {
            indicator.className = 'show'
            setTimeout(() => indicator.className = 'hide', 10)
            // setTimeout(() => {
            //     indicator.style.left = ''
            //     indicator.style.top = ''
            // }, 1000)
        }
        indicator.style.left = `${scrollX}px`
        indicator.style.top = `${scrollY}px`

    }

    private forwardSynctexRect(data: SynctexRangeData[]) {
        for (const record of data) {
            const page = document.getElementsByClassName('page')[record.page - 1] as HTMLElement
            const pos_left_top = PDFViewerApplication.pdfViewer._pages[record.page - 1].viewport.convertToViewportPoint(record.h, record.v - record.H)
            const pos_right_down = PDFViewerApplication.pdfViewer._pages[record.page - 1].viewport.convertToViewportPoint(record.h + record.W, record.v)

            const canvas = document.getElementsByClassName('canvasWrapper')[0] as HTMLElement
            pos_left_top[0] += canvas.offsetLeft
            pos_left_top[1] += canvas.offsetTop
            pos_right_down[0] += canvas.offsetLeft
            pos_right_down[1] += canvas.offsetTop

            const { scrollX, scrollY } = this.scrollToPosition(page, pos_left_top[0], pos_left_top[1])

            if (record.indicator) {
                const width_px = pos_right_down[0] - Math.max(scrollX, pos_left_top[0])
                const height_px = pos_left_top[1] - pos_right_down[1]
                this.createIndicator('rect', scrollX, scrollY, width_px, height_px)
            }
        }
    }

    private forwardSynctexCirc(data: SynctexData) {
        const page = document.getElementsByClassName('page')[data.page - 1] as HTMLElement
        // use the offsetTop of the actual page, much more accurate than multiplying the offsetHeight of the first page
        // https://github.com/James-Yu/LaTeX-Workshop/pull/417
        const pos = PDFViewerApplication.pdfViewer._pages[data.page - 1].viewport.convertToViewportPoint(data.x, data.y)
        const { scrollX, scrollY } = this.scrollToPosition(page, pos[0], pos[1], true)

        if (data.indicator) {
            this.createIndicator('circ', scrollX, scrollY)
        }
    }

    private forwardSynctex(data: SynctexData | SynctexRangeData[]) {
        if (!this.synctexEnabled) {
            this.addLogMessage('SyncTeX temporarily disabled.')
            return
        }

        // if the type of data is SynctexRangeData[], parse as a rectangular indicator.
        if (Array.isArray(data)){
            this.forwardSynctexRect(data)
        } else {
            this.forwardSynctexCirc(data)
        }
    }

    private reload() {
        location.reload()
    }

    private async setupConnectionPort() {
        const openPack: ClientRequest = {
            type: 'open',
            pdfFileUri: this.pdfFileUri,
            viewer: (this.embedded ? 'tab' : 'browser')
        }
        this.send(openPack)
        await this.connectionPort.onDidReceiveMessage((event: MessageEvent<string>) => {
            const data = JSON.parse(event.data) as ServerResponse
            switch (data.type) {
                case 'synctex': {
                    this.forwardSynctex(data.data)
                    break
                }
                case 'refresh': {
                    if (!this.autoReloadEnabled) {
                        this.addLogMessage('Auto reload temporarily disabled.')
                        break
                    }
                    void refresh()
                    break
                }
                case 'reload': {
                    this.reload()
                    break
                }
                default: {
                    break
                }
            }
        })

        await this.connectionPort.onDidClose(async () => {
            document.title = `[Disconnected] ${this.documentTitle}`
            console.log('Closed: WebSocket to LaTeX Workshop.')

            // Since WebSockets are disconnected when PC resumes from sleep,
            // we have to reconnect. https://github.com/James-Yu/LaTeX-Workshop/pull/1812
            await sleep(3000)

            let tries = 1
            while (tries <= 10) {
                console.log(`Try to reconnect to LaTeX Workshop: (${tries}/10).`)
                try {
                    this.connectionPort = createConnectionPort(this)
                    await this.connectionPort.awaitOpen()
                    document.title = this.documentTitle
                    await this.setupConnectionPort()
                    console.log('Reconnected: WebSocket to LaTeX Workshop.')
                    return
                } catch (e) {
                    console.error(e)
                }

                await sleep(1000 * (tries + 2))
                tries++
            }
            console.error('Cannot reconnect to LaTeX Workshop.')
        })
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
                    this.send({type:'external_link', url:target.href})
                    e.preventDefault()
                }
            })
        }

        // keyboard bindings
        window.addEventListener('keydown', (evt: KeyboardEvent) => {
            if (this.embedded && evt.key === 'c' && (evt.ctrlKey || evt.metaKey)) {
                const selection = window.getSelection()
                if (selection !== null && selection.toString().length > 0) {
                    this.send({type: 'copy', content: selection.toString(), isMetaKey: evt.metaKey})
                }
            }

            // Chrome's usual Alt-Left/Right (Command-Left/Right on OSX) for history
            // Back/Forward don't work in the embedded viewer, so we simulate them.
            if (this.embedded && (navigator.userAgent.includes('Mac OS') ? evt.metaKey : evt.altKey)) {
                if (evt.key === 'ArrowLeft') {
                    this.viewerHistory.back()
                } else if(evt.key === 'ArrowRight') {
                    this.viewerHistory.forward()
                }
            }

            // Following are shortcuts when focus is not in inputs, e.g., search
            // box or page input
            if ((evt.target as HTMLElement).nodeName === 'INPUT') {
                return
            }

            if (evt.key === 'Backspace') {
                this.viewerHistory.back()
            }
            if (evt.key === 'Backspace' && evt.shiftKey) {
                this.viewerHistory.forward()
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
            this.synctexEnabled = true
        } else {
            if (!synctexOff.checked) {
                synctexOff.checked = true
            }
            this.synctexEnabled = false
        }
        // uploadState(this)
    }

    private registerSynctexCheckBox() {
        const synctexOff = document.getElementById('synctexOff') as HTMLInputElement
        synctexOff.addEventListener('change', () => {
            this.setSynctex(!synctexOff.checked)
            PDFViewerApplication.secondaryToolbar.close()
        })
        const synctexOffButton = document.getElementById('synctexOffButton') as HTMLButtonElement
        synctexOffButton.addEventListener('click', () => {
            this.setSynctex(!this.synctexEnabled)
            PDFViewerApplication.secondaryToolbar.close()
        })
    }

    setAutoReload(flag: boolean) {
        const autoReloadOff = document.getElementById('autoReloadOff') as HTMLInputElement
        if (flag) {
            if (autoReloadOff.checked) {
                autoReloadOff.checked = false
            }
            this.autoReloadEnabled = true
        } else {
            if (!autoReloadOff.checked) {
                autoReloadOff.checked = true
            }
            this.autoReloadEnabled = false
        }
        // uploadState(this)
    }

    private registerAutoReloadCheckBox() {
        const autoReloadOff = document.getElementById('autoReloadOff') as HTMLInputElement
        autoReloadOff.addEventListener('change', () => {
            this.setAutoReload(!autoReloadOff.checked)
            PDFViewerApplication.secondaryToolbar.close()
        })
        const autoReloadOffButton = document.getElementById('autoReloadOffButton') as HTMLButtonElement
        autoReloadOffButton.addEventListener('click', () => {
            this.setAutoReload(!this.autoReloadEnabled)
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
    const workerPort = new Worker('build/pdf.worker.mjs', { type: 'module' })
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
            workerPort,
            workerSrc: './build/pdf.worker.mjs',
            forcePageColors: true,
            ...color
        }
        PDFViewerApplicationOptions.setAll(options)
    })
}

async function sleep(timeout: number) {
    await new Promise((resolve) => setTimeout(resolve, timeout))
}

const extension = new LateXWorkshopPdfViewer()
await initialization()
onPDFViewerEvent('documentloaded', () => {
    void setParams(extension)
}, { once: true })
onPDFViewerEvent('pagesinit', async () => {
    initTrim()
    await restoreState()
    extension.synctex.registerListenerOnEachPage()
})
onPDFViewerEvent('pagesloaded', async () => {
    initTrim()
    await restoreState()
    extension.send({type:'loaded', pdfFileUri: extension.pdfFileUri})
})
onPDFViewerEvent('rotationchanging', () => setTrimCSS())

// @ts-expect-error Must import viewer.mjs here, otherwise some config won't work. #4096
await import('../../viewer/viewer.mjs')
