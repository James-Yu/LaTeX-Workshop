import {IConnectionPort, createConnectionPort} from './components/connection.js'
import {SyncTex} from './components/synctex.js'
import {PageTrimmer} from './components/pagetrimmer.js'
import * as utils from './components/utils.js'
import {ViewerHistory} from './components/viewerhistory.js'

import type {PdfjsEventName, IDisposable, ILatexWorkshopPdfViewer, IPDFViewerApplication, IPDFViewerApplicationOptions} from './components/interface.js'
import type {ClientRequest, ServerResponse, PanelManagerResponse, PanelRequest, PdfViewerState} from '../types/latex-workshop-protocol-types/index'

declare const PDFViewerApplication: IPDFViewerApplication
declare const PDFViewerApplicationOptions: IPDFViewerApplicationOptions

class LateXWorkshopPdfViewer implements ILatexWorkshopPdfViewer {
    readonly documentTitle: string = ''
    readonly embedded = window.parent !== window
    readonly encodedPdfFilePath: string
    readonly pageTrimmer: PageTrimmer
    readonly pdfFileUri: string
    readonly synctex: SyncTex
    readonly viewerHistory: ViewerHistory

    private hideToolbarInterval: number | undefined

    private connectionPort: IConnectionPort
    private pdfPagesLoaded: Promise<void>
    private isRestoredWithSerializer: boolean = false
    private readonly pdfViewerStarted: Promise<void>
    // The 'webviewerloaded' event is fired just before the initialization of PDF.js.
    // We can set PDFViewerApplicationOptions at the time.
    // - https://github.com/mozilla/pdf.js/wiki/Third-party-viewer-usage#initialization-promise
    // - https://github.com/mozilla/pdf.js/pull/10318
    private readonly webviewLoaded: Promise<void> = new Promise((resolve) => {
        document.addEventListener('webviewerloaded', () => resolve() )
    })
    private synctexEnabled = true
    private autoReloadEnabled = true

    constructor() {
        // When the promise is resolved, the initialization
        // of LateXWorkshopPdfViewer and PDF.js is completed.
        this.pdfViewerStarted = new Promise((resolve) => {
            this.onDidStartPdfViewer(() => resolve())
        })

        const pack = this.decodeQuery()
        this.encodedPdfFilePath = pack.encodedPdfFilePath
        this.documentTitle = pack.documentTitle || ''
        document.title = this.documentTitle
        this.pdfFileUri = pack.pdfFileUri

        this.viewerHistory = new ViewerHistory(this)
        this.connectionPort = createConnectionPort(this)
        this.synctex = new SyncTex(this)
        this.pageTrimmer = new PageTrimmer(this)

        this.setupConnectionPort()

        this.onDidStartPdfViewer(() => {
            this.send({type:'request_params', pdfFileUri: this.pdfFileUri})
            this.setCssRule()
        })
        this.onPagesLoaded(() => {
            this.send({type:'loaded', pdfFileUri: this.pdfFileUri})
        }, {once: true})

        this.hidePrintButton()
        this.registerKeybinding()
        this.registerSynctexCheckBox()
        this.registerAutoReloadCheckBox()
        this.startRebroadcastingKeyboardEvent()
        this.startSendingState()
        void this.startReceivingPanelManagerResponse()

        this.pdfPagesLoaded = new Promise((resolve) => {
            this.onPagesLoaded(() => resolve(), {once: true})
        })
        this.onPagesInit(() => {
            this.pdfPagesLoaded = new Promise((resolve) => {
                this.onPagesLoaded(() => resolve(), {once: true})
            })
        })
    }

    // For the details of the initialization of PDF.js,
    // see https://github.com/mozilla/pdf.js/wiki/Third-party-viewer-usage
    // We should use only the promises provided by PDF.js here, not the ones defined by us,
    // to avoid deadlock.
    private async getEventBus() {
        await this.webviewLoaded
        await PDFViewerApplication.initializedPromise
        return PDFViewerApplication.eventBus
    }

    onDidStartPdfViewer(cb: () => unknown): IDisposable {
        const documentLoadedEvent = 'documentloaded'
        const cb0 = () => {
            cb()
            PDFViewerApplication.eventBus.off(documentLoadedEvent, cb0)
        }
        void this.getEventBus().then(eventBus => {
            eventBus.on(documentLoadedEvent, cb0)
        })
        return { dispose: () => PDFViewerApplication.eventBus.off(documentLoadedEvent, cb0) }
    }

    onPagesInit(cb: () => unknown, option?: {once: boolean}): IDisposable {
        const pagesInitEvent = 'pagesinit'
        const cb0 = () => {
            cb()
            if (option?.once) {
                PDFViewerApplication.eventBus.off(pagesInitEvent, cb0)
            }
        }
        void this.getEventBus().then(eventBus => {
            eventBus.on(pagesInitEvent, cb0)
        })
        return { dispose: () => PDFViewerApplication.eventBus.off(pagesInitEvent, cb0) }
    }

    onPagesLoaded(cb: () => unknown, option?: {once: boolean}): IDisposable {
        const pagesLoadedEvent = 'pagesloaded'
        const cb0 = () => {
            cb()
            if (option?.once) {
                PDFViewerApplication.eventBus.off(pagesLoadedEvent, cb0)
            }
        }
        void this.getEventBus().then(eventBus => {
            eventBus.on(pagesLoadedEvent, cb0)
        })
        return { dispose: () => PDFViewerApplication.eventBus.off(pagesLoadedEvent, cb0) }
    }

    send(message: ClientRequest) {
        void this.connectionPort.send(message)
    }

    addLogMessage(message: string) {
        this.send({ type: 'add_log', message})
    }

    private getPdfViewerState(): PdfViewerState {
        const pack = {
            pdfFileUri: this.pdfFileUri,
            scale: PDFViewerApplication.pdfViewer.currentScaleValue,
            scrollMode: PDFViewerApplication.pdfViewer.scrollMode,
            spreadMode: PDFViewerApplication.pdfViewer.spreadMode,
            scrollTop: (document.getElementById('viewerContainer') as HTMLElement).scrollTop,
            scrollLeft: (document.getElementById('viewerContainer') as HTMLElement).scrollLeft,
            trim: (document.getElementById('trimSelect') as HTMLSelectElement).selectedIndex,
            synctexEnabled: this.synctexEnabled,
            autoReloadEnabled: this.autoReloadEnabled
        }
        return pack
    }

    private async restorePdfViewerState(state: PdfViewerState) {
        await this.pdfViewerStarted
        // By setting the scale, scaling will be invoked if necessary.
        // The scale can be a non-number one.
        if (state.scale !== undefined) {
            PDFViewerApplication.pdfViewer.currentScaleValue = state.scale
        }
        if (state.scrollMode !== undefined) {
            PDFViewerApplication.pdfViewer.scrollMode = state.scrollMode
        }
        if (state.spreadMode !== undefined) {
            PDFViewerApplication.pdfViewer.spreadMode = state.spreadMode
        }
        if (state.scrollTop !== undefined) {
            (document.getElementById('viewerContainer') as HTMLElement).scrollTop = state.scrollTop
        }
        if (state.scrollLeft !== undefined) {
            (document.getElementById('viewerContainer') as HTMLElement).scrollLeft = state.scrollLeft
        }
        if (state.synctexEnabled !== undefined) {
            this.setSynctex(state.synctexEnabled)
        }
        if (state.autoReloadEnabled !== undefined) {
            this.setAutoReload(state.autoReloadEnabled)
        }
        if (state.trim !== undefined) {
            const trimSelect = document.getElementById('trimSelect') as HTMLSelectElement
            const ev = new Event('change')
            // We have to wait for currentScaleValue set above to be effected
            // especially for cases of non-number scales.
            // https://github.com/James-Yu/LaTeX-Workshop/issues/1870
            void this.pdfPagesLoaded.then(() => {
                if (state.trim === undefined) {
                    return
                }
                trimSelect.selectedIndex = state.trim
                trimSelect.dispatchEvent(ev)
                // By setting the scale, the callbacks of trimming pages are invoked.
                // However, given "auto" and other non-number scales, the scale will be
                // unnecessarily recalculated, which we must avoid.
                if (state.scale !== undefined && /\d/.exec(state.scale)) {
                    PDFViewerApplication.pdfViewer.currentScaleValue = state.scale
                }
                if (state.scrollTop !== undefined) {
                    (document.getElementById('viewerContainer') as HTMLElement).scrollTop = state.scrollTop
                }
                this.sendCurrentStateToPanelManager()
            })
        }
        this.sendCurrentStateToPanelManager()
    }

    private forwardSynctex(position: { page: number, x: number, y: number }) {
        if (!this.synctexEnabled) {
            this.addLogMessage('SyncTeX temporarily disabled.')
            return
        }
        // use the offsetTop of the actual page, much more accurate than multiplying the offsetHeight of the first page
        // https://github.com/James-Yu/LaTeX-Workshop/pull/417
        const container = document.getElementById('viewerContainer') as HTMLElement
        const pos = PDFViewerApplication.pdfViewer._pages[position.page - 1].viewport.convertToViewportPoint(position.x, position.y)
        const page = document.getElementsByClassName('page')[position.page - 1] as HTMLElement
        const maxScrollX = window.innerWidth * 0.9
        const minScrollX = window.innerWidth * 0.1
        let scrollX = page.offsetLeft + pos[0]
        scrollX = Math.min(scrollX, maxScrollX)
        scrollX = Math.max(scrollX, minScrollX)
        const scrollY = page.offsetTop + page.offsetHeight - pos[1]

        // set positions before and after SyncTeX to viewerHistory
        this.viewerHistory.set(container.scrollTop)
        if (PDFViewerApplication.pdfViewer.scrollMode === 1) {
            // horizontal scrolling
            container.scrollLeft = page.offsetLeft
        } else {
            // vertical scrolling
            container.scrollTop = scrollY - document.body.offsetHeight * 0.4
        }
        this.viewerHistory.set(container.scrollTop)

        const indicator = document.getElementById('synctex-indicator') as HTMLElement
        indicator.className = 'show'
        indicator.style.left = `${scrollX}px`
        indicator.style.top = `${scrollY}px`
        setTimeout(() => indicator.className = 'hide', 10)
        setTimeout(() => {
            indicator.style.left = ''
            indicator.style.top = ''
        }, 1000)
    }

    private refreshPDFViewer() {
        if (!this.autoReloadEnabled) {
            this.addLogMessage('Auto reload temporarily disabled.')
            return
        }
        const pack = {
            scale: PDFViewerApplication.pdfViewer.currentScaleValue,
            scrollMode: PDFViewerApplication.pdfViewer.scrollMode,
            spreadMode: PDFViewerApplication.pdfViewer.spreadMode,
            scrollTop: (document.getElementById('viewerContainer') as HTMLElement).scrollTop,
            scrollLeft: (document.getElementById('viewerContainer') as HTMLElement).scrollLeft
        }

        // Note: without showPreviousViewOnLoad = false restoring the position after the refresh will fail if
        // the user has clicked on any link in the past (pdf.js will automatically navigate to that link).
        PDFViewerApplicationOptions.set('showPreviousViewOnLoad', false)
        // Override the spread mode specified in PDF documents with the current one.
        // https://github.com/James-Yu/LaTeX-Workshop/issues/1871
        PDFViewerApplicationOptions.set('spreadModeOnLoad', pack.spreadMode)

        void PDFViewerApplication.open(`${utils.pdfFilePrefix}${this.encodedPdfFilePath}`).then(() => {
            // reset the document title to the original value to avoid duplication
            document.title = this.documentTitle
        })
        this.onPagesInit(() => {
            PDFViewerApplication.pdfViewer.currentScaleValue = pack.scale
            PDFViewerApplication.pdfViewer.scrollMode = pack.scrollMode
            PDFViewerApplication.pdfViewer.spreadMode = pack.spreadMode;
            (document.getElementById('viewerContainer') as HTMLElement).scrollTop = pack.scrollTop;
            (document.getElementById('viewerContainer') as HTMLElement).scrollLeft = pack.scrollLeft
        }, {once: true})
        // The height of each page can change after a `pagesinit` event.
        // We have to set scrollTop on a `pagesloaded` event for that case.
        this.onPagesLoaded(() => {
            (document.getElementById('viewerContainer') as HTMLElement).scrollTop = pack.scrollTop;
            (document.getElementById('viewerContainer') as HTMLElement).scrollLeft = pack.scrollLeft
        }, {once: true})
        this.onPagesLoaded(() => {
            this.send({type:'loaded', pdfFileUri: this.pdfFileUri})
        }, {once: true})
    }

    private setupConnectionPort() {
        const openPack: ClientRequest = {
            type: 'open',
            pdfFileUri: this.pdfFileUri,
            viewer: (this.embedded ? 'tab' : 'browser')
        }
        this.send(openPack)
        this.connectionPort.onDidReceiveMessage((event: MessageEvent<string>) => {
            const data = JSON.parse(event.data) as ServerResponse
            switch (data.type) {
                case 'synctex': {
                    this.forwardSynctex(data.data)
                    break
                }
                case 'refresh': {
                    this.refreshPDFViewer()
                    break
                }
                case 'params': {
                    if (data.hand) {
                        PDFViewerApplication.pdfCursorTools.handTool.activate()
                    } else {
                        PDFViewerApplication.pdfCursorTools.handTool.deactivate()
                    }
                    if (!this.isRestoredWithSerializer) {
                        void this.restorePdfViewerState(data)
                    }
                    if (data.invertMode.enabled) {
                        const { brightness, grayscale, hueRotate, invert, sepia } = data.invertMode
                        const filter = `invert(${invert * 100}%) hue-rotate(${hueRotate}deg) grayscale(${grayscale}) sepia(${sepia}) brightness(${brightness})`
                        const isPrefersColorSchemeDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
                        if (isPrefersColorSchemeDark) {
                            (document.querySelector('#viewerContainer') as HTMLHtmlElement).style.filter = filter;
                            (document.querySelector('#thumbnailView') as HTMLHtmlElement).style.filter = filter;
                            (document.querySelector('#sidebarContent') as HTMLHtmlElement).style.background = 'var(--body-bg-color)'
                        } else {
                            (document.querySelector('html') as HTMLHtmlElement).style.filter = filter;
                            (document.querySelector('html') as HTMLHtmlElement).style.background = 'white'
                        }
                    }
                    (document.querySelector('#viewerContainer') as HTMLElement).style.background = data.bgColor
                    if (data.keybindings) {
                        this.synctex.reverseSynctexKeybinding = data.keybindings['synctex']
                        this.synctex.registerListenerOnEachPage()
                    }
                    break
                }
                default: {
                    break
                }
            }
        })

        this.connectionPort.onDidClose(() => {
            document.title = `[Disconnected] ${this.documentTitle}`
            console.log('Closed: WebScocket to LaTeX Workshop.')

            // Since WebSockets are disconnected when PC resumes from sleep,
            // we have to reconnect. https://github.com/James-Yu/LaTeX-Workshop/pull/1812
            setTimeout(() => {
                console.log('Try to reconnect to LaTeX Workshop.')
                this.connectionPort = createConnectionPort(this)
                this.connectionPort.onDidOpen(() => {
                    document.title = this.documentTitle
                    this.setupConnectionPort()
                    console.log('Reconnected: WebScocket to LaTeX Workshop.')
                })
            }, 3000)
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

    // Since the width of the selector of scaling depends on each locale,
    // we have to set its `max-width` dynamically on initialization.
    private setCssRule() {
        let styleSheet: CSSStyleSheet | undefined
        for (const style of document.styleSheets) {
            if (style.href && /latexworkshop.css/.exec(style.href)) {
                styleSheet = style
                break
            }
        }
        if (!styleSheet) {
            return
        }
        const scaleSelectContainer = document.getElementById('scaleSelectContainer') as HTMLElement
        const scaleWidth = utils.elementWidth(scaleSelectContainer)
        const numPages = document.getElementById('numPages') as HTMLElement
        const numPagesWidth = utils.elementWidth(numPages)
        const printerButtonWidth = this.embedded ? 0 : 34
        const smallViewMaxWidth = 580 + numPagesWidth + scaleWidth + printerButtonWidth
        const smallViewRule = `@media all and (max-width: ${smallViewMaxWidth}px) { .hiddenSmallView, .hiddenSmallView * { display: none; } }`
        styleSheet.insertRule(smallViewRule)
        const buttonSpacerMaxWidth = 540 + numPagesWidth + scaleWidth + printerButtonWidth
        const buttonSpacerRule = `@media all and (max-width: ${buttonSpacerMaxWidth}px) { .toolbarButtonSpacer { width: 0; } }`
        styleSheet.insertRule(buttonSpacerRule)
        const scaleMaxWidth = 500 + numPagesWidth + scaleWidth + printerButtonWidth
        const scaleRule = `@media all and (max-width: ${scaleMaxWidth}px) { #scaleSelectContainer { display: none; } }`
        styleSheet.insertRule(scaleRule)
        const trimMaxWidth = 500 + numPagesWidth + printerButtonWidth
        const trimRule = `@media all and (max-width: ${trimMaxWidth}px) { #trimSelectContainer { display: none; } }`
        styleSheet.insertRule(trimRule)
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
            dom.style.display='none'
        }
    }

    private registerKeybinding() {
        if (this.embedded) {
            document.addEventListener('click', (e) => {
                const target = e.target as HTMLAnchorElement
                if (target.nodeName === 'A' && !target.href.startsWith(window.location.href) && !target.href.startsWith('blob:')) { // is external link
                    e.preventDefault()
                }
            })
        }

        // keyboard bindings
        window.addEventListener('keydown', (evt) => {
            // F opens find bar, cause Ctrl-F is handled by vscode
            const target = evt.target as HTMLElement
            if(evt.keyCode === 70 && target.nodeName !== 'INPUT') { // ignore F typed in the search box
                this.showToolbar(false)
                PDFViewerApplication.findBar.open()
                evt.preventDefault()
            }

            // Chrome's usual Alt-Left/Right (Command-Left/Right on OSX) for history
            // Back/Forward don't work in the embedded viewer, so we simulate them.
            if (this.embedded && (evt.altKey || evt.metaKey)) {
                if (evt.keyCode === 37) {
                    this.viewerHistory.back()
                } else if(evt.keyCode === 39) {
                    this.viewerHistory.forward()
                }
            }
        });

        (document.getElementById('outerContainer') as HTMLElement).onmousemove = (e) => {
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
        this.sendCurrentStateToPanelManager()
    }

    registerSynctexCheckBox() {
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
        this.sendCurrentStateToPanelManager()
    }

    registerAutoReloadCheckBox() {
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

    private sendToPanelManager(msg: PanelRequest) {
        if (!this.embedded) {
            return
        }
        window.parent?.postMessage(msg, '*')
    }

    private sendCurrentStateToPanelManager() {
        const pack = this.getPdfViewerState()
        this.sendToPanelManager({type: 'state', state: pack})
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

    private startSendingState() {
        if (!this.embedded) {
            return
        }
        window.addEventListener('scroll', () => {
            this.sendCurrentStateToPanelManager()
        }, true)
        const events: PdfjsEventName[] = ['scroll', 'scalechanged', 'zoomin', 'zoomout', 'zoomreset', 'scrollmodechanged', 'spreadmodechanged', 'pagenumberchanged']
        for (const ev of events) {
            void this.getEventBus().then(eventBus => {
                eventBus.on(ev, () => {
                    this.sendCurrentStateToPanelManager()
                })
            })
        }
    }

    private async startReceivingPanelManagerResponse() {
        await this.pdfViewerStarted
        window.addEventListener('message', (e) => {
            const data = e.data as PanelManagerResponse
            if (!data.type) {
                console.log('LateXWorkshopPdfViewer received a message of unknown type: ' + JSON.stringify(data))
                return
            }
            switch (data.type) {
                case 'restore_state': {
                    this.isRestoredWithSerializer = true
                    void this.restorePdfViewerState(data.state)
                    break
                }
                default: {
                    break
                }
            }
        })
        /**
         * Since this.pdfViewerStarted is resolved, the PDF viewer has started.
         */
        this.sendToPanelManager({type: 'initialized'})
    }

}

new LateXWorkshopPdfViewer()
