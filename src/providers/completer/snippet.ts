import * as vscode from 'vscode'
import * as fs from 'fs'

import type {Extension} from '../../main'
import type {IProvider} from './interface'

export interface SnippetItemEntry {
    prefix: string,
    body: string,
    description: string
}

type DataSnippetsJsonType = typeof import('../../../data/snippets-as-commands.json')

export class Snippet implements IProvider {
    private readonly extension: Extension
    private readonly triggerCharacter: string
    private readonly suggestions: vscode.CompletionItem[] = []

    constructor(extension: Extension, triggerCharacter: string) {
        this.extension = extension
        this.triggerCharacter = triggerCharacter
        const allSnippets: {[key: string]: SnippetItemEntry} = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/snippets-as-commands.json`).toString()) as DataSnippetsJsonType
        this.initialize(allSnippets)
    }

    initialize(snippets: {[key: string]: SnippetItemEntry}) {
        Object.keys(snippets).forEach(key => {
            const item = snippets[key]
            const completionItem = new vscode.CompletionItem(item.prefix.replace('@', this.triggerCharacter), vscode.CompletionItemKind.Function)
            completionItem.insertText = new vscode.SnippetString(item.body)
            completionItem.documentation = new vscode.MarkdownString(item.description)
            this.suggestions.push(completionItem)
        })
    }

    provideFrom(_type: string, _result: RegExpMatchArray, args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}) {
        const suggestions = this.provide(args.document, args.position)
        return suggestions
    }

    private provide(document?: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
        let range: vscode.Range | undefined = undefined
        if (document && position) {
            const startPos = document.lineAt(position).text.lastIndexOf(this.triggerCharacter, position.character - 1)
            if (startPos >= 0) {
                range = new vscode.Range(position.line, startPos, position.line, position.character)
            }
        }
        this.suggestions.forEach(snippet => {snippet.range = range})
        return this.suggestions
    }
}
