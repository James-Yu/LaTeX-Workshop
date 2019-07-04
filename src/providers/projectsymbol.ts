import * as vscode from 'vscode'

import { Extension } from '../main'
import { Section } from './structure'

export class ProjectSymbolProvider implements vscode.WorkspaceSymbolProvider {
    extension: Extension

    constructor (extension: Extension) {
        this.extension = extension
    }

    public provideWorkspaceSymbols (
        _query: string,
        _token: vscode.CancellationToken,
    ) : Thenable<vscode.SymbolInformation[]> {
        return new Promise((resolve, _reject) => {
            const symbols: vscode.SymbolInformation[] = []
            this.sectionToSymbols(
                symbols,
                this.extension.structureProvider.buildModel(this.extension.manager.rootFile),
            )
            resolve(symbols)
        })
    }

    sectionToSymbols (symbols: vscode.SymbolInformation[], sections: Section[], containerName: string = 'Document') {
        sections.forEach(section => {
            const location = new vscode.Location(
                vscode.Uri.file(section.fileName),
                new vscode.Range(section.lineNumber, 0, section.toLine, 65535),
            )
            symbols.push(
                new vscode.SymbolInformation(section.label, vscode.SymbolKind.String, containerName, location),
            )
            if (section.children.length > 0) {
                this.sectionToSymbols(symbols, section.children, section.label)
            }
        })
    }
}
