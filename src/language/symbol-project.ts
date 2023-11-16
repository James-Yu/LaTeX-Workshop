import * as vscode from 'vscode'
import * as lw from '../lw'
import { construct } from './structurelib/latex'
import { TeXElement } from './structure'

export class ProjectSymbolProvider implements vscode.WorkspaceSymbolProvider {

    async provideWorkspaceSymbols(): Promise<vscode.SymbolInformation[]> {
        if (lw.manager.rootFile === undefined) {
            return []
        }
        const rootFileUri = lw.manager.rootFileUri
        if (rootFileUri && lw.lwfs.isVirtualUri(rootFileUri)) {
            return []
        }
        const sections = await construct()
        return this.sectionToSymbols(sections)
    }

    private sectionToSymbols(sections: TeXElement[], containerName: string = 'Document'): vscode.SymbolInformation[] {
        let symbols: vscode.SymbolInformation[] = []
        sections.forEach(section => {
            const location = new vscode.Location(vscode.Uri.file(section.filePath), new vscode.Range(section.lineFr, 0, section.lineTo, 65535))
            symbols.push(new vscode.SymbolInformation(section.label, vscode.SymbolKind.String, containerName, location))
            if (section.children.length > 0) {
                symbols = [...symbols, ...this.sectionToSymbols(section.children, section.label)]
            }
        })
        return symbols
    }
}
