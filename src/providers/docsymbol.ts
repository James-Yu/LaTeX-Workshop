import * as vscode from 'vscode'

import type {Extension} from '../main'
import {Section} from './structure'

export class DocSymbolProvider implements vscode.DocumentSymbolProvider {
    private readonly extension: Extension

    private sections: string[] = []

    constructor(extension: Extension) {
        this.extension = extension

        const rawSections = vscode.workspace.getConfiguration('latex-workshop').get('view.outline.sections') as string[]
        rawSections.forEach(section => {
            this.sections = this.sections.concat(section.split('|'))
        })
    }

    async provideDocumentSymbols(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> {
        if (document.languageId === 'bibtex') {
            return this.sectionToSymbols((await this.extension.cacher.getBibCache(document.fileName))?.secSaved || [])
        }
        if (this.extension.lwfs.isVirtualUri(document.uri)) {
            return []
        }
        const cache = await this.extension.cacher.tex.get(document.fileName, true)
        return this.sectionToSymbols(cache?.secSaved || [])
    }

    private sectionToSymbols(sections: Section[]): vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = []

        sections.forEach(section => {
            const range = new vscode.Range(section.lineNumber, 0, section.toLine, 65535)
            const symbol = new vscode.DocumentSymbol(section.label ? section.label : 'empty', '', vscode.SymbolKind.String, range, range)
            symbols.push(symbol)
            if (section.children.length > 0) {
                symbol.children = this.sectionToSymbols(section.children)
            }
        })

        return symbols
    }

}
