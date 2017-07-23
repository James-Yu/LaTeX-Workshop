import * as vscode from 'vscode'

import {Extension} from '../main'

export class HoverProvider implements vscode.HoverProvider {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    public provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken) :
        Thenable<vscode.Hover> {
        return new Promise((resolve, _reject) => {
            const startResult = document.getText(new vscode.Range(new vscode.Position(position.line, 0), position)).match(/[{,\s](?=[^{,\s]*$)/)
            const endResult = document.getText(new vscode.Range(position, new vscode.Position(position.line, 65535))).match(/[},\s]/)
            if (startResult === null || endResult === null ||
                startResult.index === undefined || endResult.index === undefined ||
                startResult.index < 0 || endResult.index < 0) {
                resolve()
                return
            }
            const token = document.getText(new vscode.Range(
                new vscode.Position(position.line, startResult.index + 1),
                new vscode.Position(position.line, position.character + endResult.index)
            ))
            if (token in this.extension.completer.reference.referenceData) {
                resolve(new vscode.Hover(
                    this.extension.completer.reference.referenceData[token]
                ))
                return
            }
            if (token in this.extension.completer.citation.citationData) {
                resolve(new vscode.Hover(
                    this.extension.completer.citation.citationData[token]
                ))
                return
            }
            resolve(new vscode.Hover(token))
        })
    }
}
