import {IConnectionPort, createConnectionPort} from './components/connection.js'
import {editHTML} from './components/htmleditor.js'
import {SyncTex} from './components/synctex.js'
import * as utils from './components/utils.js'
import {ExternalPromise} from './components/externalpromise.js'
import {ViewerHistory} from './components/viewerhistory.js'

import type {PdfjsEventName, IDisposable, ILatexWorkshopPdfViewer, IPDFViewerApplication, IPDFViewerApplicationOptions} from './components/interface.js'
import type {ClientRequest, ServerResponse, PanelManagerResponse, PanelRequest, PdfViewerParams, PdfViewerState, SynctexData, SynctexRangeData} from '../types/latex-workshop-protocol-types/index'
import { changePDFViewerTrim, registerPDFViewerTrim } from './components/trimming.js'

declare const pdfjsLib: any
declare const PDFViewerApplication: IPDFViewerApplication
declare const PDFViewerApplicationOptions: IPDFViewerApplicationOptions

class LateXWorkshopPdfViewer implements ILatexWorkshopPdfViewer {
    readonly documentTitle: string = ''
    readonly embedded = window.parent !== window
    readonly encodedPdfFilePath: string
    readonly pdfFileUri: string
    readonly synctex: SyncTex
    readonly viewerHistory: ViewerHistory

    private hideToolbarInterval: number | undefined

    private connectionPort: IConnectionPort
    private pdfPagesLoaded: Promise<void>
    private readonly pdfViewerStarted: Promise<void>
    private synctexEnabled = true
    private autoReloadEnabled = true
    private readonly setupAppOptionsPromise = new ExternalPromise<void>()
    readonly #restoredState = new ExternalPromise<PdfViewerState | undefined>()

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

        editHTML()

        this.viewerHistory = new ViewerHistory(this)
        this.connectionPort = createConnectionPort(this)
        this.synctex = new SyncTex(this)

        this.setupConnectionPort()
            .catch((e) => console.error('Setting up connection port failed:', e))

        this.onDidStartPdfViewer(() => {
            return this.applyParamsOnStart()
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
        this.onViewUpdated(() => this.repositionDOM())
        void this.setupAppOptions()
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

    onDidStartPdfViewer(cb: () => unknown): IDisposable {
        const documentLoadedEvent = 'documentloaded'
        const cb0 = () => {
            cb()
            PDFViewerApplication.eventBus.off(documentLoadedEvent, cb0)
        }
        void getPDFViewerEventBus().then(eventBus => {
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
        void getPDFViewerEventBus().then(eventBus => {
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
        void getPDFViewerEventBus().then(eventBus => {
            eventBus.on(pagesLoadedEvent, cb0)
        })
        return { dispose: () => PDFViewerApplication.eventBus.off(pagesLoadedEvent, cb0) }
    }

    onViewUpdated(cb: () => unknown, option?: {once: boolean}): IDisposable {
        const viewUpdatedEvent = 'updateviewarea'
        const cb0 = () => {
            cb()
            if (option?.once) {
                PDFViewerApplication.eventBus.off(viewUpdatedEvent, cb0)
            }
        }
        void getPDFViewerEventBus().then(eventBus => {
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

    private getPdfViewerState(): PdfViewerState {
        const pack: PdfViewerState = {
            pdfFileUri: this.pdfFileUri,
            scale: PDFViewerApplication.pdfViewer.currentScaleValue,
            scrollMode: PDFViewerApplication.pdfViewer.scrollMode,
            sidebarView: PDFViewerApplication.pdfSidebar.visibleView,
            spreadMode: PDFViewerApplication.pdfViewer.spreadMode,
            scrollTop: (document.getElementById('viewerContainer') as HTMLElement).scrollTop,
            scrollLeft: (document.getElementById('viewerContainer') as HTMLElement).scrollLeft,
            synctexEnabled: this.synctexEnabled,
            autoReloadEnabled: this.autoReloadEnabled
        }
        return pack
    }

    private async fetchParams(): Promise<PdfViewerParams> {
        const response = await fetch('config.json')
        const params = await response.json() as PdfViewerParams
        return params
    }

    private get restoredState() {
        if (this.embedded) {
            return this.#restoredState.promise
        } else {
            return
        }
    }

    async waitSetupAppOptionsFinished() {
        return this.setupAppOptionsPromise.promise
    }

    private async setupAppOptions() {
        const workerPort = new Worker('build/pdf.worker.mjs', { type: 'module' })
        const params = await this.fetchParams()
        document.addEventListener('webviewerloaded', () => {
            const color = this.isPrefersColorSchemeDark(params.codeColorTheme) ? params.color.dark : params.color.light
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
        this.setupAppOptionsPromise.resolve()
    }

    private async applyParamsOnStart() {
        const params = await this.fetchParams()
        this.applyNonStatefulParams(params)
        const restoredState = await this.restoredState
        if (restoredState) {
            await this.restorePdfViewerState(restoredState)
        } else {
            await this.restorePdfViewerState(params)
        }
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
        if (state.sidebarView !== undefined) {
            PDFViewerApplication.pdfSidebar.switchView(state.sidebarView)
        }
        if (state.synctexEnabled !== undefined) {
            this.setSynctex(state.synctexEnabled)
        }
        if (state.autoReloadEnabled !== undefined) {
            this.setAutoReload(state.autoReloadEnabled)
        }
        this.sendCurrentStateToPanelManager()
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

            const { scrollX, scrollY } = this.scrollToPosition(page, pos_left_top[0], pos_left_top[1])

            if (record.indicator) {
                const width_px = pos_right_down[0] - pos_left_top[0]
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

    private prevPack: {
        scale: string,
        scrollMode: number,
        sidebarView: number,
        spreadMode: number,
        scrollTop: number,
        scrollLeft: number
    } | undefined
    private async refreshPDFViewer() {
        if (!this.autoReloadEnabled) {
            this.addLogMessage('Auto reload temporarily disabled.')
            return
        }
        // Fail-safe. For unknown reasons, the pack may have null values #4076
        const pack = {
            scale: PDFViewerApplication.pdfViewer.currentScaleValue ?? this.prevPack?.scale,
            scrollMode: PDFViewerApplication.pdfViewer.scrollMode ?? this.prevPack?.scrollMode,
            sidebarView: PDFViewerApplication.pdfSidebar.visibleView ?? this.prevPack?.sidebarView,
            spreadMode: PDFViewerApplication.pdfViewer.spreadMode ?? this.prevPack?.spreadMode,
            scrollTop: (document.getElementById('viewerContainer') as HTMLElement).scrollTop ?? this.prevPack?.scrollTop,
            scrollLeft: (document.getElementById('viewerContainer') as HTMLElement).scrollLeft ?? this.prevPack?.scrollLeft
        }
        this.prevPack = pack

        // Note: without showPreviousViewOnLoad = false restoring the position after the refresh will fail if
        // the user has clicked on any link in the past (pdf.js will automatically navigate to that link).
        PDFViewerApplicationOptions.set('showPreviousViewOnLoad', false)
        // Override the spread mode specified in PDF documents with the current one.
        // https://github.com/James-Yu/LaTeX-Workshop/issues/1871
        if (typeof pack.spreadMode === 'number') {
            PDFViewerApplicationOptions.set('spreadModeOnLoad', pack.spreadMode)
        }

        // eslint-disable-next-line
        PDFViewerApplication.load(await pdfjsLib.getDocument(`/${utils.pdfFilePrefix}${this.encodedPdfFilePath}`).promise)
        // reset the document title to the original value to avoid duplication
        document.title = this.documentTitle
        this.onPagesInit(() => {
            if (pack.sidebarView) {
                PDFViewerApplication.pdfSidebar.switchView(pack.sidebarView)
            }
            if (['number', 'string'].includes(typeof pack.scale) && PDFViewerApplication.pdfViewer.currentScaleValue !== pack.scale) {
                PDFViewerApplication.pdfViewer.currentScaleValue = pack.scale
            }
            if (typeof pack.scrollMode === 'number' && PDFViewerApplication.pdfViewer.scrollMode !== pack.scrollMode) {
                PDFViewerApplication.pdfViewer.scrollMode = pack.scrollMode
            }
            if (typeof pack.spreadMode === 'number' && PDFViewerApplication.pdfViewer.spreadMode !== pack.spreadMode) {
                PDFViewerApplication.pdfViewer.spreadMode = pack.spreadMode
            }
            const viewerContainer: HTMLElement | null = document.getElementById('viewerContainer')
            if (viewerContainer === null) {
                return
            }
            if (typeof pack.scrollTop === 'number' && viewerContainer.scrollTop !== pack.scrollTop) {
                viewerContainer.scrollTop = pack.scrollTop
            }
            if (typeof pack.scrollLeft === 'number' && viewerContainer.scrollLeft !== pack.scrollLeft) {
                viewerContainer.scrollLeft = pack.scrollLeft
            }
        }, {once: true})
        // The height of each page can change after a `pagesinit` event.
        // We have to set scrollTop on a `pagesloaded` event for that case.
        this.onPagesLoaded(() => {
            const viewerContainer: HTMLElement | null = document.getElementById('viewerContainer')
            if (viewerContainer === null) {
                return
            }
            if (typeof pack.scrollTop === 'number' && viewerContainer.scrollTop !== pack.scrollTop) {
                viewerContainer.scrollTop = pack.scrollTop
            }
            if (typeof pack.scrollLeft === 'number' && viewerContainer.scrollLeft !== pack.scrollLeft) {
                viewerContainer.scrollLeft = pack.scrollLeft
            }
        }, {once: true})
        this.onPagesLoaded(() => {
            this.send({type:'loaded', pdfFileUri: this.pdfFileUri})
        }, {once: true})
    }

    isPrefersColorSchemeDark(codeColorTheme: 'light' | 'dark') {
        if (this.embedded) {
            return codeColorTheme === 'dark'
        }
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    private applyNonStatefulParams(params: PdfViewerParams) {
        PDFViewerApplication.pdfCursorTools.switchTool(params.hand ? 1 : 0)
        if (params.invertMode.enabled) {
            const { brightness, grayscale, hueRotate, invert, sepia } = params.invertMode
            const filter = `invert(${invert * 100}%) hue-rotate(${hueRotate}deg) grayscale(${grayscale}) sepia(${sepia}) brightness(${brightness})`
            if (this.isPrefersColorSchemeDark(params.codeColorTheme)) {
                (document.querySelector('#viewerContainer') as HTMLHtmlElement).style.filter = filter
                ;(document.querySelector('#thumbnailView') as HTMLHtmlElement).style.filter = filter
                ;(document.querySelector('#sidebarContent') as HTMLHtmlElement).style.background = 'var(--body-bg-color)'
            } else {
                (document.querySelector('html') as HTMLHtmlElement).style.filter = filter
                ;(document.querySelector('html') as HTMLHtmlElement).style.background = 'white'
            }
        }
        const css = document.styleSheets[document.styleSheets.length - 1]
        if (this.isPrefersColorSchemeDark(params.codeColorTheme)) {
            (document.querySelector('#viewerContainer') as HTMLElement).style.background = params.color.dark.backgroundColor
            css.insertRule(`.pdfViewer.removePageBorders .page {box-shadow: 0px 0px 0px 1px ${params.color.dark.pageBorderColor}}`, css.cssRules.length)
        } else {
            (document.querySelector('#viewerContainer') as HTMLElement).style.background = params.color.light.backgroundColor
            css.insertRule(`.pdfViewer.removePageBorders .page {box-shadow: 0px 0px 0px 1px ${params.color.light.pageBorderColor}}`, css.cssRules.length)
        }

        if (params.keybindings) {
            this.synctex.reverseSynctexKeybinding = params.keybindings['synctex']
            this.synctex.registerListenerOnEachPage()
        }

        changePDFViewerTrim(params.trim)
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
                    void this.refreshPDFViewer()
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

    private setSynctex(flag: boolean) {
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

    private setAutoReload(flag: boolean) {
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
            void getPDFViewerEventBus().then(eventBus => {
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
                    if (data.state.kind !== 'not_stored') {
                        this.#restoredState.resolve(data.state)
                    } else {
                        this.#restoredState.resolve(undefined)
                    }
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
async function getPDFViewerEventBus() {
    await webViewerLoaded
    await PDFViewerApplication.initializedPromise
    return PDFViewerApplication.eventBus
}

export function onPDFViewerEvent(event: 'pagesloaded', cb: () => unknown, option?: { once: boolean }): IDisposable {
    const cb0 = () => {
        cb()
        if (option?.once) { PDFViewerApplication.eventBus.off(event, cb0) }
    }
    void getPDFViewerEventBus().then(eventBus => eventBus.on(event, cb0))
    return { dispose: () => PDFViewerApplication.eventBus.off(event, cb0) }
}


async function sleep(timeout: number) {
    await new Promise((resolve) => setTimeout(resolve, timeout))
}

const extension = new LateXWorkshopPdfViewer()
await extension.waitSetupAppOptionsFinished()
onPDFViewerEvent('pagesloaded', registerPDFViewerTrim)

// @ts-expect-error Must import viewer.mjs here, otherwise some config won't work. #4096
await import('../../viewer/viewer.mjs')
