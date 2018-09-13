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

    public provideDocumentSymbols(document: vscode.TextDocument) : Promise<vscode.DocumentSymbol[]> {
        return new Promise((resolve, _reject) => {
            const symbols: vscode.DocumentSymbol[] = []
            this.sectionToSymbols(symbols, this.extension.structureProvider.buildModel(document.fileName, undefined, undefined, false))
            resolve(symbols)
        })
    }

    sectionToSymbols(symbols: vscode.DocumentSymbol[], sections: Section[]) {
        sections.forEach(section => {
            const range = new vscode.Range(section.lineNumber, 0, section.toLine, 65535)
            symbols.push(new vscode.DocumentSymbol(section.label, '', vscode.SymbolKind.String, range, range))
            if (section.children.length > 0) {
                this.sectionToSymbols(symbols, section.children)
            }
        })
    }

}
