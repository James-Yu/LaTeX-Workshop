import * as vscode from 'vscode'
import * as path from 'path'
import { lw } from '../../lw'
import * as manager from './pdfviewermanager'
import type { PdfViewerState } from '../../../types/latex-workshop-protocol-types/index'
import { escapeHtml } from '../../utils/utils'

const logger = lw.log('Viewer', 'Panel')

export {
    type PdfViewerPanel,
    serializer,
    populate
}

class PdfViewerPanel {
    readonly webviewPanel: vscode.WebviewPanel
    readonly pdfUri: vscode.Uri
    private viewerState: PdfViewerState | undefined

    constructor(pdfFileUri: vscode.Uri, panel: vscode.WebviewPanel) {
        this.pdfUri = pdfFileUri
        this.webviewPanel = panel
        this.viewerState = {
            path: pdfFileUri.fsPath,
            pdfFileUri: pdfFileUri.toString(true)
        }
        panel.webview.onDidReceiveMessage((message: { type?: string }) => {
            if (message.type === 'viewer-loaded' && this.viewerState) {
                lw.event.fire(lw.event.ViewerPageLoaded)
                lw.event.fire(lw.event.ViewerStatusChanged, this.viewerState)
            }
        })
    }

    get state() {
        return this.viewerState
    }

}

class PdfViewerPanelSerializer implements vscode.WebviewPanelSerializer {
    async deserializeWebviewPanel(panel: vscode.WebviewPanel, argState: {state: PdfViewerState}): Promise<void> {
        logger.log(`Restoring at column ${panel.viewColumn} with state ${JSON.stringify(argState.state)}.`)
        const state = argState.state
        let pdfFileUri: vscode.Uri | undefined
        if (state.path) {
            pdfFileUri = lw.file.toUri(state.path)
        } else if (state.pdfFileUri) {
            pdfFileUri = vscode.Uri.parse(state.pdfFileUri, true)
        }
        if (!pdfFileUri) {
            logger.log('Failed restoring viewer with undefined PDF path.')
            panel.webview.html = '<!DOCTYPE html> <html lang="en"><meta charset="utf-8"/><br>The path of PDF file is undefined.</html>'
            return
        }
        if (! await lw.file.exists(pdfFileUri)) {
            const s = escapeHtml(pdfFileUri.toString())
            logger.log(`Failed restoring viewer with non-existent PDF ${pdfFileUri.toString(true)} .`)
            panel.webview.html = `<!DOCTYPE html> <html lang="en"><meta charset="utf-8"/><br>File not found: ${s}</html>`
            return
        }
        configureWebview(panel, pdfFileUri)
        panel.webview.html = await getPDFViewerContent(pdfFileUri, panel.webview)
        const pdfPanel = new PdfViewerPanel(pdfFileUri, panel)
        manager.insert(pdfPanel)
        return
    }
}

const serializer = new PdfViewerPanelSerializer()

function configureWebview(panel: vscode.WebviewPanel, pdfUri: vscode.Uri) {
    const viewerRoot = vscode.Uri.joinPath(lw.file.toUri(lw.extensionRoot), 'viewer')
    panel.webview.options = {
        enableScripts: true,
        localResourceRoots: [viewerRoot, pdfUri]
    }
}

// Create a PdfViewerPanel inside an existing vscode.WebviewPanel
async function populate(pdfUri: vscode.Uri, panel: vscode.WebviewPanel): Promise<PdfViewerPanel>{
    configureWebview(panel, pdfUri)
    const htmlContent = await getPDFViewerContent(pdfUri, panel.webview)
    panel.webview.html = htmlContent
    const pdfPanel = new PdfViewerPanel(pdfUri, panel)
    return pdfPanel
}

/**
 * Returns the HTML content of the internal PDF viewer.
 *
 * @param pdfUri The path of a PDF file to be opened.
 */
async function getPDFViewerContent(pdfUri: vscode.Uri, webview: vscode.Webview): Promise<string> {
    const nonce = getNonce()
    const viewerRoot = vscode.Uri.joinPath(lw.file.toUri(lw.extensionRoot), 'viewer')
    const viewerHtmlUri = vscode.Uri.joinPath(viewerRoot, 'viewer.html')
    const panelWebviewUri = webview.asWebviewUri(viewerHtmlUri).toString()
    const configuration = encodeURIComponent(encodeJsonConfig(lw.viewer.getParams()))
    const encodedPdfUri = encodeURIComponent(encodePdfPath(webview.asWebviewUri(pdfUri).toString()))
    const encodedTitle = encodeURIComponent(path.basename(pdfUri.fsPath) || 'Untitled PDF')
    const iframeOrigin = extractOrigin(panelWebviewUri)
    logger.log(`Internal PDF viewer at ${panelWebviewUri} .`)
    return `
    <!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; frame-src ${iframeOrigin}; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src ${iframeOrigin} data: blob:;"></head>
    <body style="padding:0;margin:0;overflow:hidden;background:#1e1e1e;"><iframe id="preview-panel" class="preview-panel" src="${panelWebviewUri}?file=${encodedPdfUri}&config=${configuration}&title=${encodedTitle}" style="position:absolute; border: none; left: 0; top: 0; width: 100%; height: 100%;">
    </iframe>
    <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const iframe = document.getElementById('preview-panel');
    window.addEventListener('focus', () => {
        setTimeout(() => iframe.contentWindow?.focus(), 100);
    });
    window.addEventListener('message', event => {
        if (event.origin === '${iframeOrigin}' && event.data?.type === 'loaded') {
            vscode.postMessage({ type: 'viewer-loaded' });
            return;
        }
        if (event.data?.type === 'reload-viewer') {
            iframe.src = iframe.src;
        }
    });
    </script>
    </body></html>
    `
}

function encodePdfPath(pdfUri: string): string {
    const text = encodeURIComponent(pdfUri)
    return Buffer.from(text, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function encodeJsonConfig(params: unknown): string {
    const text = encodeURIComponent(JSON.stringify(params))
    return Buffer.from(text, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function extractOrigin(uri: string): string {
    const parsed = vscode.Uri.parse(uri)
    return `${parsed.scheme}://${parsed.authority}`
}

function getNonce(): string {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}
