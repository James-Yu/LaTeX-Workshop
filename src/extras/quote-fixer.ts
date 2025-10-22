import * as vscode from 'vscode'

const QUOTE_PATTERN = /"([^"]*)"/g

interface ProcessResult {
    text: string,
    inVerbatim: boolean
}

interface SpecialMatch {
    kind: 'begin' | 'verb',
    index: number,
    length: number
}

interface EndMatch {
    index: number,
    length: number
}

/**
 * Normalizes straight double quotes into LaTeX-style quotes while skipping verbatim-like regions.
 */
export class QuoteFixer {
    private static readonly beginPattern = /\\begin\{(verbatim\*?|Verbatim\*?|lstlisting\*?)\}/g
    private static readonly endPattern = /\\end\{(verbatim\*?|Verbatim\*?|lstlisting\*?)\}/g
    private static readonly verbPattern = /\\[vV]erb/g

    /**
     * Replaces straight quotes in the provided text while preserving verbatim sections.
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
     * Determines the verbatim state after scanning the given text without mutating it.
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

    private splitIntoLines(text: string): string[] {
        if (text === '') {
            return ['']
        }
        return text.split(/\r?\n/)
    }

    private detectLineEnding(text: string): string {
        return text.includes('\r\n') ? '\r\n' : '\n'
    }

    private static pickNext(beginMatch: SpecialMatch | undefined, verbMatch: SpecialMatch | undefined): SpecialMatch | undefined {
        if (!beginMatch) {
            return verbMatch
        }
        if (!verbMatch) {
            return beginMatch
        }
        return beginMatch.index <= verbMatch.index ? beginMatch : verbMatch
    }

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

    private static cloneRegex(pattern: RegExp): RegExp {
        return new RegExp(pattern.source, pattern.flags)
    }
}

/**
 * Applies LaTeX quote normalization based on user configuration.
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
