import * as vscode from 'vscode'
import type ws from 'ws'
import * as path from 'path'
import * as cs from 'cross-spawn'

import type {Extension} from '../main'
import type {SyncTeXRecordForward} from './locator'
import {openWebviewPanel} from '../utils/webview'

import type {ClientRequest, ServerResponse, PanelRequest, PdfViewerState} from '../../viewer/components/protocol'
import {escapeHtml} from '../utils/utils'
import {getCurrentThemeLightness} from '../utils/theme'

export {PdfViewerHookProvider} from './viewerlib/pdfviewerhook'

class Client {
    readonly viewer: 'browser' | 'tab'
    readonly websocket: ws
    private readonly disposables = new Set<vscode.Disposable>()

    constructor(viewer: 'browser' | 'tab', websocket: ws) {
        this.viewer = viewer
        this.websocket = websocket
        this.websocket.on('close', () => {
            this.disposeDisposables()
        })
    }

    private disposeDisposables() {
        vscode.Disposable.from(...this.disposables).dispose()
        this.disposables.clear()
    }

    onDidDispose(cb: () => unknown) {
        this.disposables.add( { dispose: cb } )
    }

    send(message: ServerResponse) {
        this.websocket.send(JSON.stringify(message))
    }
}

class PdfViewerPanel {
    readonly webviewPanel: vscode.WebviewPanel
    readonly pdfFileUri: vscode.Uri
    private _state?: PdfViewerState

    constructor(pdfFileUri: vscode.Uri, panel: vscode.WebviewPanel) {
        this.pdfFileUri = pdfFileUri
        this.webviewPanel = panel
        panel.webview.onDidReceiveMessage((msg: PanelRequest) => {
            switch(msg.type) {
                case 'state': {
                    this._state = msg.state
                    break
                }
                default: {
                    break
                }
            }
        })
    }

    get state() {
        return this._state
    }

}

class PdfViewerPanelSerializer implements vscode.WebviewPanelSerializer {
    private readonly extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    async deserializeWebviewPanel(panel: vscode.WebviewPanel, argState: {state: PdfViewerState}): Promise<void> {
        this.extension.logger.addLogMessage(`Restoring the PDF viewer at the column ${panel.viewColumn} from the state: ${JSON.stringify(argState)}`)
        const state = argState.state
        let pdfFileUri: vscode.Uri | undefined
        if (state.path) {
            pdfFileUri = vscode.Uri.file(state.path)
        } else if (state.pdfFileUri) {
            pdfFileUri = vscode.Uri.parse(state.pdfFileUri, true)
        }
        if (!pdfFileUri) {
            this.extension.logger.addLogMessage('Error of restoring PDF viewer: the path of PDF file is undefined.')
            panel.webview.html = '<!DOCTYPE html> <html lang="en"><meta charset="utf-8"/><br>The path of PDF file is undefined.</html>'
            return
        }
        if (! await this.extension.lwfs.exists(pdfFileUri)) {
            const s = escapeHtml(pdfFileUri.toString())
            this.extension.logger.addLogMessage(`Error of restoring PDF viewer: file not found ${pdfFileUri.toString(true)}.`)
            panel.webview.html = `<!DOCTYPE html> <html lang="en"><meta charset="utf-8"/><br>File not found: ${s}</html>`
            return
        }
        panel.webview.html = await this.extension.viewer.getPDFViewerContent(pdfFileUri)
        this.extension.viewer.initiatePdfViewerPanel(pdfFileUri, panel)
        return
    }

}

export class Viewer {
    private readonly extension: Extension
    private readonly webviewPanelMap = new Map<string, Set<PdfViewerPanel>>()
    private readonly clientMap = new Map<string, Set<Client>>()
    readonly pdfViewerPanelSerializer: PdfViewerPanelSerializer

    constructor(extension: Extension) {
        this.extension = extension
        this.pdfViewerPanelSerializer = new PdfViewerPanelSerializer(extension)
    }

    private encodePathWithPrefix(pdfFileUri: vscode.Uri) {
        return this.extension.server.pdfFilePathEncoder.encodePathWithPrefix(pdfFileUri)
    }

    private toKey(pdfFileUri: vscode.Uri): string {
        return pdfFileUri.toString(true).toLocaleUpperCase()
    }

    private createClientSet(pdfFileUri: vscode.Uri) {
        const key = this.toKey(pdfFileUri)
        if (!this.clientMap.has(key)) {
            this.clientMap.set(key, new Set())
        }
        if (!this.webviewPanelMap.has(key)) {
            this.webviewPanelMap.set(key, new Set())
        }
    }

    /**
     * Only for backward compatibility.
     * @deprecated
     */
    get clients(): { [key: string]: Set<unknown> } {
        const ret = Object.create(null) as { [key: string]: Set<unknown> }
        this.clientMap.forEach((clientSet, key) => {
            ret[key] = new Set(Array.from(clientSet).map(() => Object.create(null) as unknown ))
        })
        return ret
    }

    /**
     * Returns the set of client instances of a PDF file.
     * Returns `undefined` if the viewer have not recieved any request for the PDF file.
     *
     * @param pdfFileUri The path of a PDF file.
     */
    getClientSet(pdfFileUri: vscode.Uri): Set<Client> | undefined {
        return this.clientMap.get(this.toKey(pdfFileUri))
    }

    private getPanelSet(pdfFileUri: vscode.Uri) {
        return this.webviewPanelMap.get(this.toKey(pdfFileUri))
    }

    /**
     * Refreshes PDF viewers of `sourceFile`.
     *
     * @param sourceFile The path of a LaTeX file. If `sourceFile` is `undefined`,
     * refreshes all the PDF viewers.
     */
    refreshExistingViewer(sourceFile?: string) {
        this.extension.logger.addLogMessage(`Call refreshExistingViewer: ${JSON.stringify({sourceFile})}`)
        if (sourceFile === undefined) {
            this.clientMap.forEach(clientSet => {
                clientSet.forEach(client => {
                    client.send({type: 'refresh'})
                })
            })
            return
        }
        const pdfFile = this.tex2pdf(sourceFile, true)
        const clientSet = this.getClientSet(pdfFile)
        if (!clientSet) {
            this.extension.logger.addLogMessage(`Not found PDF viewers to refresh: ${pdfFile}`)
            return
        }
        this.extension.logger.addLogMessage(`Refresh PDF viewer: ${pdfFile}`)
        clientSet.forEach(client => {
            client.send({type: 'refresh'})
        })
    }

    private async checkViewer(sourceFile: string, respectOutDir: boolean = true) {
        const pdfFile = this.tex2pdf(sourceFile, respectOutDir)
        if (! await this.extension.lwfs.exists(pdfFile)) {
            this.extension.logger.addLogMessage(`Cannot find PDF file ${pdfFile}`)
            this.extension.logger.displayStatus('check', 'statusBar.foreground', `Cannot view file PDF file. File not found: ${pdfFile}`, 'warning')
            return
        }
        const url = `http://127.0.0.1:${this.extension.server.port}/viewer.html?file=${this.encodePathWithPrefix(pdfFile)}`
        this.extension.logger.addLogMessage(`Serving PDF file at ${url}`)
        this.extension.logger.addLogMessage(`The encoded path is ${pdfFile}`)
        return url
    }

    /**
     * Opens the PDF file of `sourceFile` in the browser.
     *
     * @param sourceFile The path of a LaTeX file.
     */
    async openBrowser(sourceFile: string) {
        const url = await this.checkViewer(sourceFile, true)
        if (!url) {
            return
        }
        const pdfFileUri = this.tex2pdf(sourceFile)
        this.createClientSet(pdfFileUri)
        this.extension.manager.watchPdfFile(pdfFileUri)
        try {
            await vscode.env.openExternal(vscode.Uri.parse(url, true))
            this.extension.logger.addLogMessage(`Open PDF viewer for ${pdfFileUri.toString(true)}`)
        } catch (e: unknown) {
            void vscode.window.showInputBox({
                prompt: 'Unable to open browser. Please copy and visit this link.',
                value: url
            })
            this.extension.logger.addLogMessage(`Something bad happened when opening PDF viewer for ${pdfFileUri.toString(true)}`)
            if (e instanceof Error) {
                this.extension.logger.logError(e)
            }
        }
    }

    private tex2pdf(sourceFile: string, respectOutDir?: boolean) {
        const pdfFilePath = this.extension.manager.tex2pdf(sourceFile, respectOutDir)
        return vscode.Uri.file(pdfFilePath)
    }

    /**
     * Opens the PDF file of `sourceFile` in the internal PDF viewer.
     *
     * @param sourceFile The path of a LaTeX file.
     * @param respectOutDir
     * @param tabEditorGroup
     * @param preserveFocus
     */
    async openTab(sourceFile: string, respectOutDir: boolean, tabEditorGroup: string, preserveFocus = true) {
        const url = await this.checkViewer(sourceFile, respectOutDir)
        if (!url) {
            return
        }
        const pdfFile = this.tex2pdf(sourceFile, respectOutDir)
        return this.openPdfInTab(pdfFile, tabEditorGroup, preserveFocus)
    }

    async openPdfInTab(pdfFileUri: vscode.Uri, tabEditorGroup: string, preserveFocus = true) {
        const activeDocument = vscode.window.activeTextEditor?.document
        const panel = await this.createPdfViewerPanel(pdfFileUri, vscode.ViewColumn.Active)
        if (!panel) {
            return
        }
        if (activeDocument) {
            await openWebviewPanel(panel.webviewPanel, tabEditorGroup, activeDocument, preserveFocus)
        }
        this.extension.logger.addLogMessage(`Open PDF tab for ${pdfFileUri.toString(true)}`)
    }

    private async createPdfViewerPanel(pdfFileUri: vscode.Uri, viewColumn: vscode.ViewColumn): Promise<PdfViewerPanel | undefined> {
        const htmlContent = await this.getPDFViewerContent(pdfFileUri)
        const panel = vscode.window.createWebviewPanel('latex-workshop-pdf', path.basename(pdfFileUri.path), viewColumn, {
            enableScripts: true,
            retainContextWhenHidden: true
        })
        panel.webview.html = htmlContent
        return this.initiatePdfViewerPanel(pdfFileUri, panel)
    }

    initiatePdfViewerPanel(pdfFileUri: vscode.Uri, panel: vscode.WebviewPanel) {
        this.extension.manager.watchPdfFile(pdfFileUri)
        const pdfPanel = new PdfViewerPanel(pdfFileUri, panel)
        this.createClientSet(pdfPanel.pdfFileUri)
        const panelSet = this.getPanelSet(pdfPanel.pdfFileUri)
        if (!panelSet) {
            return
        }
        panelSet.add(pdfPanel)
        pdfPanel.webviewPanel.onDidDispose(() => {
            panelSet.delete(pdfPanel)
        })
        return pdfPanel
    }

    private getKeyboardEventConfig(): boolean {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const setting: 'auto' | 'force' | 'never' = configuration.get('viewer.pdf.internal.keyboardEvent', 'auto')
        if (setting === 'auto') {
            return true
        } else if (setting === 'force') {
            return true
        } else {
            return false
        }
    }

    /**
     * Returns the HTML content of the internal PDF viewer.
     *
     * @param pdfFile The path of a PDF file to be opened.
     */
    async getPDFViewerContent(pdfFile: vscode.Uri): Promise<string> {
        const serverPort = this.extension.server.port
        // viewer/viewer.js automatically requests the file to server.ts, and server.ts decodes the encoded path of PDF file.
        const origUrl = `http://127.0.0.1:${serverPort}/viewer.html?incode=1&file=${this.encodePathWithPrefix(pdfFile)}`
        const url = await vscode.env.asExternalUri(vscode.Uri.parse(origUrl, true))
        const iframeSrcOrigin = `${url.scheme}://${url.authority}`
        const iframeSrcUrl = url.toString(true)
        this.extension.logger.addLogMessage(`The internal PDF viewer url: ${iframeSrcUrl}`)
        const rebroadcast: boolean = this.getKeyboardEventConfig()
        return `
            <!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; frame-src ${iframeSrcOrigin}; script-src 'unsafe-inline'; style-src 'unsafe-inline';"></head>
            <body><iframe id="preview-panel" class="preview-panel" src="${iframeSrcUrl}" style="position:absolute; border: none; left: 0; top: 0; width: 100%; height: 100%;">
            </iframe>
            <script>
            // When the tab gets focus again later, move the
            // the focus to the iframe so that keyboard navigation works in the pdf.
            const iframe = document.getElementById('preview-panel');
            window.onfocus = function() {
                setTimeout(function() { // doesn't work immediately
                    iframe.contentWindow.focus();
                }, 100);
            }

            const vsStore = acquireVsCodeApi();
            // To enable keyboard shortcuts of VS Code when the iframe is focused,
            // we have to dispatch keyboard events in the parent window.
            // See https://github.com/microsoft/vscode/issues/65452#issuecomment-586036474
            window.addEventListener('message', (e) => {
                if (e.origin !== '${iframeSrcOrigin}') {
                    return;
                }
                switch (e.data.type) {
                    case 'initialized': {
                        const state = vsStore.getState();
                        if (state) {
                            state.type = 'restore_state';
                            iframe.contentWindow.postMessage(state, '${iframeSrcOrigin}');
                        }
                        break;
                    }
                    case 'keyboard_event': {
                        if (${rebroadcast}) {
                            window.dispatchEvent(new KeyboardEvent('keydown', e.data.event));
                        }
                        break;
                    }
                    case 'state': {
                        vsStore.setState(e.data);
                        break;
                    }
                    default:
                        break;
                }
                vsStore.postMessage(e.data)
            });
            </script>
            </body></html>
        `
    }

    /**
     * Opens the PDF file of `sourceFile` in the external PDF viewer.
     *
     * @param sourceFile The path of a LaTeX file.
     */
    openExternal(sourceFile: string) {
        const pdfFile = this.extension.manager.tex2pdf(sourceFile)
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        let command = configuration.get('view.pdf.external.viewer.command') as string
        let args = configuration.get('view.pdf.external.viewer.args') as string[]
        if (!command) {
            switch (process.platform) {
                case 'win32':
                    command = 'SumatraPDF.exe'
                    args = ['%PDF%']
                    break
                case 'linux':
                    command = 'xdg-open'
                    args = ['%PDF%']
                    break
                case 'darwin':
                    command = 'open'
                    args = ['%PDF%']
                    break
                default:
                    break
            }
        }
        if (args) {
            args = args.map(arg => arg.replace('%PDF%', pdfFile))
        }
        this.extension.logger.addLogMessage(`Execute the external PDF viewer: ${command}, ${args}`)
        cs.spawn(command, args, {cwd: path.dirname(sourceFile), detached: true})
        this.extension.logger.addLogMessage(`Open external viewer for ${pdfFile}`)
    }

    private findClient(pdfFileUri: vscode.Uri, websocket: ws): Client | undefined {
        const clientSet = this.getClientSet(pdfFileUri)
        if (clientSet === undefined) {
            return
        }
        for (const client of clientSet) {
            if (client.websocket === websocket) {
                return client
            }
        }
        return
    }

    /**
     * Handles the request from the internal PDF viewer.
     *
     * @param websocket The WebSocket connecting with the viewer.
     * @param msg A message from the viewer in JSON fromat.
     */
    handler(websocket: ws, msg: string) {
        const data = JSON.parse(msg) as ClientRequest
        if (data.type !== 'ping') {
            this.extension.logger.addLogMessage(`Handle data type: ${data.type}`)
        }
        switch (data.type) {
            case 'open': {
                const pdfFileUri = vscode.Uri.parse(data.pdfFileUri, true)
                const clientSet = this.getClientSet(pdfFileUri)
                if (clientSet === undefined) {
                    break
                }
                const client = new Client(data.viewer, websocket)
                clientSet.add(client)
                client.onDidDispose(() => {
                    clientSet.delete(client)
                })
                break
            }
            case 'request_params': {
                const pdfFileUri = vscode.Uri.parse(data.pdfFileUri, true)
                const client = this.findClient(pdfFileUri, websocket)
                if (client === undefined) {
                    break
                }
                const configuration = vscode.workspace.getConfiguration('latex-workshop')
                const invertType = configuration.get('view.pdf.invertMode.enabled') as string
                const invertEnabled = (invertType === 'auto' && (getCurrentThemeLightness() === 'dark')) ||
                invertType === 'always' ||
                (invertType === 'compat' && ((configuration.get('view.pdf.invert') as number) > 0))
                const pack: ServerResponse = {
                    type: 'params',
                    scale: configuration.get('view.pdf.zoom') as string,
                    trim: configuration.get('view.pdf.trim') as number,
                    scrollMode: configuration.get('view.pdf.scrollMode') as number,
                    spreadMode: configuration.get('view.pdf.spreadMode') as number,
                    hand: configuration.get('view.pdf.hand') as boolean,
                    invertMode: {
                        enabled: invertEnabled,
                        brightness: configuration.get('view.pdf.invertMode.brightness') as number,
                        grayscale: configuration.get('view.pdf.invertMode.grayscale') as number,
                        hueRotate: configuration.get('view.pdf.invertMode.hueRotate') as number,
                        invert: configuration.get('view.pdf.invert') as number,
                        sepia: configuration.get('view.pdf.invertMode.sepia') as number,
                    },
                    bgColor: configuration.get('view.pdf.backgroundColor') as string,
                    keybindings: {
                        synctex: configuration.get('view.pdf.internal.synctex.keybinding') as 'ctrl-click' | 'double-click'
                    }
                }
                this.extension.logger.addLogMessage(`Sending the settings of the PDF viewer for initialization: ${JSON.stringify(pack)}`)
                client.send(pack)
                break
            }
            case 'loaded': {
                const configuration = vscode.workspace.getConfiguration('latex-workshop')
                if (configuration.get('synctex.afterBuild.enabled') as boolean) {
                    this.extension.logger.addLogMessage('SyncTex after build invoked.')
                    const uri = vscode.Uri.parse(data.pdfFileUri, true)
                    this.extension.locator.syncTeX(undefined, undefined, uri.fsPath)
                }
                break
            }
            case 'reverse_synctex': {
                const uri = vscode.Uri.parse(data.pdfFileUri, true)
                void this.extension.locator.locate(data, uri.fsPath)
                break
            }
            case 'ping': {
                // nothing to do
                break
            }
            case 'add_log': {
                this.extension.logger.addLogMessage(`[PDF Viewer] ${data.message}`)
                break
            }
            default: {
                this.extension.logger.addLogMessage(`Unknown websocket message: ${msg}`)
                break
            }
        }
    }

    /**
     * Reveals the position of `record` on the internal PDF viewers.
     *
     * @param pdfFile The path of a PDF file.
     * @param record The position to be revealed.
     */
    syncTeX(pdfFile: string, record: SyncTeXRecordForward) {
        const pdfFileUri = vscode.Uri.file(pdfFile)
        const clientSet = this.getClientSet(pdfFileUri)
        if (clientSet === undefined) {
            this.extension.logger.addLogMessage(`PDF is not viewed: ${pdfFile}`)
            return
        }
        const needDelay = this.revealWebviewPanel(pdfFileUri)
        for (const client of clientSet) {
            setTimeout(() => {
                client.send({type: 'synctex', data: record})
            }, needDelay ? 200 : 0)
            this.extension.logger.addLogMessage(`Try to synctex ${pdfFile}`)
        }
    }

    /**
     * Reveals the internal PDF viewer of `pdfFileUri`.
     * The first one is revealed.
     *
     * @param pdfFileUri The path of a PDF file.
     * @returns Returns `true` if `WebviewPanel.reveal` called.
     */
    private revealWebviewPanel(pdfFileUri: vscode.Uri) {
        const panelSet = this.getPanelSet(pdfFileUri)
        if (!panelSet) {
            return
        }
        for (const panel of panelSet) {
            const isSyntexOn = !panel.state || panel.state.synctexEnabled
            if (panel.webviewPanel.visible && isSyntexOn) {
                return
            }
        }
        const activeViewColumn = vscode.window.activeTextEditor?.viewColumn
        for (const panel of panelSet) {
            if (panel.webviewPanel.viewColumn !== activeViewColumn) {
                const isSyntexOn = !panel.state || panel.state.synctexEnabled
                if (!panel.webviewPanel.visible && isSyntexOn) {
                    panel.webviewPanel.reveal(undefined, true)
                    return true
                }
                return
            }
        }
        return
    }

    /**
     * Returns the state of the internal PDF viewer of `pdfFilePath`.
     *
     * @param pdfFileUri The path of a PDF file.
     */
    getViewerState(pdfFileUri: vscode.Uri): (PdfViewerState | undefined)[] {
        const panelSet = this.getPanelSet(pdfFileUri)
        if (!panelSet) {
            return []
        }
        return Array.from(panelSet).map( e => e.state )
    }

}
