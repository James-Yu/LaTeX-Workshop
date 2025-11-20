import * as vscode from 'vscode'
import { stripCommentsAndVerbatimPreservingLength } from '../utils/utils'

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
     * @param initialInVerbatim - Indicates whether processing starts in a verbatim environment.
     * @returns The processed text and the final verbatim state.
     */
    public apply(text: string, initialInVerbatim: boolean = false): { text: string, inVerbatim: boolean } {
        // 1. Mask verbatim and comments
        const { text: masked, finalInVerbatim } = stripCommentsAndVerbatimPreservingLength(text, initialInVerbatim)

        // 2. Find quotes in masked text
        let result = ''
        let lastIndex = 0
        let match: RegExpExecArray | null

        // Reset lastIndex for the global regex
        QUOTE_PATTERN.lastIndex = 0
        while ((match = QUOTE_PATTERN.exec(masked)) !== null) {
            const index = match.index
            const fullMatch = match[0]
            const content = match[1]

            // Append text before the match (from the ORIGINAL text)
            result += text.slice(lastIndex, index)

            // Append replaced quote
            // Note: We use the content from the ORIGINAL text, not the masked text
            // (though they should be identical in non-verbatim regions, but just to be safe)
            // Actually, QUOTE_PATTERN captures the content inside quotes.
            // If the content contained verbatim markers, they would be masked in `masked`.
            // But we want the original content.
            // The match index and length in masked text correspond to original text.
            // So we take the substring from original text.
            const originalContent = text.slice(index + 1, index + 1 + content.length)
            result += "``" + originalContent + "''"

            lastIndex = index + fullMatch.length
        }

        // Append remaining text
        result += text.slice(lastIndex)

        return {
            text: result,
            inVerbatim: finalInVerbatim
        }
    }

    /**
     * Determines the verbatim state after scanning the given text without mutating it. This is used
     * to discover whether subsequent edits should be considered inside a verbatim scope.
     *
     * @param text - The content to inspect.
     * @param initialInVerbatim - Indicates whether inspection starts in a verbatim environment.
     * @returns The verbatim state after processing the entire text.
     */
    public stateAfter(text: string, initialInVerbatim: boolean = false): boolean {
        const { finalInVerbatim } = stripCommentsAndVerbatimPreservingLength(text, initialInVerbatim)
        return finalInVerbatim
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
    const initialInVerbatim = range ? quoteFixer.stateAfter(document.getText(new vscode.Range(new vscode.Position(0, 0), range.start))) : false

    if (edit) {
        const fixed = quoteFixer.apply(edit.newText, initialInVerbatim)
        edit.newText = fixed.text
        return edit
    }

    const targetRange = range ?? document.validateRange(new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE))
    const originalText = document.getText(targetRange)
    const fixed = quoteFixer.apply(originalText, initialInVerbatim)
    if (fixed.text === originalText) {
        return undefined
    }
    return vscode.TextEdit.replace(targetRange, fixed.text)
}
