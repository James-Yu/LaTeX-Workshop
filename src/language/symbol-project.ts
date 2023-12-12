import * as vscode from 'vscode'
import { lw } from '../lw'
import type { TeXElement } from '../types'
import { construct } from '../outline/structure/latex'

export class ProjectSymbolProvider implements vscode.WorkspaceSymbolProvider {

    async provideWorkspaceSymbols(): Promise<vscode.SymbolInformation[]> {
        if (lw.root.file.path === undefined) {
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
