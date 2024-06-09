import * as vscode from 'vscode'
import type { CompletionArgs, CompletionProvider } from '../../types'

export const provider: CompletionProvider = { from }

function from(result: RegExpMatchArray, _args: CompletionArgs): vscode.CompletionItem[] {
    if (result[1] === '') {
        return []
    }
    const suggestion = new vscode.CompletionItem(`\\end{${result[1]}}`, vscode.CompletionItemKind.Module)
    suggestion.insertText = new vscode.SnippetString('\n${0}' + `\n\\end{${result[1]}}`)
    return [ suggestion ]
}
