import * as vscode from 'vscode'

import {Section, SectionNodeProvider} from './structure'
import type {LoggerLocator, LwfsLocator, ManagerLocator, UtensilsParserLocator} from '../interfaces'

interface IExtension extends
    LoggerLocator,
    LwfsLocator,
    ManagerLocator,
    UtensilsParserLocator { }

export class DocSymbolProvider implements vscode.DocumentSymbolProvider {
    private readonly extension: IExtension
    private readonly sectionNodeProvider: SectionNodeProvider

    private sections: string[] = []

    constructor(extension: IExtension) {
        this.extension = extension
        this.sectionNodeProvider = new SectionNodeProvider(extension)

        const rawSections = vscode.workspace.getConfiguration('latex-workshop').get('view.outline.sections') as string[]
        rawSections.forEach(section => {
            this.sections = this.sections.concat(section.split('|'))
        })
    }

    async provideDocumentSymbols(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> {
        if (document.languageId === 'bibtex') {
            return this.sectionNodeProvider.buildBibTeXModel(document).then((sections: Section[]) => this.sectionToSymbols(sections))
        }
        if (this.extension.lwfs.isVirtualUri(document.uri)) {
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
