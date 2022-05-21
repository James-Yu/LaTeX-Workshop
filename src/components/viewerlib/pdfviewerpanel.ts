import * as vscode from 'vscode'
import * as path from 'path'

import type {Extension} from '../../main'
import type {PanelRequest, PdfViewerState} from '../../../types/latex-workshop-protocol-types/index'
import {escapeHtml, sleep} from '../../utils/utils'
import type {PdfViewerManagerService} from './pdfviewermanager'
import {PdfViewerStatusChanged} from '../eventbus'


export class PdfViewerPanel {
    private readonly extension: Extension
    readonly webviewPanel: vscode.WebviewPanel
    readonly pdfFileUri: vscode.Uri
    private _state?: PdfViewerState

    constructor(extension: Extension, pdfFileUri: vscode.Uri, panel: vscode.WebviewPanel) {
        this.extension = extension
        this.pdfFileUri = pdfFileUri
        this.webviewPanel = panel
        panel.webview.onDidReceiveMessage((msg: PanelRequest) => {
            switch(msg.type) {
                case 'state': {
                    this._state = msg.state
                    this.extension.eventBus.fire(PdfViewerStatusChanged, msg.state)
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

export class PdfViewerPanelSerializer implements vscode.WebviewPanelSerializer {
    private readonly extension: Extension
    private readonly panelService: PdfViewerPanelService
    private readonly managerService: PdfViewerManagerService

    constructor(extension: Extension, panelService: PdfViewerPanelService, service: PdfViewerManagerService) {
        this.extension = extension
        this.panelService = panelService
        this.managerService = service
    }

    async deserializeWebviewPanel(panel: vscode.WebviewPanel, argState: {state: PdfViewerState}): Promise<void> {
        await this.extension.server.serverStarted
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
        panel.webview.html = await this.panelService.getPDFViewerContent(pdfFileUri)
        const pdfPanel = new PdfViewerPanel(this.extension, pdfFileUri, panel)
        this.managerService.initiatePdfViewerPanel(pdfPanel)
        return
    }
}

export class PdfViewerPanelService {
    private readonly extension: Extension
    private alreadyOpened = false

    constructor(extension: Extension) {
        this.extension = extension
    }

    private encodePathWithPrefix(pdfFileUri: vscode.Uri): string {
        return this.extension.server.pdfFilePathEncoder.encodePathWithPrefix(pdfFileUri)
    }

    private async tweakForCodespaces(url: vscode.Uri) {
        if (this.alreadyOpened) {
            return
        }
        if (vscode.env.remoteName === 'codespaces' && vscode.env.uiKind === vscode.UIKind.Web) {
            const configuration = vscode.workspace.getConfiguration('latex-workshop')
            const delay = configuration.get('codespaces.portforwarding.openDelay', 20000)
            // We have to open the url in a browser tab for the authentication of port forwarding through githubpreview.dev.
            await vscode.env.openExternal(url)
            await sleep(delay)
        }
        this.alreadyOpened = true
    }

    async createPdfViewerPanel(pdfFileUri: vscode.Uri, viewColumn: vscode.ViewColumn): Promise<PdfViewerPanel> {
        await this.extension.server.serverStarted
        const htmlContent = await this.getPDFViewerContent(pdfFileUri)
        const panel = vscode.window.createWebviewPanel('latex-workshop-pdf', path.basename(pdfFileUri.path), viewColumn, {
            enableScripts: true,
            retainContextWhenHidden: true
        })
        panel.webview.html = htmlContent
        const pdfPanel = new PdfViewerPanel(this.extension, pdfFileUri, panel)
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
        await this.tweakForCodespaces(url)
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

}
