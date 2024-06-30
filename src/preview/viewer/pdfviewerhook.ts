import * as vscode from 'vscode'
import { lw } from '../../lw'
import type { ViewerMode } from '../../types'
import { insert } from './pdfviewermanager'
import { populate, getPDFViewerContentHelper, PdfViewerPanel } from './pdfviewerpanel'

export {
    hook
}

class PdfViewerHookProvider implements vscode.CustomReadonlyEditorProvider {
    openCustomDocument(uri: vscode.Uri) {
        return {
            uri,
            dispose: () => {}
        }
    }

    async resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const viewerLocation = configuration.get<ViewerMode>('view.pdf.viewer', 'tab')

        if (document.uri.fsPath.toLocaleLowerCase().endsWith('.pdf.liveshare')) {
            const encodedPdfPath = (await vscode.workspace.fs.readFile(document.uri)).toString()
            const decodedPdfUri = lw.server.decodePathWithPrefix(encodedPdfPath)
            if (lw.liveshare.isGuest) {
                if (viewerLocation === 'tab') {
                    webviewPanel.webview.options = {
                        ...webviewPanel.webview.options,
                        enableScripts: true
                    }
                    const uri = (await lw.server.urlFromPortAndEncodedUri(await lw.liveshare.getHostServerPort(), encodedPdfPath)).uri
                    const htmlContent = await getPDFViewerContentHelper(uri)
                    webviewPanel.webview.html = htmlContent
                    const pdfPanel = new PdfViewerPanel(uri, webviewPanel)
                    void insert(pdfPanel)
                }
            }
            else {
                await this.resolveCustomEditor({ uri: decodedPdfUri, dispose: () => { } }, webviewPanel)
            }
            return
        }
        if (viewerLocation === 'tab') {
            webviewPanel.webview.options = {
                ...webviewPanel.webview.options,
                enableScripts: true
            }
            const pdfPanel = await populate(document.uri, webviewPanel)
            void insert(pdfPanel)
        } else {
            webviewPanel.onDidChangeViewState(e => { e.webviewPanel.dispose() })
            if (document.uri === undefined || !document.uri.fsPath.toLocaleLowerCase().endsWith('.pdf')) {
                return
            }
            void lw.viewer.viewInWebviewPanel(document.uri, 'current', false)
        }
    }
}

const hook = new PdfViewerHookProvider()
