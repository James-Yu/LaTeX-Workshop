import * as vscode from 'vscode'
import { stripCommentsAndVerbatim } from '../utils/utils'
import { applyEditsToString } from './quote-fixer'

/**
 * Represent the type of math environment we are currently in.
 */
enum MathMode {
    Inline, // $ ... $
    Display, // $$ ... $$
}

type LineRange = {start: number, end: number}

/**
 * Transform inline math delimiters $ ... $ into \( ... \) and
 * display math delimiters $$ ... $$ into \[ ... \].
 */
export class MathFixer {
    // Regex to find tokens: escaped char, display math, or inline math.
    // Group 1: Escaped char (e.g. \$)
    // Group 2: Display math ($$)
    // Group 3: Inline math ($)
    private readonly tokenPattern = /(\\.)|(\$\$)|(\$)/g
    private readonly explPattern = /\\ExplSyntax(On|Off)/g

    /**
     * Generate a list of TextEdits to transform math delimiters.
     *
     * @param text - The content to process.
     * @returns An array of TextEdits.
     */
    public getEdits(text: string): vscode.TextEdit[] {
        // Strip comments and verbatim-like content first so delimiter positions stay stable
        // while ignored regions no longer participate in math detection.
        const stripped = stripCommentsAndVerbatim(text)
        const strippedLines = stripped.split('\n')

        const mathStack: MathMode[] = []
        const edits: vscode.TextEdit[] = []
        let explOn = false

        for (let i = 0; i < strippedLines.length; i++) {
            const sLine = strippedLines[i]

            if (!sLine || sLine.trim() === '') {
                continue
            }

            // expl3 blocks may contain `$` as ordinary characters, so skip token handling
            // anywhere between \explOn and \ExplSyntaxOff.
            const explState = this.getExplRanges(sLine, explOn)
            explOn = explState.explOn
            let match: RegExpExecArray | null
            this.tokenPattern.lastIndex = 0
            while ((match = this.tokenPattern.exec(sLine)) !== null) {
                const index = match.index
                if (match[1] !== undefined || explState.ranges.some(range => range.start <= index && index < range.end)) {
                    continue
                }

                // `$$` is handled before `$` so display math keeps precedence over inline math.
                if (match[2]) {
                    this.handleDisplayMath(i, sLine, index, mathStack, edits)
                } else if (match[3]) {
                    this.toggleMathDelimiter(i, index, 1, MathMode.Inline, mathStack, edits)
                }
            }
        }

        return edits
    }

    private getExplRanges(sLine: string, explOn: boolean): { ranges: LineRange[], explOn: boolean } {
        const ranges: LineRange[] = []
        let rangeStart = explOn ? 0 : undefined

        this.explPattern.lastIndex = 0
        let explMatch: RegExpExecArray | null
        while ((explMatch = this.explPattern.exec(sLine)) !== null) {
            if (explMatch[1] === 'On') {
                if (!explOn) {
                    rangeStart = explMatch.index
                    explOn = true
                }
            } else if (explOn) {
                ranges.push({ start: rangeStart ?? 0, end: explMatch.index + explMatch[0].length })
                rangeStart = undefined
                explOn = false
            }
        }

        if (explOn) {
            ranges.push({ start: rangeStart ?? 0, end: sLine.length })
        }

        return { ranges, explOn }
    }
    private handleDisplayMath(lineNumber: number, sLine: string, index: number, mathStack: MathMode[], edits: vscode.TextEdit[]) {
        if (this.shouldTreatAsEmptyInlineMath(sLine, index, mathStack)) {
            this.toggleMathDelimiter(lineNumber, index, 1, MathMode.Inline, mathStack, edits)
            this.toggleMathDelimiter(lineNumber, index + 1, 1, MathMode.Inline, mathStack, edits)
            return
        }

        this.toggleMathDelimiter(lineNumber, index, 2, MathMode.Display, mathStack, edits)
    }

    private shouldTreatAsEmptyInlineMath(sLine: string, index: number, mathStack: MathMode[]): boolean {
        const isOpeningDisplay = mathStack.length === 0 || mathStack[mathStack.length - 1] !== MathMode.Display
        if (!isOpeningDisplay) {
            return false
        }

        const closingIndex = sLine.substring(index + 2).indexOf('$$')
        return closingIndex === -1 || closingIndex === 0
    }

    private toggleMathDelimiter(lineNumber: number, index: number, length: number, mode: MathMode, mathStack: MathMode[], edits: vscode.TextEdit[]) {
        const range = new vscode.Range(lineNumber, index, lineNumber, index + length)
        if (mathStack.length > 0 && mathStack[mathStack.length - 1] === mode) {
            mathStack.pop()
            edits.push(vscode.TextEdit.replace(range, mode === MathMode.Display ? '\\]' : '\\)'))
        } else {
            mathStack.push(mode)
            edits.push(vscode.TextEdit.replace(range, mode === MathMode.Display ? '\\[' : '\\('))
        }
    }
}

/**
 * Apply maths normalization based on the user configuration.
 *
 * @param document The document being edited.
 * @param range The range covered by the edit, or `undefined` to process the entire document.
 * @returns A list of TextEdit.
 */
export function fixMath(document: vscode.TextDocument, range: vscode.Range | undefined): vscode.TextEdit[] {
    const config = vscode.workspace.getConfiguration('latex-workshop', document.uri)
    const enabled = config.get('format.fixMath.enabled', false)
    if (!enabled) {
        return []
    }

    const mathFixer = new MathFixer()
    const targetRange = range ?? new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE)
    const text = document.getText() // Get full text to ensure correct line numbers
    return mathFixer.getEdits(text).filter(e => targetRange.contains(e.range))
}

/**
 * Apply LaTeX math delimiter normalization to a piece of text and return the result.
 *
 * Used by the formatter to fold math fixes into the formatter's output text
 * instead of producing additional `TextEdit`s that would overlap with the
 * formatter's full-range edit.
 *
 * @param document The document used to look up the relevant configuration.
 * @param text The text to normalize.
 * @returns The normalized text, or the original text if math fixing is disabled.
 */
export function applyMathFixer(document: vscode.TextDocument, text: string): string {
    const config = vscode.workspace.getConfiguration('latex-workshop', document.uri)
    if (!config.get('format.fixMath.enabled', false)) {
        return text
    }
    return applyEditsToString(text, new MathFixer().getEdits(text))
}
