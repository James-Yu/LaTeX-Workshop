import * as vscode from 'vscode'
import * as fs from 'fs'
import { lw } from '../../lw'
import type { CompletionProvider, CompletionArgs } from '../../types'
import { escapeRegExp } from '../../utils/utils'

export const provider: CompletionProvider = { from }
export const atSuggestion = {
    initialize
}

const data = {
    triggerCharacter: '',
    escapedTriggerCharacter: '',
    suggestions: [] as vscode.CompletionItem[]
}

interface AtSuggestionItemEntry {
    prefix: string,
    body: string,
    description: string
}

lw.onConfigChange(['intellisense.atSuggestion.user'], initialize)
// AtSuggestion is not initialized here, but in AtSuggestionCompleter
function initialize(triggerCharacter?: string) {
    if (triggerCharacter) {
        data.triggerCharacter = triggerCharacter
        data.escapedTriggerCharacter = escapeRegExp(data.triggerCharacter)
    }
    const userSnippets = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.atSuggestion.user') as {[key: string]: string}
    data.suggestions.length = 0
    Object.entries(userSnippets).forEach(([prefix, body]) => {
        if (body === '') {
            return
        }
        const completionItem = new vscode.CompletionItem(prefix.replace('@', data.triggerCharacter), vscode.CompletionItemKind.Function)
        completionItem.insertText = new vscode.SnippetString(body)
        completionItem.documentation = 'User defined @suggestion'
        completionItem.detail = 'User defined @suggestion'
        data.suggestions.push(completionItem)
    })

    const suggestions: {[key: string]: AtSuggestionItemEntry} = JSON.parse(fs.readFileSync(`${lw.extensionRoot}/data/at-suggestions.json`).toString()) as typeof import('../../../data/at-suggestions.json')
    Object.values(suggestions).forEach(item => {
        if (item.prefix in userSnippets) {
            return
        }
        const completionItem = new vscode.CompletionItem(item.prefix.replace('@', data.triggerCharacter), vscode.CompletionItemKind.Function)
        completionItem.insertText = new vscode.SnippetString(item.body)
        completionItem.documentation = new vscode.MarkdownString(item.description)
        completionItem.detail = item.description
        data.suggestions.push(completionItem)
    })
}

function from(result: RegExpMatchArray, args: CompletionArgs) {
    const suggestions = provide(args.line, args.position)
    // Manually filter suggestions when there are several consecutive trigger characters
    const reg = new RegExp(data.escapedTriggerCharacter + '{2,}$')
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

function provide(line: string, position: vscode.Position): vscode.CompletionItem[] {
    let range: vscode.Range | undefined = undefined
    const startPos = line.lastIndexOf(data.triggerCharacter, position.character - 1)
    if (startPos >= 0) {
        range = new vscode.Range(position.line, startPos, position.line, position.character)
    }
    data.suggestions.forEach(suggestion => {suggestion.range = range})
    return data.suggestions
}
