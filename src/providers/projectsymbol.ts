import * as vscode from 'vscode'

import {Extension} from '../main'

export class ProjectSymbolProvider implements vscode.WorkspaceSymbolProvider {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    public provideWorkspaceSymbols(_query: string, _token: vscode.CancellationToken) :
        Thenable<vscode.SymbolInformation[]> {
        return new Promise((resolve, _reject) => {
            const symbols: vscode.SymbolInformation[] = []
            Object.keys(this.extension.completer.reference.referenceData).forEach(key => {
                const reference = this.extension.completer.reference.referenceData[key]
                symbols.push(new vscode.SymbolInformation(
                    key, vscode.SymbolKind.Key, '', new vscode.Location(vscode.Uri.file(reference.file), reference.item.position)
                ))
            })
            Object.keys(this.extension.completer.citation.citationData).forEach(key => {
                const citation = this.extension.completer.citation.citationData[key]
                symbols.push(new vscode.SymbolInformation(
                    key, vscode.SymbolKind.Property, '', new vscode.Location(vscode.Uri.file(citation.file), citation.position)
                ))
            })
            Object.keys(this.extension.completer.command.newcommandData).forEach(key => {
                const command = this.extension.completer.command.newcommandData[key]
                symbols.push(new vscode.SymbolInformation(
                    key, vscode.SymbolKind.Function, '', new vscode.Location(vscode.Uri.file(command.file), command.position)
                ))
            })
            resolve(symbols)
        })
    }
}
