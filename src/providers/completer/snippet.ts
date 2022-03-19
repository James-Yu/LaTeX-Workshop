import * as vscode from 'vscode'
import * as fs from 'fs'

import type {Extension} from '../../main'
import type {IProvider} from './interface'
import {escapeRegExp} from '../../utils/utils'

export interface SnippetItemEntry {
    prefix: string,
    body: string,
    description: string
}

type DataSnippetsJsonType = typeof import('../../../data/snippets-as-commands.json')

export class Snippet implements IProvider {
    private readonly extension: Extension
    private readonly triggerCharacter: string
    private readonly escapedTriggerCharacter: string
    private readonly suggestions: vscode.CompletionItem[] = []

    constructor(extension: Extension, triggerCharacter: string) {
        this.extension = extension
        this.triggerCharacter = triggerCharacter
        this.escapedTriggerCharacter = escapeRegExp(this.triggerCharacter)

        const allSnippets: {[key: string]: SnippetItemEntry} = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/snippets-as-commands.json`).toString()) as DataSnippetsJsonType
        this.initialize(allSnippets)
        vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
            if (e.affectsConfiguration('latex-workshop.intellisense.snippetsJSON.replace')) {
                this.initialize(allSnippets)
            }
        })
    }

    private initialize(snippets: {[key: string]: SnippetItemEntry}) {
        const snippetReplacements = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.snippetsJSON.replace') as {[key: string]: string}
        this.suggestions.length = 0
        Object.keys(snippetReplacements).forEach(prefix => {
            const body = snippetReplacements[prefix]
            if (body === '') {
                return
            }
            const completionItem = new vscode.CompletionItem(prefix.replace('@', this.triggerCharacter), vscode.CompletionItemKind.Function)
            completionItem.insertText = new vscode.SnippetString(body)
            completionItem.documentation = new vscode.MarkdownString('User defined snippet')
            completionItem.detail = 'User defined snippet'
            this.suggestions.push(completionItem)
        })

        Object.keys(snippets).forEach(key => {
            const item = snippets[key]
            if (item.prefix in snippetReplacements) {
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
        this.suggestions.forEach(snippet => {snippet.range = range})
        return this.suggestions
    }
}
