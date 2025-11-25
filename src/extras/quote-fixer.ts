import * as vscode from 'vscode'
import { stripCommentsAndVerbatim } from '../utils/utils'

/**
 * Regular expression that captures straight double-quoted substrings for replacement.
 */
const QUOTE_PATTERN = /"([^"]*)"/g

/**
 * Transform straight double quotes into LaTeX-style quotes
 */
export class QuoteFixer {
    /**
     * Generate a list of TextEdits to replace straight quotes with LaTeX-style quotes,
     * supporting both standard ("...") and German („...“) quotes.
     *
     * @param text The content to process.
     * @returns An array of TextEdits.
     */
    public getEdits(text: string): vscode.TextEdit[] {
        // 1. Strip comments and verbatim content
        const stripped = stripCommentsAndVerbatim(text)
        const strippedLines = stripped.split('\n')

        const edits: vscode.TextEdit[] = []

        for (let i = 0; i < strippedLines.length; i++) {
            const sLine = strippedLines[i]

            if (!sLine || sLine.trim() === '') {
                continue
            }

            let match: RegExpExecArray | null

            // Handle German quotes „...“
            // Regex for German quotes: „ followed by anything until “
            const germanQuotePattern = /„([^“]*)“/g
            while ((match = germanQuotePattern.exec(sLine)) !== null) {
                const index = match.index
                const fullMatch = match[0]
                const content = match[1]

                // Replace opening quote „
                const startRange = new vscode.Range(i, index, i, index + 1)
                edits.push(vscode.TextEdit.replace(startRange, '``'))

                // Replace closing quote “
                const endRange = new vscode.Range(i, index + 1 + content.length, i, index + fullMatch.length)
                edits.push(vscode.TextEdit.replace(endRange, "''"))
            }

            // Handle standard quotes "..."
            QUOTE_PATTERN.lastIndex = 0
            while ((match = QUOTE_PATTERN.exec(sLine)) !== null) {
                const index = match.index
                const fullMatch = match[0]
                const content = match[1]

                // Replace opening quote "
                const startRange = new vscode.Range(i, index, i, index + 1)
                edits.push(vscode.TextEdit.replace(startRange, '``'))

                // Replace closing quote "
                const endRange = new vscode.Range(i, index + 1 + content.length, i, index + fullMatch.length)
                edits.push(vscode.TextEdit.replace(endRange, "''"))
            }
        }

        return edits
    }
}

/**
 * Apply LaTeX quote normalization based on the user configuration.
 *
 * @param document The document being edited.
 * @param range The range covered by the edit, or `undefined` to process the entire document.
 * @returns A list of TextEdits.
 */
export function fixQuotes(document: vscode.TextDocument, range: vscode.Range | undefined): vscode.TextEdit[] {
    const config = vscode.workspace.getConfiguration('latex-workshop', document.uri)
    const enabled = config.get('format.fixQuotes.enabled', false)
    if (!enabled) {
        return []
    }

    const quoteFixer = new QuoteFixer()
    const targetRange = range ?? new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE)
    const text = document.getText() // Get full text to ensure correct line numbers
    return quoteFixer.getEdits(text).filter(e => targetRange.contains(e.range))
}
