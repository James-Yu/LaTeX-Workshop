import * as vscode from 'vscode'
import * as lw from '../lw'
import { Section, SectionNodeProvider } from './structure'

export class ProjectSymbolProvider implements vscode.WorkspaceSymbolProvider {
    private readonly sectionNodeProvider: SectionNodeProvider

    constructor() {
        this.sectionNodeProvider = new SectionNodeProvider()
    }

    async provideWorkspaceSymbols(): Promise<vscode.SymbolInformation[]> {
        if (lw.manager.rootFile === undefined) {
            return []
        }
        const rootFileUri = lw.manager.rootFileUri
        if (rootFileUri && lw.lwfs.isVirtualUri(rootFileUri)) {
            return []
        }
        return this.sectionToSymbols(await this.sectionNodeProvider.buildLaTeXModel())
    }

    private sectionToSymbols(sections: Section[], containerName: string = 'Document'): vscode.SymbolInformation[] {
        let symbols: vscode.SymbolInformation[] = []
        sections.forEach(section => {
            const location = new vscode.Location(vscode.Uri.file(section.fileName), new vscode.Range(section.lineNumber, 0, section.toLine, 65535))
            symbols.push(new vscode.SymbolInformation(section.label, vscode.SymbolKind.String, containerName, location))
            if (section.children.length > 0) {
                symbols = [...symbols, ...this.sectionToSymbols(section.children, section.label)]
            }
        })
        return symbols
    }
}
