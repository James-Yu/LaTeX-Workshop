import * as vscode from 'vscode'

import {Extension} from '../main'

export class DocSymbolProvider implements vscode.DocumentSymbolProvider {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    public provideDocumentSymbols(document: vscode.TextDocument, _token: vscode.CancellationToken) :
        Thenable<vscode.SymbolInformation[]> {
        return new Promise((resolve, _reject) => {
            const references = this.extension.completer.reference.getReferenceItems(document.getText())
            resolve(Object.keys(references).map(key => {
                const reference = references[key]
                return new vscode.SymbolInformation(key, vscode.SymbolKind.Key, '', new vscode.Location(document.uri, reference.position))
            }))
        })
    }
}
