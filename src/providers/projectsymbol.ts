import * as vscode from 'vscode'

import type {Extension} from '../main'
import {Section, SectionNodeProvider} from './structure'

export class ProjectSymbolProvider implements vscode.WorkspaceSymbolProvider {
    private readonly extension: Extension
    private readonly sectionNodeProvider: SectionNodeProvider

    constructor(extension: Extension) {
        this.extension = extension
        this.sectionNodeProvider = new SectionNodeProvider(extension)
    }

    provideWorkspaceSymbols(): vscode.ProviderResult<vscode.SymbolInformation[]> {
        const symbols: vscode.SymbolInformation[] = []
        if (this.extension.manager.rootFile === undefined) {
            return symbols
        }
        const rootFileUri = this.extension.manager.rootFileUri
        if (rootFileUri && this.extension.lwfs.isVirtualUri(rootFileUri)) {
            return symbols
        }
        return this.sectionNodeProvider.buildLaTeXModel().then(structure => this.sectionToSymbols(symbols, structure || []))
    }

    private sectionToSymbols(symbols: vscode.SymbolInformation[], sections: Section[], containerName: string = 'Document') {
        sections.forEach(section => {
            const location = new vscode.Location(vscode.Uri.file(section.fileName), new vscode.Range(section.lineNumber, 0, section.toLine, 65535))
            symbols.push(new vscode.SymbolInformation(section.label, vscode.SymbolKind.String, containerName, location))
            if (section.children.length > 0) {
                this.sectionToSymbols(symbols, section.children, section.label)
            }
        })
        return symbols
    }
}
