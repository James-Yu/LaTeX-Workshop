import * as vscode from 'vscode'

import type {Extension} from '../main'
import type {Section} from './structure'

export class ProjectSymbolProvider implements vscode.WorkspaceSymbolProvider {
    private readonly extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    provideWorkspaceSymbols(): vscode.SymbolInformation[] {
        const symbols: vscode.SymbolInformation[] = []
        if (this.extension.manager.rootFile === undefined) {
            return symbols
        }
        const rootFileUri = this.extension.manager.rootFileUri
        if (rootFileUri && this.extension.lwfs.isVirtualUri(rootFileUri)) {
            return symbols
        }
        this.sectionToSymbols(symbols, this.extension.structureProvider.buildModel(new Set<string>(), this.extension.manager.rootFile))
        return symbols
    }

    private sectionToSymbols(symbols: vscode.SymbolInformation[], sections: Section[], containerName: string = 'Document') {
        sections.forEach(section => {
            const location = new vscode.Location(vscode.Uri.file(section.fileName), new vscode.Range(section.lineNumber, 0, section.toLine, 65535))
            symbols.push(new vscode.SymbolInformation(section.label, vscode.SymbolKind.String, containerName, location))
            if (section.children.length > 0) {
                this.sectionToSymbols(symbols, section.children, section.label)
            }
        })
    }
}
