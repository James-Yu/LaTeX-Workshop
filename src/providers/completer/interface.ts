import type * as vscode from 'vscode'

export interface IProvider {

    /**
     * Returns the array of completion items. Should be called only from `Completer.completion`.
     */
    provideFrom(
        type: string,
        result: RegExpMatchArray,
        args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}
    ): vscode.CompletionItem[]
}
