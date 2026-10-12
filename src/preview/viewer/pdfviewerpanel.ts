import * as vscode from 'vscode'
import { lw } from '../../lw'
import * as manager from './pdfviewermanager'
import type { PanelRequest, PdfViewerState } from '../../../types/latex-workshop-protocol-types/index'
import { escapeHtml, sleep } from '../../utils/utils'

const logger = lw.log('Viewer', 'Panel')

// A panel is reloaded at most `RELOAD_LIMIT` times within `RELOAD_WINDOW` ms,
// so that an unreachable server does not cause an endless reload loop.
const RELOAD_LIMIT = 3
const RELOAD_WINDOW = 10 * 60 * 1000
// How long the webview waits for the embedded viewer to initialize
// before it reports the viewer as unreachable.
const INITIALIZE_TIMEOUT = 30 * 1000

export {
    type PdfViewerPanel,
    serializer,
    populate
}

class PdfViewerPanel {
    readonly webviewPanel: vscode.WebviewPanel
    readonly pdfUri: vscode.Uri
    private viewerState: PdfViewerState | undefined
    private reloadTimes: number[] = []

    constructor(pdfFileUri: vscode.Uri, panel: vscode.WebviewPanel) {
        this.pdfUri = pdfFileUri
        this.webviewPanel = panel
        panel.webview.onDidReceiveMessage((msg: PanelRequest) => {
            switch(msg.type) {
                case 'state': {
                    this.viewerState = msg.state
                    lw.event.fire(lw.event.ViewerStatusChanged, msg.state)
                    break
                }
                case 'disconnected':
                case 'unreachable': {
                    void this.reload(msg.type)
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

    /**
     * Reloads the webview content with a freshly resolved server URL.
     *
     * The server URL is baked into the webview HTML when the panel is created.
     * It becomes stale when the server is restarted or when the port forwarding
     * of a remote session is re-established after a reconnect, e.g. after the
     * machine resumed from sleep. The panel then stays blank until the window is
     * reloaded. Resolving the URL again via `asExternalUri` and resetting the
     * HTML recovers the panel. The viewer state is restored from the webview
     * state store, so the scroll position and zoom are preserved.
     *
     * @param reason Why the reload is requested, for logging.
     * @returns `false` if the reload was skipped because of the rate limit.
     */
    async reload(reason: string): Promise<boolean> {
        const now = Date.now()
        this.reloadTimes = this.reloadTimes.filter(time => now - time < RELOAD_WINDOW)
        if (this.reloadTimes.length >= RELOAD_LIMIT) {
            logger.log(`Viewer ${reason}, but not reloading ${this.pdfUri.toString(true)} again (${RELOAD_LIMIT} reloads within ${RELOAD_WINDOW / 1000}s).`)
            return false
        }
        this.reloadTimes.push(now)
        logger.log(`Viewer ${reason}, reloading ${this.pdfUri.toString(true)} .`)
        const html = await getPDFViewerContent(this.pdfUri)
        // VS Code ignores assignments of unchanged HTML. Clear it first so that
        // the viewer is reloaded even if the resolved URL is the same as before,
        // e.g. when a dead port forwarding was re-established on the same port.
        this.webviewPanel.webview.html = ''
        this.webviewPanel.webview.html = html
        return true
    }

}

class PdfViewerPanelSerializer implements vscode.WebviewPanelSerializer {
    async deserializeWebviewPanel(panel: vscode.WebviewPanel, argState: {state: PdfViewerState}): Promise<void> {
        await lw.server.initialized()
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
        panel.webview.html = await getPDFViewerContent(pdfFileUri)
        const pdfPanel = new PdfViewerPanel(pdfFileUri, panel)
        manager.insert(pdfPanel)
        return
    }
}

const serializer = new PdfViewerPanelSerializer()

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

// Create a PdfViewerPanel inside an existing vscode.WebviewPanel
async function populate(pdfUri: vscode.Uri, panel: vscode.WebviewPanel): Promise<PdfViewerPanel>{
    await lw.server.initialized()
    const htmlContent = await getPDFViewerContent(pdfUri)
    panel.webview.html = htmlContent
    const pdfPanel = new PdfViewerPanel(pdfUri, panel)
    return pdfPanel
}

function getKeyboardEventConfig(): boolean {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const setting: 'auto' | 'force' | 'never' = configuration.get('view.pdf.internal.keyboardEvent', 'auto')
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
    const uri = (await lw.server.getUrl(pdfUri)).uri
    const iframeSrcOrigin = `${uri.scheme}://${uri.authority}`
    const iframeSrcUrl = uri.toString(true)
    await patchCodespaces(uri)
    logger.log(`Internal PDF viewer at ${iframeSrcUrl} .`)
    const rebroadcast: boolean = getKeyboardEventConfig()
    return `
    <!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; frame-src *; script-src 'unsafe-inline'; style-src 'unsafe-inline';"></head>
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

    // Report to the extension if the viewer does not come up in time,
    // e.g. because the server URL above is stale after a reconnect.
    // The extension then reloads this panel with a fresh URL.
    const initializeTimeout = setTimeout(() => {
        vsStore.postMessage({type: 'unreachable'});
    }, ${INITIALIZE_TIMEOUT});

    // To enable keyboard shortcuts of VS Code when the iframe is focused,
    // we have to dispatch keyboard events in the parent window.
    // See https://github.com/microsoft/vscode/issues/65452#issuecomment-586036474
    window.addEventListener('message', (e) => {
        if (e.origin !== '${iframeSrcOrigin}') {
            return;
        }
        switch (e.data.type) {
            case 'initialized': {
                clearTimeout(initializeTimeout);
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
