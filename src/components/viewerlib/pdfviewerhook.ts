import * as vscode from 'vscode'
import * as lw from '../../lw'
import { ViewerMode } from '../viewer'
import { viewerManager } from './pdfviewermanager'
import { populatePdfViewerPanel } from './pdfviewerpanel'

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
        if (viewerLocation === 'tab') {
            webviewPanel.webview.options = {
                ...webviewPanel.webview.options,
                enableScripts: true
            }
            const pdfPanel = await populatePdfViewerPanel(document.uri, webviewPanel)
            void viewerManager.initiatePdfViewerPanel(pdfPanel)
        } else {
            webviewPanel.onDidChangeViewState(e => { e.webviewPanel.dispose() })
            if (document.uri === undefined || !document.uri.fsPath.toLocaleLowerCase().endsWith('.pdf')) {
                return
            }
            void lw.viewer.openPdfInTab(document.uri, 'current', false)
        }
    }
}

export const pdfViewerHookProvider = new PdfViewerHookProvider()
