import * as vscode from 'vscode'
import { type TeXElement, TeXElementType } from '../types'
import { buildBibTeX } from '../outline/structure/bibtex'
import { construct as constructLaTeX } from '../outline/structure/latex'
import { construct } from '../outline/structure/doctex'

export class DocSymbolProvider implements vscode.DocumentSymbolProvider {

    async provideDocumentSymbols(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> {
        if (document.languageId === 'bibtex') {
            return buildBibTeX(document).then((sections: TeXElement[]) => this.sectionToSymbols(sections))
        } else if (document.languageId === 'doctex') {
            return construct(document).then((sections: TeXElement[]) => this.sectionToSymbols(sections))
        }
        if (document.uri.scheme !== 'file') {
            return []
        }
        const sections = await constructLaTeX(document.fileName, false)
        return this.sectionToSymbols(sections)
    }

    private sectionToKind(section: TeXElement): vscode.SymbolKind {
        if (section.type === TeXElementType.Section || section.type === TeXElementType.SectionAst) {
            return vscode.SymbolKind.Struct
        }
        if (section.type === TeXElementType.Environment) {
            return vscode.SymbolKind.Package
        }
        if (section.type === TeXElementType.Macro) {
            return vscode.SymbolKind.Number
        }
        if (section.type === TeXElementType.SubFile) {
            return vscode.SymbolKind.File
        }
        if (section.type === TeXElementType.BibItem) {
            return vscode.SymbolKind.Class
        }
        if (section.type === TeXElementType.BibField) {
            return vscode.SymbolKind.Constant
        }
        return vscode.SymbolKind.String
    }

    private sectionToSymbols(sections: TeXElement[]): vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = []

        sections.forEach(section => {
            const range = new vscode.Range(section.lineFr, 0, section.lineTo, 65535)
            const symbol = new vscode.DocumentSymbol(
                section.label || 'empty', '',
                this.sectionToKind(section),
                range, range)
            symbols.push(symbol)
            if (section.children.length > 0) {
                symbol.children = this.sectionToSymbols(section.children)
            }
        })

        return symbols
    }

}
