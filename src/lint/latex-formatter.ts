import * as vscode from 'vscode'
import { lw } from '../lw'
import { LaTeXFormatter } from '../types'
import { latexindent } from './latex-formatter/latexindent'
import { texfmt } from './latex-formatter/tex-fmt'
import { fixQuotes } from '../extras/quote-fixer'

const logger = lw.log('Format', 'LaTeX')

export {
    formattingProvider as formatter
}

class FormattingProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    private get formatter(): LaTeXFormatter | undefined {
        const config = vscode.workspace.getConfiguration('latex-workshop')
        const program = config.get('formatting.latex') as string
        let errorMsg: string
        if (program === 'latexindent') {
            return latexindent
        } else if (program === 'tex-fmt') {
            return texfmt
        } else if (program === 'none') {
            errorMsg = 'Please set your LaTeX formatter in `latex-workshop.formatting.latex`.'
        } else {
            errorMsg = `Unknown LaTeX formatter by \`formatting.latex\`: ${program} .`
        }
        logger.log(errorMsg)
        void logger.showErrorMessage(errorMsg)
        return undefined
    }

    public async provideDocumentFormattingEdits(document: vscode.TextDocument, _options: vscode.FormattingOptions, _token: vscode.CancellationToken): Promise<vscode.TextEdit[]> {
        const edit = await this.formatter?.formatDocument(document)
        const finalEdit = fixQuotes(document, undefined, edit)
        if (finalEdit === undefined) {
            return []
        }
        return [finalEdit]
    }

    public async provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, _options: vscode.FormattingOptions, _token: vscode.CancellationToken): Promise<vscode.TextEdit[]> {
        const edit = await this.formatter?.formatDocument(document, range)
        if (edit === undefined) {
            const fixedQuoteEdit = fixQuotes(document, range, undefined)
            return fixedQuoteEdit ? [fixedQuoteEdit] : []
        }
        const useSpaces = vscode.window.activeTextEditor?.options.insertSpaces ?? true
        const firstLine = document.lineAt(range.start.line)
        // Replace all new line characters with new line and spaces, so that
        // the indentations are added from the second line.
        edit.newText = edit.newText.replaceAll('\n', '\n' + (useSpaces ? ' ' : '\t').repeat(firstLine.firstNonWhitespaceCharacterIndex))
        if (firstLine.firstNonWhitespaceCharacterIndex > range.start.character) {
            // \s\s\s|\sf(x)=ax+b
            // In this case, the first line need some leading whitespaces.
            edit.newText = ' '.repeat(firstLine.firstNonWhitespaceCharacterIndex - range.start.character) + edit.newText
        }
        const finalEdit = fixQuotes(document, range, edit)
        if (finalEdit === undefined) {
            return []
        }
        return [finalEdit]
    }
}

const formattingProvider = new FormattingProvider()
