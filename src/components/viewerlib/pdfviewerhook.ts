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
        webviewPanel.webview.html = 'LaTeX Workshop PDF Viewer is opening a PDF file...'
        setTimeout(() => {
            webviewPanel.dispose()
            void lw.commander.pdf(document.uri)
        }, 1000)
    }

}
