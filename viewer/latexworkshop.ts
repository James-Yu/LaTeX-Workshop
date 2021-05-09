import type {IDisposable, ILatexWorkshopPdfViewer, IPDFViewerApplication, IPDFViewerApplicationOptions} from './components/interface.js'
import {SyncTex} from './components/synctex.js'
import {PageTrimmer} from './components/pagetrimmer.js'
import type {ClientRequest, ServerResponse, PanelManagerResponse, PanelRequest, PdfViewerState} from './components/protocol.js'
import * as utils from './components/utils.js'
import {ViewerHistory} from './components/viewerhistory.js'

declare const PDFViewerApplication: IPDFViewerApplication
declare const PDFViewerApplicationOptions: IPDFViewerApplicationOptions

class LateXWorkshopPdfViewer implements ILatexWorkshopPdfViewer {
    readonly documentTitle: string = ''
    readonly embedded: boolean
    readonly encodedPdfFilePath: string
    readonly pageTrimmer: PageTrimmer
    readonly pdfFilePath: string
    readonly server: string
    readonly synctex: SyncTex
    readonly viewerHistory: ViewerHistory

    private hideToolbarInterval: number | undefined

    private socket: WebSocket
    private pdfFileRendered: Promise<void>
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
        this.embedded = window.parent !== window
        // When the promise is resolved, the initialization
        // of LateXWorkshopPdfViewer and PDF.js is completed.
        this.pdfViewerStarted = new Promise((resolve) => {
            this.onDidStartPdfViewer(() => resolve())
        })

        const pack = this.decodeQuery()
        this.encodedPdfFilePath = pack.encodedPdfFilePath
        this.documentTitle = pack.documentTitle || ''
        document.title = this.documentTitle
        this.pdfFilePath = pack.pdfFilePath

        this.viewerHistory = new ViewerHistory(this)
        const server = `ws://${window.location.hostname}:${window.location.port}`
        this.server = server
        this.socket = new WebSocket(server)
        this.synctex = new SyncTex(this)
        this.pageTrimmer = new PageTrimmer(this)

        this.setupWebSocket()

        this.onDidStartPdfViewer( () => {
            utils.callCbOnDidOpenWebSocket(this.socket, () => {
                this.send({type:'request_params', path:this.pdfFilePath})
            })
            this.setCssRule()
        })
        this.onDidRenderPdfFile( () => {
            utils.callCbOnDidOpenWebSocket(this.socket, () => {
                this.send({type:'loaded', path:this.pdfFilePath})
            })
        }, {once: true})

        this.hidePrintButton()
        this.registerKeybinding()
        this.registerSynctexCheckBox()
        this.registerAutoReloadCheckBox()
        this.startConnectionKeeper()
        this.startRebroadcastingKeyboardEvent()
        this.startSendingState()
        this.startReceivingPanelManagerResponse()

        this.pdfFileRendered = new Promise((resolve) => {
            this.onDidRenderPdfFile(() => resolve(), {once: true})
        })
        this.onDidLoadPdfFile(() => {
            this.pdfFileRendered = new Promise((resolve) => {
                this.onDidRenderPdfFile(() => resolve(), {once: true})
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

    onWillStartPdfViewer(cb: (e: Event) => unknown): IDisposable {
        document.addEventListener('webviewerloaded', cb, {once: true})
        return { dispose: () => document.removeEventListener('webviewerloaded', cb) }
    }

    onDidStartPdfViewer(cb: () => unknown): IDisposable {
        const cb0 = () => {
            cb()
            PDFViewerApplication.eventBus.off('documentloaded', cb0)
        }
        this.getEventBus().then(eventBus => {
            eventBus.on('documentloaded', cb0)
        })
        return { dispose: () => PDFViewerApplication.eventBus.off('documentloaded', cb0) }
    }

    onDidLoadPdfFile(cb: () => unknown, option?: {once: boolean}): IDisposable {
        const cb0 = () => {
            cb()
            if (option?.once) {
                PDFViewerApplication.eventBus.off('pagesinit', cb0)
            }
        }
        this.getEventBus().then(eventBus => {
            eventBus.on('pagesinit', cb0)
        })
        return { dispose: () => PDFViewerApplication.eventBus.off('pagesinit', cb0) }
    }

    onDidRenderPdfFile(cb: () => unknown, option?: {once: boolean}): IDisposable {
        const cb0 = () => {
            cb()
            if (option?.once) {
                PDFViewerApplication.eventBus.off('pagerendered', cb0)
            }
        }
        this.getEventBus().then(eventBus => {
            eventBus.on('pagerendered', cb0)
        })
        return { dispose: () => PDFViewerApplication.eventBus.off('pagerendered', cb0) }
    }

    send(message: ClientRequest) {
        this.socket.send(JSON.stringify(message))
    }

    private getPdfViewerState(): PdfViewerState {
        const pack = {
            path: this.pdfFilePath,
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
            this.pdfFileRendered.then(() => {
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

    private setupWebSocket() {
        utils.callCbOnDidOpenWebSocket(this.socket, () => {
            const pack: ClientRequest = {
                type: 'open',
                path: this.pdfFilePath,
                viewer: (this.embedded ? 'tab' : 'browser')
            }
            this.send(pack)
        })
        this.socket.addEventListener('message', (event: MessageEvent<string>) => {
            const data = JSON.parse(event.data) as ServerResponse
            switch (data.type) {
                case 'synctex': {
                    if (!this.synctexEnabled) {
                        break
                    }
                    // use the offsetTop of the actual page, much more accurate than multiplying the offsetHeight of the first page
                    // https://github.com/James-Yu/LaTeX-Workshop/pull/417
                    const container = document.getElementById('viewerContainer') as HTMLElement
                    const pos = PDFViewerApplication.pdfViewer._pages[data.data.page - 1].viewport.convertToViewportPoint(data.data.x, data.data.y)
                    const page = document.getElementsByClassName('page')[data.data.page - 1] as HTMLElement
                    const scrollX = page.offsetLeft + pos[0]
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
                    break
                }
                case 'refresh': {
                    if (!this.autoReloadEnabled) {
                        break
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

                    PDFViewerApplication.open(`${utils.pdfFilePrefix}${this.encodedPdfFilePath}`).then( () => {
                        // reset the document title to the original value to avoid duplication
                        document.title = this.documentTitle
                        // ensure that trimming is invoked if needed.
                        setTimeout(() => {
                            window.dispatchEvent( new Event('pagerendered') )
                        }, 2000)
                    })
                    this.onDidLoadPdfFile( () => {
                        PDFViewerApplication.pdfViewer.currentScaleValue = pack.scale
                        PDFViewerApplication.pdfViewer.scrollMode = pack.scrollMode
                        PDFViewerApplication.pdfViewer.spreadMode = pack.spreadMode;
                        (document.getElementById('viewerContainer') as HTMLElement).scrollTop = pack.scrollTop;
                        (document.getElementById('viewerContainer') as HTMLElement).scrollLeft = pack.scrollLeft
                    }, {once: true})
                    this.onDidRenderPdfFile( () => {
                        this.send({type:'loaded', path:this.pdfFilePath})
                    }, {once: true})
                    break
                }
                case 'params': {
                    if (data.hand) {
                        PDFViewerApplication.pdfCursorTools.handTool.activate()
                    } else {
                        PDFViewerApplication.pdfCursorTools.handTool.deactivate()
                    }
                    if (!this.isRestoredWithSerializer) {
                        this.restorePdfViewerState(data)
                    }
                    if (data.invertMode.enabled) {
                        const { brightness, grayscale, hueRotate, invert, sepia } = data.invertMode
                        const filter = `invert(${invert * 100}%) hue-rotate(${hueRotate}deg) grayscale(${grayscale}) sepia(${sepia}) brightness(${brightness})`;
                        (document.querySelector('html') as HTMLHtmlElement).style.filter = filter;
                        (document.querySelector('html') as HTMLHtmlElement).style.background = 'white'
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

        this.socket.onclose = () => {
            document.title = `[Disconnected] ${this.documentTitle}`
            console.log('Closed: WebScocket to LaTeX Workshop.')

            // Since WebSockets are disconnected when PC resumes from sleep,
            // we have to reconnect. https://github.com/James-Yu/LaTeX-Workshop/pull/1812
            setTimeout( () => {
                console.log('Try to reconnect to LaTeX Workshop.')
                const sock = new WebSocket(this.server)
                this.socket = sock
                utils.callCbOnDidOpenWebSocket(sock, () => {
                    document.title = this.documentTitle
                    this.setupWebSocket()
                    console.log('Reconnected: WebScocket to LaTeX Workshop.')
                })
            }, 3000)
        }
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
        const buttonSpacerMaxWidth = 520 + numPagesWidth + scaleWidth + printerButtonWidth
        const buttonSpacerRule = `@media all and (max-width: ${buttonSpacerMaxWidth}px) { .toolbarButtonSpacer { width: 0; } }`
        styleSheet.insertRule(buttonSpacerRule)
        const scaleMaxWidth = 480 + numPagesWidth + scaleWidth + printerButtonWidth
        const scaleRule = `@media all and (max-width: ${scaleMaxWidth}px) { #scaleSelectContainer { display: none; } }`
        styleSheet.insertRule(scaleRule)
        const trimMaxWidth = 480 + numPagesWidth + printerButtonWidth
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
                const pdfFilePath = utils.decodePath(encodedPdfFilePath)
                const documentTitle = pdfFilePath.split(/[\\/]/).pop()
                return {encodedPdfFilePath, pdfFilePath, documentTitle}
            }
        }
        throw new Error('file not given in the query.')
    }

    private hidePrintButton() {
        const query = document.location.search.substring(1)
        const parts = query.split('&')
        for (let i = 0, ii = parts.length; i < ii; ++i) {
            const param = parts[i].split('=')
            if (param[0].toLowerCase() === 'incode' && param[1] === '1') {
                const dom = document.getElementsByClassName('print') as HTMLCollectionOf<HTMLElement>
                for (const item of dom) {
                    item.style.display='none'
                }
            }
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

    startConnectionKeeper() {
        // Send packets every 30 sec to prevent the connection closed by timeout.
        setInterval( () => {
            if (this.socket.readyState === 1) {
                this.send({type: 'ping'})
            }
        }, 30000)
    }

    private sendToPanelManager(msg: PanelRequest) {
        if (!this.embedded) {
            return
        }
        window.parent.postMessage(msg, '*')
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
        const events = ['scroll', 'scalechanged', 'zoomin', 'zoomout', 'zoomreset', 'scrollmodechanged', 'spreadmodechanged', 'pagenumberchanged']
        for (const ev of events) {
            this.getEventBus().then(eventBus => {
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
                    this.restorePdfViewerState(data.state)
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
