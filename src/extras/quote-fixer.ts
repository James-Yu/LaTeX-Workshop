import * as vscode from 'vscode'
import { stripCommentsAndVerbatim } from '../utils/utils'

/**
 * Regular expression that captures straight double-quoted substrings for replacement.
 */
const QUOTE_PATTERN = /"([^"]*)"/g

/**
 * Transforms straight double quotes into LaTeX-style quotes while respecting verbatim-like regions
 * (
 *     verbatim, Verbatim, lstlisting, and \verb commands
 * ) to avoid altering content where literal text is expected.
 */
export class QuoteFixer {
    /**
     * Replaces straight quotes in the provided text while preserving verbatim sections.
     * The method generates a masked version of the text where verbatim sections are replaced by spaces,
     * then performs replacements on the original text based on matches in the masked text.
     *
     * @param text - The content to process.
     * @returns The processed text.
     */
    public apply(text: string): string {
        // 1. Strip comments and verbatim content
        const stripped = stripCommentsAndVerbatim(text)
        const strippedLines = stripped.split('\n')
        const originalLines = text.split('\n')

        if (strippedLines.length !== originalLines.length) {
            return text
        }

        const resultLines: string[] = []

        for (let i = 0; i < originalLines.length; i++) {
            const sLine = strippedLines[i]
            const oLine = originalLines[i]

            if (!sLine || sLine.trim() === '') {
                resultLines.push(oLine)
                continue
            }

            let lineResult = ''
            let lastIndex = 0
            let match: RegExpExecArray | null

            QUOTE_PATTERN.lastIndex = 0
            while ((match = QUOTE_PATTERN.exec(sLine)) !== null) {
                const index = match.index
                const fullMatch = match[0]
                const content = match[1]

                // Append text before the match (from the ORIGINAL line)
                lineResult += oLine.slice(lastIndex, index)

                // Append replaced quote
                // We use the content from the ORIGINAL line
                const originalContent = oLine.slice(index + 1, index + 1 + content.length)
                lineResult += "``" + originalContent + "''"

                lastIndex = index + fullMatch.length
            }

            // Append remaining text
            lineResult += oLine.slice(lastIndex)
            resultLines.push(lineResult)
        }

        return resultLines.join('\n')
    }
}

/**
 * Applies LaTeX quote normalization based on the user configuration. When the feature is enabled, this helper
 * ensures that edits are processed with the appropriate verbatim awareness so that literal regions remain intact.
 *
 * @param document - The document being edited.
 * @param range - The range covered by the edit, or `undefined` to process the entire document.
 * @param edit - An existing text edit that should have its text transformed in-place.
 * @returns The updated text edit, or a new edit when one is required, or `undefined` if no change is needed.
 */
export function fixQuotes(document: vscode.TextDocument, range: vscode.Range | undefined, edit: vscode.TextEdit | undefined): vscode.TextEdit | undefined {
    const config = vscode.workspace.getConfiguration('latex-workshop', document.uri)
    const enabled = config.get('format.fixQuotes.enabled', false)
    if (!enabled) {
        return edit
    }

    const quoteFixer = new QuoteFixer()

    if (edit) {
        const fixed = quoteFixer.apply(edit.newText)
        edit.newText = fixed
        return edit
    }

    const targetRange = range ?? document.validateRange(new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE))
    const originalText = document.getText(targetRange)
    const fixed = quoteFixer.apply(originalText)
    if (fixed === originalText) {
        return undefined
    }
    return vscode.TextEdit.replace(targetRange, fixed)
}
