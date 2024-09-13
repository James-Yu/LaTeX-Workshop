import * as vscode from 'vscode'
import { lw } from '../lw'
import { LaTeXFormatter } from '../types'
import { latexindent } from './latex-formatter/latexindent'
import { texfmt } from './latex-formatter/tex-fmt'

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
            errorMsg = 'LaTeX formatter is set to "none" by `formatting.latex`.'
        } else {
            errorMsg = `Unknown LaTeX formatter by \`formatting.latex\`: ${program} .`
        }
        logger.log(errorMsg)
        void logger.showErrorMessage(errorMsg)
        return undefined
    }

    public provideDocumentFormattingEdits(document: vscode.TextDocument, _options: vscode.FormattingOptions, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
        return this.formatter?.formatDocument(document) ?? []
    }

    public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, _options: vscode.FormattingOptions, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
        return this.formatter?.formatDocument(document, range) ?? []
    }
}

const formattingProvider = new FormattingProvider()
