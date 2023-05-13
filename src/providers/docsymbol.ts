import * as vscode from 'vscode'
import * as lw from '../lw'
import { TeXElement } from './structure'
import { buildBibTeX } from './structurelib/bibtex'
import { construct as constructLaTeX } from './structurelib/latex'
import { buildDocTeX } from './structurelib/doctex'

export class DocSymbolProvider implements vscode.DocumentSymbolProvider {

    async provideDocumentSymbols(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> {
        if (document.languageId === 'bibtex') {
            return buildBibTeX(document).then((sections: TeXElement[]) => this.sectionToSymbols(sections))
        } else if (document.languageId === 'doctex') {
            return buildDocTeX(document).then((sections: TeXElement[]) => this.sectionToSymbols(sections))
        }
        if (lw.lwfs.isVirtualUri(document.uri)) {
            return []
        }
        const sections = await constructLaTeX(document.fileName, false)
        return this.sectionToSymbols(sections)
    }

    private sectionToSymbols(sections: TeXElement[]): vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = []

        sections.forEach(section => {
            const range = new vscode.Range(section.lineFr, 0, section.lineTo, 65535)
            const symbol = new vscode.DocumentSymbol(
                section.label || 'empty', '',
                vscode.SymbolKind.Module,
                range, range)
            symbols.push(symbol)
            if (section.children.length > 0) {
                symbol.children = this.sectionToSymbols(section.children)
            }
        })

        return symbols
    }

}
