import type * as vscode from 'vscode'
import * as lw from '../../lw'

class PdfViewerHookProvider implements vscode.CustomReadonlyEditorProvider {
    static #instance?: PdfViewerHookProvider
    static get instance() {
        return this.#instance || (this.#instance = new this())
    }
    private constructor() {}

    openCustomDocument(uri: vscode.Uri) {
        return {
            uri,
            dispose: () => {}
        }
    }

    resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel) {
        webviewPanel.onDidChangeViewState(e => { e.webviewPanel.dispose() })
        if (document.uri === undefined || !document.uri.fsPath.toLocaleLowerCase().endsWith('.pdf')) {
            return
        }
        void lw.viewer.openPdfInTab(document.uri, 'current', false)
    }
}

export const pdfViewerHookProvider = PdfViewerHookProvider.instance
