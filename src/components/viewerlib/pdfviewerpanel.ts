import * as vscode from 'vscode'
import * as path from 'path'
import * as lw from '../../lw'
import type {PanelRequest, PdfViewerState} from '../../../types/latex-workshop-protocol-types/index'
import { escapeHtml, sleep } from '../../utils/utils'
import { viewerManager } from './pdfviewermanager'
import { ViewerStatusChanged } from '../eventbus'

import { getLogger } from '../logger'

const logger = getLogger('Viewer', 'Panel')

export class PdfViewerPanel {
    readonly webviewPanel: vscode.WebviewPanel
    readonly pdfFileUri: vscode.Uri
    private viewerState: PdfViewerState | undefined

    constructor(pdfFileUri: vscode.Uri, panel: vscode.WebviewPanel) {
        this.pdfFileUri = pdfFileUri
        this.webviewPanel = panel
        panel.webview.onDidReceiveMessage((msg: PanelRequest) => {
            switch(msg.type) {
                case 'state': {
                    this.viewerState = msg.state
                    lw.eventBus.fire(ViewerStatusChanged, msg.state)
                    break
                }
                default: {
                    break
                }
            }
        })
    }

    get state() {
        return this.viewerState
    }

}

class PdfViewerPanelSerializer implements vscode.WebviewPanelSerializer {

    async deserializeWebviewPanel(panel: vscode.WebviewPanel, argState: {state: PdfViewerState}): Promise<void> {
        await lw.server.serverStarted
        logger.log(`Restoring at column ${panel.viewColumn} with state ${JSON.stringify(argState.state)}.`)
        const state = argState.state
        let pdfFileUri: vscode.Uri | undefined
        if (state.path) {
            pdfFileUri = vscode.Uri.file(state.path)
        } else if (state.pdfFileUri) {
            pdfFileUri = vscode.Uri.parse(state.pdfFileUri, true)
        }
        if (!pdfFileUri) {
            logger.log('Failed restoring viewer with undefined PDF path.')
            panel.webview.html = '<!DOCTYPE html> <html lang="en"><meta charset="utf-8"/><br>The path of PDF file is undefined.</html>'
            return
        }
        if (! await lw.lwfs.exists(pdfFileUri)) {
            const s = escapeHtml(pdfFileUri.toString())
            logger.log(`Failed restoring viewer with non-existent PDF ${pdfFileUri.toString(true)} .`)
            panel.webview.html = `<!DOCTYPE html> <html lang="en"><meta charset="utf-8"/><br>File not found: ${s}</html>`
            return
        }
        panel.webview.html = await getPDFViewerContent(pdfFileUri)
        const pdfPanel = new PdfViewerPanel(pdfFileUri, panel)
        viewerManager.initiatePdfViewerPanel(pdfPanel)
        return
    }
}

export const pdfViewerPanelSerializer = new PdfViewerPanelSerializer()

let codespacesPatched = false
async function patchCodespaces(url: vscode.Uri) {
    if (codespacesPatched) {
        return
    }
    if (vscode.env.remoteName === 'codespaces' && vscode.env.uiKind === vscode.UIKind.Web) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const delay = configuration.get('codespaces.portforwarding.openDelay', 20000)
        // We have to open the url in a browser tab for the authentication of port forwarding through githubpreview.dev.
        await vscode.env.openExternal(url)
        await sleep(delay)
    }
    codespacesPatched = true
}

export async function createPdfViewerPanel(pdfUri: vscode.Uri, preserveFocus: boolean): Promise<PdfViewerPanel> {
    await lw.server.serverStarted
    const htmlContent = await getPDFViewerContent(pdfUri)
    const panel = vscode.window.createWebviewPanel('latex-workshop-pdf', path.basename(pdfUri.path), {
        viewColumn: vscode.ViewColumn.Active,
        preserveFocus
    }, {
        enableScripts: true,
        retainContextWhenHidden: true
    })
    panel.webview.html = htmlContent
    const pdfPanel = new PdfViewerPanel(pdfUri, panel)
    return pdfPanel
}

function getKeyboardEventConfig(): boolean {
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
 * @param pdfUri The path of a PDF file to be opened.
 */
async function getPDFViewerContent(pdfUri: vscode.Uri): Promise<string> {
    const uri = (await lw.server.getViewerUrl(pdfUri)).uri
    const iframeSrcOrigin = `${uri.scheme}://${uri.authority}`
    const iframeSrcUrl = uri.toString(true)
    await patchCodespaces(uri)
    logger.log(`Internal PDF viewer at ${iframeSrcUrl} .`)
    const rebroadcast: boolean = getKeyboardEventConfig()
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

    // Prevent the whole iframe selected.
    // See https://github.com/James-Yu/LaTeX-Workshop/issues/3408
    window.addEventListener('selectstart', (e) => {
        e.preventDefault();
    });

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
                } else {
                    iframe.contentWindow.postMessage({type: 'restore_state', state: {kind: 'not_stored'} }, '${iframeSrcOrigin}');
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
