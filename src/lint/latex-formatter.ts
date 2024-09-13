import * as vscode from 'vscode'
import { latexindent } from './latex-formatter/latexindent'

export {
    formattingProvider as formatter
}

class FormattingProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    public provideDocumentFormattingEdits(document: vscode.TextDocument, _options: vscode.FormattingOptions, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
        return latexindent.formatDocument(document)
    }

    public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, _options: vscode.FormattingOptions, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
        return latexindent.formatDocument(document, range)
    }
}

const formattingProvider = new FormattingProvider()
