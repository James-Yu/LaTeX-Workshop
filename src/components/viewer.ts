import * as vscode from 'vscode'
import * as fs from 'fs'
import * as os from 'os'
import type ws from 'ws'
import * as path from 'path'
import * as cs from 'cross-spawn'
import {escapeHtml} from '../utils/utils'

import type {Extension} from '../main'
import type {SyncTeXRecordForward} from './locator'
import {encodePathWithPrefix} from '../utils/encodepath'
import {openWebviewPanel} from '../utils/webview'

import type {ClientRequest, ServerResponse, PanelRequest, PdfViewerState} from '../../viewer/components/protocol'
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
    readonly pdfFilePath: string
    private _state?: PdfViewerState

    constructor(pdfFilePath: string, panel: vscode.WebviewPanel) {
        this.pdfFilePath = pdfFilePath
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

    async deserializeWebviewPanel(panel: vscode.WebviewPanel, state0: {state: PdfViewerState}): Promise<void> {
        this.extension.logger.addLogMessage(`Restoring the PDF viewer at the column ${panel.viewColumn} from the state: ${JSON.stringify(state0)}`)
        const state = state0.state
        const pdfFilePath = state.path
        if (!pdfFilePath) {
            this.extension.logger.addLogMessage('Error of restoring PDF viewer: the path of PDF file is undefined.')
            panel.webview.html = '<!DOCTYPE html> <html lang="en"><meta charset="utf-8"/><br>The path of PDF file is undefined.</html>'
            return
        }
        if (!fs.existsSync(pdfFilePath)) {
            const s = escapeHtml(pdfFilePath)
            this.extension.logger.addLogMessage(`Error of restoring PDF viewer: file not found ${pdfFilePath}.`)
            panel.webview.html = `<!DOCTYPE html> <html lang="en"><meta charset="utf-8"/><br>File not found: ${s}</html>`
            return
        }
        panel.webview.html = await this.extension.viewer.getPDFViewerContent(pdfFilePath)
        const pdfPanel = new PdfViewerPanel(pdfFilePath, panel)
        this.extension.viewer.pushPdfViewerPanel(pdfPanel)
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

    private createClientSet(pdfFilePath: string) {
        const key = pdfFilePath.toLocaleUpperCase()
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
     * @param pdfFilePath The path of a PDF file.
     */
    getClientSet(pdfFilePath: string): Set<Client> | undefined {
        return this.clientMap.get(pdfFilePath.toLocaleUpperCase())
    }

    private getPanelSet(pdfFilePath: string) {
        return this.webviewPanelMap.get(pdfFilePath.toLocaleUpperCase())
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
        const pdfFile = this.extension.manager.tex2pdf(sourceFile, true)
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

    private checkViewer(sourceFile: string, respectOutDir: boolean = true): string | undefined {
        const pdfFile = this.extension.manager.tex2pdf(sourceFile, respectOutDir)
        if (!fs.existsSync(pdfFile)) {
            this.extension.logger.addLogMessage(`Cannot find PDF file ${pdfFile}`)
            this.extension.logger.displayStatus('check', 'statusBar.foreground', `Cannot view file PDF file. File not found: ${pdfFile}`, 'warning')
            return
        }
        const url = `http://127.0.0.1:${this.extension.server.port}/viewer.html?file=${encodePathWithPrefix(pdfFile)}`
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
        const url = this.checkViewer(sourceFile, true)
        if (!url) {
            return
        }
        const pdfFile = this.extension.manager.tex2pdf(sourceFile)
        this.createClientSet(pdfFile)

        try {
            await vscode.env.openExternal(vscode.Uri.parse(url))
            this.extension.logger.addLogMessage(`Open PDF viewer for ${pdfFile}`)
        } catch (e) {
            void vscode.window.showInputBox({
                prompt: 'Unable to open browser. Please copy and visit this link.',
                value: url
            })
            this.extension.logger.addLogMessage(`Something bad happened when opening PDF viewer for ${pdfFile}: ${e}`)
        }
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
        const url = this.checkViewer(sourceFile, respectOutDir)
        if (!url) {
            return
        }
        const activeDocument = vscode.window.activeTextEditor?.document
        const pdfFile = this.extension.manager.tex2pdf(sourceFile, respectOutDir)
        const panel = await this.createPdfViewerPanel(pdfFile, vscode.ViewColumn.Active)
        if (!panel) {
            return
        }
        if (activeDocument) {
            await openWebviewPanel(panel.webviewPanel, tabEditorGroup, activeDocument, preserveFocus)
        }
        this.extension.logger.addLogMessage(`Open PDF tab for ${pdfFile}`)
    }

    private async createPdfViewerPanel(pdfFilePath: string, viewColumn: vscode.ViewColumn): Promise<PdfViewerPanel | undefined> {
        const htmlContent = await this.getPDFViewerContent(pdfFilePath)
        const panel = vscode.window.createWebviewPanel('latex-workshop-pdf', path.basename(pdfFilePath), viewColumn, {
            enableScripts: true,
            retainContextWhenHidden: true
        })
        panel.webview.html = htmlContent
        const pdfPanel = new PdfViewerPanel(pdfFilePath, panel)
        this.pushPdfViewerPanel(pdfPanel)
        return pdfPanel
    }

    pushPdfViewerPanel(pdfPanel: PdfViewerPanel) {
        this.createClientSet(pdfPanel.pdfFilePath)
        const panelSet = this.getPanelSet(pdfPanel.pdfFilePath)
        if (!panelSet) {
            return
        }
        panelSet.add(pdfPanel)
        pdfPanel.webviewPanel.onDidDispose(() => {
            panelSet.delete(pdfPanel)
        })
    }

    private getKeyboardEventConfig(): boolean {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const setting: 'auto' | 'force' | 'never' = configuration.get('viewer.pdf.internal.keyboardEvent', 'auto')
        if (setting === 'auto') {
            return os.platform() !== 'linux' || !!vscode.env.remoteName?.match(/^(dev-container|attached-container|wsl|ssh-remote)$/)
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
    async getPDFViewerContent(pdfFile: string): Promise<string> {
        const serverPort = this.extension.server.port
        // viewer/viewer.js automatically requests the file to server.ts, and server.ts decodes the encoded path of PDF file.
        const origUrl = `http://127.0.0.1:${serverPort}/viewer.html?incode=1&file=${encodePathWithPrefix(pdfFile)}`
        const url = await vscode.env.asExternalUri(vscode.Uri.parse(origUrl))
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
        this.extension.logger.addLogMessage(`Execute the external PDF viewer: command ${command}, args ${args}`)
        cs.spawn(command, args, {cwd: path.dirname(sourceFile), detached: true})
        this.extension.logger.addLogMessage(`Open external viewer for ${pdfFile}`)
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
                const clientSet = this.getClientSet(data.path)
                if (clientSet === undefined) {
                    return
                }
                const client = new Client(data.viewer, websocket)
                clientSet.add(client)
                client.onDidDispose(() => {
                    clientSet.delete(client)
                })
                break
            }
            case 'request_params': {
                const clientSet = this.getClientSet(data.path)
                if (!clientSet) {
                    break
                }
                for (const client of clientSet) {
                    if (client.websocket !== websocket) {
                        continue
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
                }
                break
            }
            case 'loaded': {
                const configuration = vscode.workspace.getConfiguration('latex-workshop')
                if (configuration.get('synctex.afterBuild.enabled') as boolean) {
                    this.extension.logger.addLogMessage('SyncTex after build invoked.')
                    this.extension.locator.syncTeX(undefined, undefined, decodeURIComponent(data.path))
                }
                break
            }
            case 'reverse_synctex': {
                void this.extension.locator.locate(data, data.path)
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
        const clientSet = this.getClientSet(pdfFile)
        if (clientSet === undefined) {
            this.extension.logger.addLogMessage(`PDF is not viewed: ${pdfFile}`)
            return
        }
        const needDelay = this.revealWebviewPanel(pdfFile)
        for (const client of clientSet) {
            setTimeout(() => {
                client.send({type: 'synctex', data: record})
            }, needDelay ? 200 : 0)
            this.extension.logger.addLogMessage(`Try to synctex ${pdfFile}`)
        }
    }

    /**
     * Reveals the internal PDF viewer of `pdfFilePath`.
     * The first one is revealed.
     *
     * @param pdfFilePath The path of a PDF file.
     * @returns Returns `true` if `WebviewPanel.reveal` called.
     */
    revealWebviewPanel(pdfFilePath: string) {
        const panelSet = this.getPanelSet(pdfFilePath)
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
     * @param pdfFilePath The path of a PDF file.
     */
    getViewerState(pdfFilePath: string): (PdfViewerState | undefined)[] {
        const panelSet = this.getPanelSet(pdfFilePath)
        if (!panelSet) {
            return []
        }
        return Array.from(panelSet).map( e => e.state )
    }

}
