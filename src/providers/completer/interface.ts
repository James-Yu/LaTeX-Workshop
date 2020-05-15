import * as vscode from 'vscode'

export interface IProvider {
    provideFrom(
        type: string,
        result: RegExpMatchArray,
        args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}
    ): vscode.CompletionItem[]
}
