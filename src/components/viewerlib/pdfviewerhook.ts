import type * as vscode from 'vscode'

import type {Extension} from '../../main'

export class PdfViewerHookProvider implements vscode.CustomReadonlyEditorProvider {
    private readonly extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

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
        void this.extension.commander.pdf(document.uri, webviewPanel)
    }

}
