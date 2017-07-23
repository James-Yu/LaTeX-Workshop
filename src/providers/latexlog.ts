import * as vscode from 'vscode'

import {Extension} from '../main'

export class LaTeXLogProvider implements vscode.TextDocumentContentProvider {
    extension: Extension
    change = new vscode.EventEmitter<vscode.Uri>()

    constructor(extension: Extension) {
        this.extension = extension
    }

    public update(uri: vscode.Uri) {
        this.change.fire(uri)
    }

    get onDidChange() : vscode.Event<vscode.Uri> {
        return this.change.event
    }

    public provideTextDocumentContent(_uri: vscode.Uri) : string {
        const dom = this.extension.parser.buildLogRaw.split('\n').map(log => `<span>${log.replace(/&/g, "&amp;")
                                                                                         .replace(/</g, "&lt;")
                                                                                         .replace(/>/g, "&gt;")
                                                                                         .replace(/"/g, "&quot;")
                                                                                         .replace(/'/g, "&#039;")}</span><br>`)
        return `
            <!DOCTYPE html style="position:absolute; left: 0; top: 0; width: 100%; height: 100%;"><html><head></head>
            <body style="position:absolute; left: 0; top: 0; width: 100%; height: 100%; white-space: pre;">${dom.join('')}</body></html>
        `
    }
}
