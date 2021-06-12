import type * as vscode from 'vscode'

import type {Extension} from '../../main'

export class PdfViewerHookProvider implements vscode.CustomReadonlyEditorProvider {
    private readonly extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    openCustomDocument(uri: vscode.Uri) {
        this.extension.manager.watchPdfFile(uri.fsPath)
        return {
            uri,
            dispose: () => {}
        }
    }

    resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel) {
        webviewPanel.webview.html = 'LaTeX Workshop PDF Viewer is opening a PDF file...'
        setTimeout(() => {
            webviewPanel.dispose()
            void this.extension.commander.pdf(document.uri)
        }, 1000)
    }

}
