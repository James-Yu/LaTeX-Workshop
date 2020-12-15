import * as vscode from 'vscode'
import * as fs from 'fs'
import * as os from 'os'
import type ws from 'ws'
import * as path from 'path'
import * as cs from 'cross-spawn'
import {escapeHtml} from '../utils/utils'

import type {Extension} from '../main'
import type {SyncTeXRecordForward} from './locator'
import {encodePathWithPrefix} from '../utils/utils'
import {openWebviewPanel} from '../utils/webview'

import type {ClientRequest, ServerResponse, PanelRequest, PdfViewerState} from '../../viewer/components/protocol'
import {getCurrentThemeLightness} from '../utils/theme'

class Client {
    readonly viewer: 'browser' | 'tab'
    readonly websocket: ws

    constructor(viewer: 'browser' | 'tab', websocket: ws) {
        this.viewer = viewer
        this.websocket = websocket
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

    async deserializeWebviewPanel(panel: vscode.WebviewPanel, state0: {state: PdfViewerState}) {
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
    private readonly webviewPanels: Map<string, Set<PdfViewerPanel>> = new Map()
    readonly clients: {[key: string]: Set<Client>} = {}
    readonly pdfViewerPanelSerializer: PdfViewerPanelSerializer

    constructor(extension: Extension) {
        this.extension = extension
        this.pdfViewerPanelSerializer = new PdfViewerPanelSerializer(extension)
    }

    private createClients(pdfFilePath: string) {
        const key = pdfFilePath.toLocaleUpperCase()
        this.clients[key] = this.clients[key] || new Set()
        if (!this.webviewPanels.has(key)) {
            this.webviewPanels.set(key, new Set())
        }
    }

    /**
     * Returns the set of client instances of a PDF file.
     * Returns `undefined` if the viewer have not recieved any request for the PDF file.
     *
     * @param pdfFilePath The path of a PDF file.
     */
    getClients(pdfFilePath: string): Set<Client> | undefined {
        return this.clients[pdfFilePath.toLocaleUpperCase()]
    }

    private getPanelSet(pdfFilePath: string) {
        return this.webviewPanels.get(pdfFilePath.toLocaleUpperCase())
    }

    /**
     * Refreshes PDF viewers of `sourceFile`. If `sourceFile` is `undefined`,
     * refreshes all the PDF viewers. If `sourceFile` and `viewer` are not `undefined`,
     * only the `viewer` is refreshed.
     *
     * @param sourceFile The path of a LaTeX file.
     * @param viewer The PDF viewer to be refreshed.
     */
    refreshExistingViewer(sourceFile?: string, viewer?: string): boolean {
        if (!sourceFile) {
            Object.keys(this.clients).forEach(key => {
                this.clients[key].forEach(client => {
                    client.send({type: 'refresh'})
                })
            })
            return true
        }
        const pdfFile = this.extension.manager.tex2pdf(sourceFile, true)
        const clients = this.getClients(pdfFile)
        if (clients !== undefined) {
            let refreshed = false
            // Check all viewer clients with the same path
            clients.forEach(client => {
                // Refresh only correct type
                if (viewer === undefined || client.viewer === viewer) {
                    this.extension.logger.addLogMessage(`Refresh PDF viewer for ${pdfFile}`)
                    client.send({type: 'refresh'})
                    refreshed = true
                }
            })
            // Return if refreshed anyone
            if (refreshed) {
                return true
            }
        }
        this.extension.logger.addLogMessage(`No PDF viewer connected for ${pdfFile}`)
        return false
    }

    private checkViewer(sourceFile: string, respectOutDir: boolean = true): string | undefined {
        const pdfFile = this.extension.manager.tex2pdf(sourceFile, respectOutDir)
        if (!fs.existsSync(pdfFile)) {
            this.extension.logger.addLogMessage(`Cannot find PDF file ${pdfFile}`)
            return
        }
        if (this.extension.server.address === undefined) {
            this.extension.logger.addLogMessage('Cannot establish server connection.')
            return
        }
        const url = `http://localhost:${this.extension.server.port}/viewer.html?file=${encodePathWithPrefix(pdfFile)}`
        this.extension.logger.addLogMessage(`Serving PDF file at ${url}`)
        this.extension.logger.addLogMessage(`The encoded path is ${pdfFile}`)
        return url
    }

    /**
     * Opens the PDF file of `sourceFile` in the browser.
     *
     * @param sourceFile The path of a LaTeX file.
     */
    openBrowser(sourceFile: string) {
        const url = this.checkViewer(sourceFile, true)
        if (!url) {
            return
        }
        const pdfFile = this.extension.manager.tex2pdf(sourceFile)
        this.createClients(pdfFile)

        try {
            vscode.env.openExternal(vscode.Uri.parse(url))
            this.extension.logger.addLogMessage(`Open PDF viewer for ${pdfFile}`)
        } catch (e) {
            vscode.window.showInputBox({
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
        if (this.extension.server.port === undefined) {
            this.extension.logger.addLogMessage('Server port is undefined')
            return
        }

        const panel = vscode.window.createWebviewPanel('latex-workshop-pdf', path.basename(pdfFilePath), viewColumn, {
            enableScripts: true,
            retainContextWhenHidden: true,
            portMapping : [{webviewPort: this.extension.server.port, extensionHostPort: this.extension.server.port}]
        })
        panel.webview.html = await this.getPDFViewerContent(pdfFilePath)
        const pdfPanel = new PdfViewerPanel(pdfFilePath, panel)
        this.pushPdfViewerPanel(pdfPanel)
        return pdfPanel
    }

    pushPdfViewerPanel(pdfPanel: PdfViewerPanel) {
        this.createClients(pdfPanel.pdfFilePath)
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
            return os.platform() !== 'linux'
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
        // viewer/viewer.js automatically requests the file to server.ts, and server.ts decodes the encoded path of PDF file.
        const url0 = `http://localhost:${this.extension.server.port}/viewer.html?incode=1&file=${encodePathWithPrefix(pdfFile)}`
        const url = await vscode.env.asExternalUri(vscode.Uri.parse(url0))
        const rebroadcast: boolean = this.getKeyboardEventConfig()
        return `
            <!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="default-src http://localhost:* http://127.0.0.1:*; script-src 'unsafe-inline'; style-src 'unsafe-inline';"></head>
            <body><iframe id="preview-panel" class="preview-panel" src="${url.toString(true)}" style="position:absolute; border: none; left: 0; top: 0; width: 100%; height: 100%;">
            </iframe>
            <script>
            // when the iframe loads, or when the tab gets focus again later, move the
            // the focus to the iframe so that keyboard navigation works in the pdf.
            //
            // Note: this works on first load, or when navigating between groups, but not when
            //       navigating between tabs of the same group for some reason!
            const iframe = document.getElementById('preview-panel');
            window.onfocus = iframe.onload = function() {
                setTimeout(function() { // doesn't work immediately
                    iframe.contentWindow.focus();
                }, 100);
            }

            const vsStore = acquireVsCodeApi();
            // To enable keyboard shortcuts of VS Code when the iframe is focused,
            // we have to dispatch keyboard events in the parent window.
            // See https://github.com/microsoft/vscode/issues/65452#issuecomment-586036474
            window.addEventListener('message', (e) => {
                if (e.origin !== 'http://localhost:${this.extension.server.port}') {
                    return;
                }
                switch (e.data.type) {
                    case 'initialized': {
                        const state = vsStore.getState();
                        state.type = 'restore_state';
                        iframe.contentWindow.postMessage(state, '*');
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
        this.extension.manager.setEnvVar()
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
        const data: ClientRequest = JSON.parse(msg)
        if (data.type !== 'ping') {
            this.extension.logger.addLogMessage(`Handle data type: ${data.type}`)
        }
        switch (data.type) {
            case 'open': {
                const clients = this.getClients(data.path)
                if (clients === undefined) {
                    return
                }
                const client = new Client(data.viewer, websocket)
                clients.add( client )
                websocket.on('close', () => {
                    clients.delete(client)
                })
                break
            }
            case 'request_params': {
                const clients = this.getClients(data.path)
                if (!clients) {
                    break
                }
                for (const client of clients) {
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
                this.extension.locator.locate(data, data.path)
                break
            }
            case 'external_link': {
                vscode.env.openExternal(vscode.Uri.parse(data.url))
                break
            }
            case 'ping': {
                // nothing to do
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
        const clients = this.getClients(pdfFile)
        if (clients === undefined) {
            this.extension.logger.addLogMessage(`PDF is not viewed: ${pdfFile}`)
            return
        }
        const needDelay = this.revealWebviewPanel(pdfFile)
        for (const client of clients) {
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
        for (const panel of panelSet.values()) {
            if (panel.webviewPanel.visible) {
                return
            }
        }
        const activeViewColumn = vscode.window.activeTextEditor?.viewColumn
        for (const panel of panelSet.values()) {
            if (panel.webviewPanel.viewColumn !== activeViewColumn) {
                if (!panel.webviewPanel.visible) {
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
