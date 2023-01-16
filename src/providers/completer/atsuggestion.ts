import * as vscode from 'vscode'
import * as fs from 'fs'
import * as lw from '../../lw'
import type {IProvider} from '../completion'
import {escapeRegExp} from '../../utils/utils'

export interface AtSuggestionItemEntry {
    prefix: string,
    body: string,
    description: string
}

type DataAtSuggestionJsonType = typeof import('../../../data/at-suggestions.json')

export class AtSuggestion implements IProvider {
    private readonly triggerCharacter: string
    private readonly escapedTriggerCharacter: string
    private readonly suggestions: vscode.CompletionItem[] = []

    constructor(triggerCharacter: string) {
        this.triggerCharacter = triggerCharacter
        this.escapedTriggerCharacter = escapeRegExp(this.triggerCharacter)

        const allSuggestions: {[key: string]: AtSuggestionItemEntry} = JSON.parse(fs.readFileSync(`${lw.extensionRoot}/data/at-suggestions.json`).toString()) as DataAtSuggestionJsonType
        this.initialize(allSuggestions)
        lw.registerDisposable(vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
            if (e.affectsConfiguration('latex-workshop.intellisense.atSuggestionJSON.replace')) {
                this.initialize(allSuggestions)
            }
        }))
    }

    private initialize(suggestions: {[key: string]: AtSuggestionItemEntry}) {
        const userSnippets = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.atSuggestion.user') as {[key: string]: string}
        this.suggestions.length = 0
        Object.entries(userSnippets).forEach(([prefix, body]) => {
            if (body === '') {
                return
            }
            const completionItem = new vscode.CompletionItem(prefix.replace('@', this.triggerCharacter), vscode.CompletionItemKind.Function)
            completionItem.insertText = new vscode.SnippetString(body)
            completionItem.documentation = 'User defined @suggestion'
            completionItem.detail = 'User defined @suggestion'
            this.suggestions.push(completionItem)
        })

        Object.values(suggestions).forEach(item => {
            if (item.prefix in userSnippets) {
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
