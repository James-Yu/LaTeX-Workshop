import * as vscode from 'vscode'

import {Section, SectionNodeProvider} from './structure'
import type {LoggerLocator, LwfsLocator, ManagerLocator, UtensilsParserLocator} from '../interfaces'

interface IExtension extends
    LoggerLocator,
    LwfsLocator,
    ManagerLocator,
    UtensilsParserLocator { }

export class ProjectSymbolProvider implements vscode.WorkspaceSymbolProvider {
    private readonly extension: IExtension
    private readonly sectionNodeProvider: SectionNodeProvider

    constructor(extension: IExtension) {
        this.extension = extension
        this.sectionNodeProvider = new SectionNodeProvider(extension)
    }

    async provideWorkspaceSymbols(): Promise<vscode.SymbolInformation[]> {
        const symbols: vscode.SymbolInformation[] = []
        if (this.extension.manager.rootFile === undefined) {
            return symbols
        }
        const rootFileUri = this.extension.manager.rootFileUri
        if (rootFileUri && this.extension.lwfs.isVirtualUri(rootFileUri)) {
            return symbols
        }
        this.sectionToSymbols(symbols, await this.sectionNodeProvider.buildLaTeXModel())
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
