import * as vscode from 'vscode'
import * as lw from '../lw'
import { Section, SectionNodeProvider } from './structure'

export class DocSymbolProvider implements vscode.DocumentSymbolProvider {
    private readonly sectionNodeProvider: SectionNodeProvider

    constructor() {
        this.sectionNodeProvider = new SectionNodeProvider()
    }

    async provideDocumentSymbols(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> {
        if (document.languageId === 'bibtex') {
            return this.sectionNodeProvider.buildBibTeXModel(document).then((sections: Section[]) => this.sectionToSymbols(sections))
        }
        if (lw.lwfs.isVirtualUri(document.uri)) {
            return []
        }
        return this.sectionToSymbols(await this.sectionNodeProvider.buildLaTeXModel(document.fileName, false))
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
