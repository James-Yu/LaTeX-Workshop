import * as vscode from 'vscode'
import * as fs from 'fs-extra'

import * as bibtexUtils from '../utils/bibtexutils'
import type {Extension} from '../main'

type DataBibtexJsonType = typeof import('../../data/bibtex-entries.json')
type DataBibtexOptionalJsonType = typeof import('../../data/bibtex-optional-entries.json')

export class BibtexCompleter implements vscode.CompletionItemProvider {
    private readonly extension: Extension
    private readonly entryItems: vscode.CompletionItem[] = []
    private readonly optFieldItems: {[key: string]: vscode.CompletionItem[]} = {}

    constructor(extension: Extension) {
        this.extension = extension

        try {
            this.loadDefaultItems()
        } catch (err) {
            this.extension.logger.addLogMessage(`Error reading data: ${err}.`)
        }
    }

    private loadDefaultItems() {
        const entries: { [key: string]: string[] } = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/bibtex-entries.json`, {encoding: 'utf8'})) as DataBibtexJsonType
        const optFields: { [key: string]: string[] } = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/bibtex-optional-entries.json`, {encoding: 'utf8'})) as DataBibtexOptionalJsonType
        const entriesReplacements = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.bibtexJSON.replace') as {[key: string]: string[]}
        const config = vscode.workspace.getConfiguration('latex-workshop')
        const leftright = config.get('bibtex-format.surround') === 'Curly braces' ? [ '{', '}' ] : [ '"', '"']
        let tabs: string | undefined = bibtexUtils.getBibtexFormatTab(config)
        if (tabs === undefined) {
            this.extension.logger.addLogMessage(`Wrong value for bibtex-format.tab: ${config.get('bibtex-format.tab')}`)
            this.extension.logger.addLogMessage('Setting bibtex-format.tab to \'2 spaces\'')
            tabs = '  '
        }
        const bibtexFormat: bibtexUtils.BibtexFormatConfig = {
            tab: tabs,
            case: config.get('bibtex-format.case') as ('UPPERCASE' | 'lowercase'),
            left: leftright[0],
            right: leftright[1],
            trailingComma: config.get('bibtex-format.trailingComma') as boolean,
            sort: config.get('bibtex-format.sortby') as string[],
            alignOnEqual: config.get('bibtex-format.align-equal.enabled') as boolean,
            sortFields: config.get('bibtex-fields.sort.enabled') as boolean,
            fieldsOrder: config.get('bibtex-fields.order') as string[]
        }
        this.extension.logger.addLogMessage(`Bibtex format config: ${JSON.stringify(bibtexFormat)}`)

        const maxLengths: {[key: string]: number} = this.computeMaxLengths(entries, optFields)
        const entriesList: string[] = []
        Object.keys(entries).forEach(entry => {
            if (entry in entriesList) {
                return
            }
            if (entry in entriesReplacements) {
                this.entryItems.push(this.entryToCompletion(entry, entriesReplacements[entry], bibtexFormat, maxLengths))
            } else {
                this.entryItems.push(this.entryToCompletion(entry, entries[entry], bibtexFormat, maxLengths))
            }
            entriesList.push(entry)
        })
        Object.keys(optFields).forEach(entry => {
            this.optFieldItems[entry] = this.fieldsToCompletion(entry, optFields[entry], bibtexFormat, maxLengths)
        })
    }

    private computeMaxLengths(entries: {[key: string]: string[]}, optFields: {[key: string]: string[]}): {[key: string]: number} {
        const maxLengths: {[key: string]: number} = {}
        Object.keys(entries).forEach(key => {
            let maxFieldLength = 0
            entries[key].forEach(field => {
                maxFieldLength = Math.max(maxFieldLength, field.length)
            })
            if (key in optFields) {
                optFields[key].forEach(field => {
                    maxFieldLength = Math.max(maxFieldLength, field.length)
                })
            }
            maxLengths[key] = maxFieldLength
        })
        return maxLengths
    }

    private entryToCompletion(itemName: string, itemFields: string[], config: bibtexUtils.BibtexFormatConfig, maxLengths: {[key: string]: number}): vscode.CompletionItem {
        const suggestion: vscode.CompletionItem = new vscode.CompletionItem(itemName, vscode.CompletionItemKind.Snippet)
        suggestion.detail = itemName
        suggestion.documentation = `Add a @${itemName} entry`
        let count: number = 1

        // The following code is copied from bibtexutils.ts:bibtexFormat
        // Find the longest field name in entry
        let s: string = itemName + '{${0:key}'
        itemFields.forEach(field => {
            s += ',\n' + config.tab + (config.case === 'lowercase' ? field : field.toUpperCase())
            s += ' '.repeat(maxLengths[itemName] - field.length) + ' = '
            s += config.left + `$${count}` + config.right
            count++
        })
        s += '\n}'
        suggestion.insertText = new vscode.SnippetString(s)
        return suggestion
    }

    private fieldsToCompletion(itemName: string, fields: string[], config: bibtexUtils.BibtexFormatConfig, maxLengths: {[key: string]: number}): vscode.CompletionItem[] {
        const suggestions: vscode.CompletionItem[] = []
        fields.forEach(field => {
            const suggestion: vscode.CompletionItem = new vscode.CompletionItem(field, vscode.CompletionItemKind.Snippet)
            suggestion.detail = field
            suggestion.documentation = `Add ${field} = ${config.left}${config.right}`
            suggestion.insertText = new vscode.SnippetString(`${field}` + ' '.repeat(maxLengths[itemName] - field.length) + ` = ${config.left}$1${config.right},`)
            suggestions.push(suggestion)
        })
        return suggestions
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] | undefined {
        const currentLine = document.lineAt(position.line).text
        const prevLine = document.lineAt(position.line - 1).text
        if (currentLine.match(/@[a-zA-Z]*$/)) {
            // Complete an entry name
            return this.entryItems
        } else if (currentLine.match(/^\s*[a-zA-Z]*/) && prevLine.match(/(?:@[a-zA-Z]{)|(?:["}0-9],\s*$)/)) {
            // Add optional fields
            const optFields = this.provideOptFields(document, position)
            return optFields
        }
        return
    }

    private provideOptFields(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
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
