import type * as vscode from 'vscode'
import * as lw from '../../lw'

export class PdfViewerHookProvider implements vscode.CustomReadonlyEditorProvider {
    openCustomDocument(uri: vscode.Uri) {
        return {
            uri,
            dispose: () => {}
        }
    }

    resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel) {
        webviewPanel.webview.options = {
            ...webviewPanel.webview.options,
            enableScripts: true
        }
        if (document.uri === undefined || !document.uri.fsPath.toLocaleLowerCase().endsWith('.pdf')) {
            return
        }
        if (webviewPanel) {
            void lw.viewer.openPdfInPanel(document.uri, webviewPanel)
        } else {
            void lw.viewer.openPdfInTab(document.uri, 'current', false)
        }
    }

}
