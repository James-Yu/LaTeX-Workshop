import * as vscode from 'vscode'

import {Extension} from '../main'
import {Section} from './structure'

export class DocSymbolProvider implements vscode.DocumentSymbolProvider {
    extension: Extension

    private sections: string[] = []

    constructor(extension: Extension) {
        this.extension = extension
        const rawSections = vscode.workspace.getConfiguration('latex-workshop').get('view.outline.sections') as string[]
        rawSections.forEach(section => {
            this.sections = this.sections.concat(section.split('|'))
        })
    }

    public provideDocumentSymbols(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> {
        return new Promise((resolve, _reject) => {
            resolve(this.sectionToSymbols(this.extension.structureProvider.buildModel(document.fileName, undefined, undefined, undefined, false)))
        })
    }

    sectionToSymbols(sections: Section[]): vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = []

        sections.forEach(section => {
            const range = new vscode.Range(section.lineNumber, 0, section.toLine, 65535)
            const symbol = new vscode.DocumentSymbol(section.label, '', vscode.SymbolKind.String, range, range)
            symbols.push(symbol)
            if (section.children.length > 0) {
                symbol.children = this.sectionToSymbols(section.children)
            }
        })

        return symbols
    }

}
