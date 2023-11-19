import * as vscode from 'vscode'
import { construct } from '../outline/structurelib/latex'
import { TeXElement } from '../outline/project'
import { extension } from '../extension'

export class ProjectSymbolProvider implements vscode.WorkspaceSymbolProvider {

    async provideWorkspaceSymbols(): Promise<vscode.SymbolInformation[]> {
        if (extension.root.file.path === undefined) {
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
