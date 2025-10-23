import * as vscode from 'vscode'

/**
 * Regular expression that captures straight double-quoted substrings for replacement.
 */
const QUOTE_PATTERN = /"([^"]*)"/g

/**
 * Represents the outcome of processing a single line, including the updated verbatim state.
 */
interface ProcessResult {
    text: string,
    inVerbatim: boolean
}

/**
 * Describes a match for a structure that marks the start of a verbatim-like region or a \verb command.
 */
interface SpecialMatch {
    kind: 'begin' | 'verb',
    index: number,
    length: number
}

/**
 * Describes the position of a verbatim-like environment terminator within a line.
 */
interface EndMatch {
    index: number,
    length: number
}

/**
 * Transforms straight double quotes into LaTeX-style quotes while respecting verbatim-like regions
 * (
 *     verbatim, Verbatim, lstlisting, and \verb commands
 * ) to avoid altering content where literal text is expected.
 */
export class QuoteFixer {
    /**
     * Matches the opening of verbatim-like environments that should suspend quote replacement.
     */
    private static readonly beginPattern = /\\begin\{(verbatim\*?|Verbatim\*?|lstlisting\*?)\}/g

    /**
     * Matches the closing counterpart to {@link QuoteFixer.beginPattern}.
     */
    private static readonly endPattern = /\\end\{(verbatim\*?|Verbatim\*?|lstlisting\*?)\}/g

    /**
     * Matches \verb commands (case-insensitive), which encapsulate literal text with a delimiter.
     */
    private static readonly verbPattern = /\\[vV]erb/g

    /**
     * Replaces straight quotes in the provided text while preserving verbatim sections.
     * The method walks line by line, tracking whether the current context is inside a verbatim region.
     * When a line segment is outside such a region and mutation is allowed, the straight quotes are
     * converted to `` and ''. Verbose regions are preserved verbatim, and the verbatim state is
     * carried across line boundaries.
     *
     * @param text - The content to process.
     * @param initialInVerbatim - Indicates whether processing starts in a verbatim environment.
     * @returns The processed text and the final verbatim state.
     */
    public apply(text: string, initialInVerbatim: boolean = false): { text: string, inVerbatim: boolean } {
        const lines = this.splitIntoLines(text)
        let inVerbatim = initialInVerbatim
        const processed = lines.map(line => {
            const result = this.processLine(line, inVerbatim, true)
            inVerbatim = result.inVerbatim
            return result.text
        })
        return {
            text: processed.join(this.detectLineEnding(text)),
            inVerbatim
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
        const lines = this.splitIntoLines(text)
        let inVerbatim = initialInVerbatim
        for (const line of lines) {
            inVerbatim = this.processLine(line, inVerbatim, false).inVerbatim
        }
        return inVerbatim
    }

    /**
     * Processes a single line, optionally mutating it by replacing quotes, while tracking the verbatim state.
     * The method advances through the line, alternating between verbatim and non-verbatim segments:
     * when inside verbatim, it searches for the next environment terminator; otherwise, it finds the next
     * verbatim opener or \verb command, performs replacements on the intervening text, and updates the
     * state based on what was encountered.
     *
     * @param line - The line to process.
     * @param inVerbatim - Whether the line starts inside a verbatim section.
     * @param mutate - If true, quotes are replaced; otherwise the method only tracks state.
     * @returns The processed text (which may be unchanged) and the updated verbatim state at the end of the line.
     */
    private processLine(line: string, inVerbatim: boolean, mutate: boolean): ProcessResult {
        if (line.trimStart().startsWith('%')) {
            return { text: line, inVerbatim }
        }

        let result = ''
        let idx = 0
        let currentState = inVerbatim

        while (idx < line.length) {
            if (currentState) {
                const endMatch = QuoteFixer.findNextEnd(line, idx)
                if (!endMatch) {
                    result += line.slice(idx)
                    return { text: result, inVerbatim: true }
                }
                result += line.slice(idx, endMatch.index + endMatch.length)
                idx = endMatch.index + endMatch.length
                currentState = false
                continue
            }

            const beginMatch = QuoteFixer.findNextBegin(line, idx)
            const verbMatch = QuoteFixer.findNextVerb(line, idx)
            const nextMatch = QuoteFixer.pickNext(beginMatch, verbMatch)

            const segmentEnd = nextMatch ? nextMatch.index : line.length
            const segment = line.slice(idx, segmentEnd)
            result += mutate ? segment.replace(QUOTE_PATTERN, "``$1''") : segment
            idx = segmentEnd

            if (!nextMatch) {
                break
            }

            result += line.slice(idx, idx + nextMatch.length)
            idx += nextMatch.length
            if (nextMatch.kind === 'begin') {
                currentState = true
            }
        }
        if (idx < line.length) {
            const tail = line.slice(idx)
            result += mutate ? tail.replace(QUOTE_PATTERN, "``$1''") : tail
        }
        return { text: result, inVerbatim: currentState }
    }

    /**
     * Splits the provided text into lines while preserving the presence of an empty string input.
     *
     * @param text - The text to split.
     * @returns The array of lines, ensuring at least one entry for empty input.
     */
    private splitIntoLines(text: string): string[] {
        if (text === '') {
            return ['']
        }
        return text.split(/\r?\n/)
    }

    /**
     * Detects the dominant line ending in a block of text so the original style is preserved.
     *
     * @param text - The text to analyze.
     * @returns The detected line ending sequence (`\r\n` or `\n`).
     */
    private detectLineEnding(text: string): string {
        return text.includes('\r\n') ? '\r\n' : '\n'
    }

    /**
     * Picks the earliest of the next verbatim begin or \verb command matches.
     *
     * @param beginMatch - The next `\begin{...}` match, if any.
     * @param verbMatch - The next `\verb` match, if any.
     * @returns The earliest match, or `undefined` if neither exists.
     */
    private static pickNext(beginMatch: SpecialMatch | undefined, verbMatch: SpecialMatch | undefined): SpecialMatch | undefined {
        if (!beginMatch) {
            return verbMatch
        }
        if (!verbMatch) {
            return beginMatch
        }
        return beginMatch.index <= verbMatch.index ? beginMatch : verbMatch
    }

    /**
     * Locates the next opening verbatim-like environment after the given position.
     *
     * @param text - The text to search.
     * @param start - The index to start the search from.
     * @returns Information about the match, or `undefined` if none is found.
     */
    private static findNextBegin(text: string, start: number): SpecialMatch | undefined {
        const regex = QuoteFixer.cloneRegex(QuoteFixer.beginPattern)
        regex.lastIndex = start
        const match = regex.exec(text)
        if (!match) {
            return undefined
        }
        return {
            kind: 'begin',
            index: match.index,
            length: match[0].length
        }
    }

    /**
     * Locates the next `\verb` command and computes the span that runs through its closing delimiter.
     * The method accounts for single-character delimiters and gracefully handles malformed commands
     * that omit the closing delimiter by consuming the remainder of the line.
     *
     * @param text - The text to search.
     * @param start - The index to start the search from.
     * @returns Information about the match, or `undefined` if none is found.
     */
    private static findNextVerb(text: string, start: number): SpecialMatch | undefined {
        const regex = QuoteFixer.cloneRegex(QuoteFixer.verbPattern)
        regex.lastIndex = start
        const match = regex.exec(text)
        if (!match) {
            return undefined
        }
        const delimiterIndex = match.index + match[0].length
        if (delimiterIndex >= text.length) {
            return {
                kind: 'verb',
                index: match.index,
                length: text.length - match.index
            }
        }

        const delimiter = text.charAt(delimiterIndex)
        let end = delimiterIndex + 1
        while (end < text.length && text.charAt(end) !== delimiter) {
            end++
        }
        if (end < text.length) {
            end++
        }

        const length = end - match.index
        return {
            kind: 'verb',
            index: match.index,
            length
        }
    }

    /**
     * Locates the next closing verbatim-like environment after the given position.
     *
     * @param text - The text to search.
     * @param start - The index to start the search from.
     * @returns Information about the end match, or `undefined` if none is found.
     */
    private static findNextEnd(text: string, start: number): EndMatch | undefined {
        const regex = QuoteFixer.cloneRegex(QuoteFixer.endPattern)
        regex.lastIndex = start
        const match = regex.exec(text)
        if (!match) {
            return undefined
        }
        return {
            index: match.index,
            length: match[0].length
        }
    }

    /**
     * Creates a fresh RegExp instance from a reusable pattern so that `lastIndex` mutations are isolated.
     *
     * @param pattern - The RegExp to clone.
     * @returns A new RegExp with identical source and flags.
     */
    private static cloneRegex(pattern: RegExp): RegExp {
        return new RegExp(pattern.source, pattern.flags)
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
