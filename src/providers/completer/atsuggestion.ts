import * as vscode from 'vscode'
import * as fs from 'fs'

import type {IProvider} from './interface'
import {escapeRegExp} from '../../utils/utils'
import type {ExtensionRootLocator} from '../../interfaces'

export interface AtSuggestionItemEntry {
    prefix: string,
    body: string,
    description: string
}

type DataAtSuggestionJsonType = typeof import('../../../data/at-suggestions.json')

interface IExtension extends ExtensionRootLocator { }

export class AtSuggestion implements IProvider {
    private readonly extension: IExtension
    private readonly triggerCharacter: string
    private readonly escapedTriggerCharacter: string
    private readonly suggestions: vscode.CompletionItem[] = []

    constructor(extension: IExtension, triggerCharacter: string) {
        this.extension = extension
        this.triggerCharacter = triggerCharacter
        this.escapedTriggerCharacter = escapeRegExp(this.triggerCharacter)

        const allSuggestions: {[key: string]: AtSuggestionItemEntry} = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/at-suggestions.json`).toString()) as DataAtSuggestionJsonType
        this.initialize(allSuggestions)
        vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
            if (e.affectsConfiguration('latex-workshop.intellisense.atSuggestionJSON.replace')) {
                this.initialize(allSuggestions)
            }
        })
    }

    private initialize(suggestions: {[key: string]: AtSuggestionItemEntry}) {
        const suggestionReplacements = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.atSuggestionJSON.replace') as {[key: string]: string}
        this.suggestions.length = 0
        Object.keys(suggestionReplacements).forEach(prefix => {
            const body = suggestionReplacements[prefix]
            if (body === '') {
                return
            }
            const completionItem = new vscode.CompletionItem(prefix.replace('@', this.triggerCharacter), vscode.CompletionItemKind.Function)
            completionItem.insertText = new vscode.SnippetString(body)
            completionItem.documentation = 'User defined @suggestion'
            completionItem.detail = 'User defined @suggestion'
            this.suggestions.push(completionItem)
        })

        Object.keys(suggestions).forEach(key => {
            const item = suggestions[key]
            if (item.prefix in suggestionReplacements) {
                return
            }
            const completionItem = new vscode.CompletionItem(item.prefix.replace('@', this.triggerCharacter), vscode.CompletionItemKind.Function)
            completionItem.insertText = new vscode.SnippetString(item.body)
            completionItem.documentation = new vscode.MarkdownString(item.description)
            completionItem.detail = item.description
            this.suggestions.push(completionItem)
        })
    }

    provideFrom(result: RegExpMatchArray, args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}) {
        const suggestions = this.provide(args.document, args.position)
        // Manually filter suggestions when there are several consecutive trigger characters
        const reg = new RegExp(this.escapedTriggerCharacter + '{2,}$')
        if (result[0].match(reg)) {
            const filteredSuggestions = suggestions.filter(item => item.label === result[0])
            if (filteredSuggestions.length > 0) {
                return filteredSuggestions.map(item => {
                    item.range = new vscode.Range(args.position.translate(undefined, -item.label.toString().length), args.position)
                    return item
                })
            }
        }
        return suggestions
    }

    private provide(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        let range: vscode.Range | undefined = undefined
        const startPos = document.lineAt(position).text.lastIndexOf(this.triggerCharacter, position.character - 1)
        if (startPos >= 0) {
            range = new vscode.Range(position.line, startPos, position.line, position.character)
        }
        this.suggestions.forEach(suggestion => {suggestion.range = range})
        return this.suggestions
    }
}
