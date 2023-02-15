import * as vscode from 'vscode'
import * as lw from '../lw'
import { Section } from './structurelib/section'
import { BibTeXStructure } from './structurelib/bibtex'
import { LaTeXStructure } from './structurelib/latex'
import { DocTeXStructure } from './structurelib/doctex'

export class DocSymbolProvider implements vscode.DocumentSymbolProvider {

    async provideDocumentSymbols(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> {
        if (document.languageId === 'bibtex') {
            return BibTeXStructure.buildBibTeXModel(document).then((sections: Section[]) => this.sectionToSymbols(sections))
        } else if (document.languageId === 'doctex') {
            return DocTeXStructure.buildDocTeXModel(document).then((sections: Section[]) => this.sectionToSymbols(sections))
        }
        if (lw.lwfs.isVirtualUri(document.uri)) {
            return []
        }
        const sections = await LaTeXStructure.buildLaTeXModel(document.fileName, false, true)
        return this.sectionToSymbols(sections)
    }

    private sectionToSymbols(sections: Section[]): vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = []

        sections.forEach(section => {
            const range = new vscode.Range(section.lineNumber, 0, section.toLine, 65535)
            const symbol = new vscode.DocumentSymbol(
                section.label || 'empty', '',
                section.depth < 0 ? vscode.SymbolKind.Method : vscode.SymbolKind.Module,
                range, range)
            symbols.push(symbol)
            if (section.children.length > 0) {
                symbol.children = this.sectionToSymbols(section.children)
            }
        })

        return symbols
    }

}
