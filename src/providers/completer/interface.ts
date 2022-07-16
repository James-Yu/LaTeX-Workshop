import type * as vscode from 'vscode'
import type {CommandSignatureDuplicationDetector} from './commandlib/commandfinder'

export interface IProvider {

    /**
     * Returns the array of completion items. Should be called only from `Completer.completion`.
     */
    provideFrom(
        result: RegExpMatchArray,
        args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}
    ): vscode.CompletionItem[]
}

export interface ILwCompletionItem extends vscode.CompletionItem {
    label: string
}

export interface ICommand {
    getExtraPkgs(languageId: string): string[],
    provideCmdInPkg(pkg: string, suggestions: vscode.CompletionItem[], cmdDuplicationDetector: CommandSignatureDuplicationDetector): void
}
