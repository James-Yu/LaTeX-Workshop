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

/**
 * Apply LaTeX quote normalization to a piece of text and return the result.
 *
 * Used by the formatter to fold quote fixes into the formatter's output text
 * instead of producing additional `TextEdit`s that would overlap with the
 * formatter's full-range edit.
 *
 * @param document The document used to look up the relevant configuration.
 * @param text The text to normalize.
 * @returns The normalized text, or the original text if quote fixing is disabled.
 */
export function applyQuoteFixer(document: vscode.TextDocument, text: string): string {
    const config = vscode.workspace.getConfiguration('latex-workshop', document.uri)
    if (!config.get('format.fixQuotes.enabled', false)) {
        return text
    }
    return applyEditsToString(text, new QuoteFixer().getEdits(text))
}

/**
 * Apply a list of `TextEdit`s to a plain string. The fixers report edits with
 * line/character positions relative to the input text, so we convert each
 * range to a character offset and splice from the end backwards to keep
 * earlier offsets stable.
 */
export function applyEditsToString(text: string, edits: vscode.TextEdit[]): string {
    if (edits.length === 0) {
        return text
    }
    const lineOffsets: number[] = [0]
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '\n') {
            lineOffsets.push(i + 1)
        }
    }
    const offsetOf = (line: number, character: number): number => {
        const base = line < lineOffsets.length ? lineOffsets[line] : text.length
        return Math.min(base + character, text.length)
    }
    const sorted = edits.map(e => ({
        start: offsetOf(e.range.start.line, e.range.start.character),
        end: offsetOf(e.range.end.line, e.range.end.character),
        newText: e.newText,
    })).sort((a, b) => b.start - a.start)
    let result = text
    for (const e of sorted) {
        result = result.slice(0, e.start) + e.newText + result.slice(e.end)
    }
    return result
}
