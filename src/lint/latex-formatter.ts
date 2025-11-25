import * as vscode from 'vscode'
import { lw } from '../lw'
import { LaTeXFormatter } from '../types'
import { latexindent } from './latex-formatter/latexindent'
import { texfmt } from './latex-formatter/tex-fmt'
import { fixQuotes } from '../extras/quote-fixer'
import { fixMath } from '../extras/math-fixer'

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
        const edits: vscode.TextEdit[] = []
        const formatEdit = await this.formatter?.formatDocument(document)
        if (formatEdit) {
            edits.push(formatEdit)
        }
        const quoteEdits = fixQuotes(document, undefined)
        edits.push(...quoteEdits)
        const mathEdits = fixMath(document, undefined)
        edits.push(...mathEdits)
        return edits
    }

    public async provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, _options: vscode.FormattingOptions, _token: vscode.CancellationToken): Promise<vscode.TextEdit[]> {
        const edits: vscode.TextEdit[] = []
        const formatEdit = await this.formatter?.formatDocument(document, range)
        if (formatEdit) {
            const useSpaces = vscode.window.activeTextEditor?.options.insertSpaces ?? true
            const firstLine = document.lineAt(range.start.line)
            // Replace all new line characters with new line and spaces, so that
            // the indentations are added from the second line.
            formatEdit.newText = formatEdit.newText.replaceAll('\n', '\n' + (useSpaces ? ' ' : '\t').repeat(firstLine.firstNonWhitespaceCharacterIndex))
            if (firstLine.firstNonWhitespaceCharacterIndex > range.start.character) {
                // \s\s\s|\sf(x)=ax+b
                // In this case, the first line need some leading whitespaces.
                formatEdit.newText = ' '.repeat(firstLine.firstNonWhitespaceCharacterIndex - range.start.character) + formatEdit.newText
            }
            edits.push(formatEdit)
        }

        const quoteEdits = fixQuotes(document, range)
        edits.push(...quoteEdits)
        const mathEdits = fixMath(document, range)
        edits.push(...mathEdits)
        return edits
    }
}

const formattingProvider = new FormattingProvider()
