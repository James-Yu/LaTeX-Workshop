import * as vscode from 'vscode'
import * as fs from 'fs-extra'

import * as bibtexUtils from '../utils/bibtexutils'
import {Extension} from '../main'

export class BibtexCompleter implements vscode.CompletionItemProvider {
    extension: Extension
    private entryItems: vscode.CompletionItem[] = []
    private optFieldItems: {[key: string]: vscode.CompletionItem[]} = {}

    constructor(extension: Extension) {
        this.extension = extension

        try {
            this.loadDefaultItems()
        } catch (err) {
            this.extension.logger.addLogMessage(`Error reading data: ${err}.`)
        }
    }

    loadDefaultItems() {
        const entries = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/bibtex-entries.json`, {encoding: 'utf8'}))
        const optFields = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/bibtex-optional-entries.json`, {encoding: 'utf8'}))
        const entriesReplacements = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.bibtexJSON.replace') as {[key: string]: string[]}
        const config = vscode.workspace.getConfiguration('latex-workshop')
        const leftright = config.get('bibtex-format.surround') === 'Curly braces' ? [ '{', '}' ] : [ '"', '"']
        const tabs = { '2 spaces': '  ', '4 spaces': '    ', 'tab': '\t' }
        const bibtexFormat: bibtexUtils.BibtexFormatConfig = {
            tab: tabs[config.get('bibtex-format.tab') as ('2 spaces' | '4 spaces' | 'tab')],
            case: config.get('bibtex-format.case') as ('UPPERCASE' | 'lowercase'),
            left: leftright[0],
            right: leftright[1],
            sort: config.get('bibtex-format.sortby') as string[]
        }

        const entriesList: string[] = []
        Object.keys(entries).forEach(entry => {
            if (entry in entriesList) {
                return
            }
            if (entry in entriesReplacements) {
                this.entryItems.push(this.entryToCompletion(entry, entriesReplacements[entry], bibtexFormat))
            } else {
                this.entryItems.push(this.entryToCompletion(entry, entries[entry], bibtexFormat))
            }
            entriesList.push(entry)
        })
        Object.keys(optFields).forEach(entry => {
            this.optFieldItems[entry] = this.fieldsToCompletion(optFields[entry])
        })
    }

    entryToCompletion(itemName: string, itemFields: string[], config: bibtexUtils.BibtexFormatConfig): vscode.CompletionItem {
        const suggestion: vscode.CompletionItem = new vscode.CompletionItem(itemName, vscode.CompletionItemKind.Snippet)
        suggestion.detail = itemName
        suggestion.documentation = `Add a @${itemName} entry`
        let count: number = 1

        // The following code is copied from bibtexutils.ts:bibtexFormat
        // Find the longest field name in entry
        let maxFieldLength = 0
        itemFields.forEach(field => {
            maxFieldLength = Math.max(maxFieldLength, field.length)
        })

        let s: string = itemName + '{${0:key}'
        itemFields.forEach(field => {
            s += ',\n' + config.tab + (config.case === 'lowercase' ? field : field.toUpperCase())
            s += ' '.repeat(maxFieldLength - field.length) + ' = '
            s += config.left + `$${count}` + config.right
            count++
        })
        s += '\n}'
        suggestion.insertText = new vscode.SnippetString(s)
        return suggestion
    }

    fieldsToCompletion(fields: string[]): vscode.CompletionItem[] {
        const suggestions: vscode.CompletionItem[] = []
        fields.forEach(field => {
            const suggestion: vscode.CompletionItem = new vscode.CompletionItem(field, vscode.CompletionItemKind.Snippet)
            suggestion.detail = field
            suggestion.documentation = `Add ${field} = {}`
            suggestion.insertText = new vscode.SnippetString(`${field} = {$1}`)
            suggestions.push(suggestion)
        })
        return suggestions
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken, _context: vscode.CompletionContext): Promise<vscode.CompletionItem[]> {
        return new Promise((resolve, _reject) => {
            const currentLine = document.lineAt(position.line).text
            const prevLine = document.lineAt(position.line - 1).text
            if (currentLine.match(/@[a-zA-Z]*$/)) {
                // Complete an entry name
                resolve(this.entryItems)
                return
            } else if (currentLine.match(/^\s*[a-zA-Z]*/) && prevLine.match(/(?:@[a-zA-Z]{)|(?:["}0-9],\s*$)/)) {
                // Add optional fields
                const optFields = this.provideOptFields(document, position)
                resolve(optFields)
            }
            resolve()
        })
    }

    provideOptFields(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const pattern = /^\s*@([a-zA-Z]+)\{(?:[^,]*,)?\s$/m
        const content = document.getText(new vscode.Range(new vscode.Position(0, 0), position))
        const reversedContent = content.replace(/(\r\n)|\r/g, '\n').split('\n').reverse().join('\n')
        const match = reversedContent.match(pattern)
        if (match) {
            const entryType = match[1].toLowerCase()
            if (entryType in this.optFieldItems) {
                return this.optFieldItems[entryType]
            }
        }
        return []
    }
}
