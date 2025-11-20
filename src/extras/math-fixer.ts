import * as vscode from 'vscode'

/**
 * Represents the type of math environment we are currently in.
 */
enum MathMode {
    Inline, // $ ... $
    Display, // $$ ... $$
}

/**
 * Represents the outcome of processing a single line.
 */
interface ProcessResult {
    text: string,
    inVerbatim: boolean,
    mathStack: MathMode[]
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
 * Transforms inline math delimiters ($ ... $) into \( ... \) and
 * display math delimiters ($$ ... $$) into \[ ... \]
 * while respecting verbatim-like regions.
 */
export class MathFixer {
    private static readonly beginPattern =
        /\\begin\{(verbatim\*?|Verbatim\*?|lstlisting\*?)\}/g
    private static readonly endPattern =
        /\\end\{(verbatim\*?|Verbatim\*?|lstlisting\*?)\}/g
    private static readonly verbPattern = /\\[vV]erb/g

    // Regex to find tokens: escaped char, display math, or inline math.
    // Group 1: Escaped char (e.g. \$)
    // Group 2: Display math ($$)
    // Group 3: Inline math ($)
    private static readonly tokenPattern = /(\\.)|(\$\$)|(\$)/g

    public apply(
        text: string,
        initialInVerbatim: boolean = false
    ): { text: string, inVerbatim: boolean } {
        const lines = this.splitIntoLines(text)
        let inVerbatim = initialInVerbatim
        let mathStack: MathMode[] = []

        const processed = lines.map((line) => {
            const result = this.processLine(line, inVerbatim, mathStack, true)
            inVerbatim = result.inVerbatim
            mathStack = result.mathStack
            return result.text
        })

        return {
            text: processed.join(this.detectLineEnding(text)),
            inVerbatim,
        }
    }

    public stateAfter(text: string, initialInVerbatim: boolean = false): boolean {
        const lines = this.splitIntoLines(text)
        let inVerbatim = initialInVerbatim
        let mathStack: MathMode[] = []

        for (const line of lines) {
            const result = this.processLine(line, inVerbatim, mathStack, false)
            inVerbatim = result.inVerbatim
            mathStack = result.mathStack
        }
        return inVerbatim
    }

    private processLine(
        line: string,
        inVerbatim: boolean,
        mathStack: MathMode[],
        mutate: boolean
    ): ProcessResult {
        // Create a copy of the stack to avoid mutating the passed reference directly.
        // We want to evolve the state for this line independently.
        const currentStack = [...mathStack]

        if (line.trimStart().startsWith('%')) {
            return { text: line, inVerbatim, mathStack: currentStack }
        }

        let result = ''
        let idx = 0
        let currentState = inVerbatim

        while (idx < line.length) {
            if (currentState) {
                const endMatch = MathFixer.findNextEnd(line, idx)
                if (!endMatch) {
                    result += line.slice(idx)
                    return { text: result, inVerbatim: true, mathStack: currentStack }
                }
                result += line.slice(idx, endMatch.index + endMatch.length)
                idx = endMatch.index + endMatch.length
                currentState = false
                continue
            }

            const beginMatch = MathFixer.findNextBegin(line, idx)
            const verbMatch = MathFixer.findNextVerb(line, idx)
            const nextMatch = MathFixer.pickNext(beginMatch, verbMatch)

            const segmentEnd = nextMatch ? nextMatch.index : line.length
            const segment = line.slice(idx, segmentEnd)

            // Process math in this non-verbatim segment
            result += this.processSegment(segment, currentStack, mutate)

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
            result += this.processSegment(tail, currentStack, mutate)
        }
        return { text: result, inVerbatim: currentState, mathStack: currentStack }
    }

    private processSegment(
        segment: string,
        stack: MathMode[],
        mutate: boolean
    ): string {
        // If not mutating, we still need to iterate to update the stack for subsequent lines.

        let result = ''
        let lastIndex = 0
        let match: RegExpExecArray | null

        // Reset lastIndex for the global regex
        MathFixer.tokenPattern.lastIndex = 0

        while ((match = MathFixer.tokenPattern.exec(segment)) !== null) {
            const index = match.index
            const fullMatch = match[0]
            const escaped = match[1]
            const displayMath = match[2]
            const inlineMath = match[3]

            // Append text before the match
            result += segment.slice(lastIndex, index)

            if (escaped) {
                result += fullMatch
            } else if (displayMath) {
                if (stack.length > 0 && stack[stack.length - 1] === MathMode.Display) {
                    stack.pop()
                    result += mutate ? '\\]' : fullMatch
                } else {
                    stack.push(MathMode.Display)
                    result += mutate ? '\\[' : fullMatch
                }
            } else if (inlineMath) {
                if (stack.length > 0 && stack[stack.length - 1] === MathMode.Inline) {
                    stack.pop()
                    result += mutate ? '\\)' : fullMatch
                } else {
                    stack.push(MathMode.Inline)
                    result += mutate ? '\\(' : fullMatch
                }
            }

            lastIndex = index + fullMatch.length
        }

        result += segment.slice(lastIndex)
        return mutate ? result : segment
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

    private static pickNext(
        beginMatch: SpecialMatch | undefined,
        verbMatch: SpecialMatch | undefined
    ): SpecialMatch | undefined {
        if (!beginMatch) {
            return verbMatch
        }
        if (!verbMatch) {
            return beginMatch
        }
        return beginMatch.index <= verbMatch.index ? beginMatch : verbMatch
    }

    private static findNextBegin(
        text: string,
        start: number
    ): SpecialMatch | undefined {
        const regex = MathFixer.cloneRegex(MathFixer.beginPattern)
        regex.lastIndex = start
        const match = regex.exec(text)
        if (!match) {
            return undefined
        }
        return {
            kind: 'begin',
            index: match.index,
            length: match[0].length,
        }
    }

    private static findNextVerb(
        text: string,
        start: number
    ): SpecialMatch | undefined {
        const regex = MathFixer.cloneRegex(MathFixer.verbPattern)
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
                length: text.length - match.index,
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
            length,
        }
    }

    private static findNextEnd(
        text: string,
        start: number
    ): EndMatch | undefined {
        const regex = MathFixer.cloneRegex(MathFixer.endPattern)
        regex.lastIndex = start
        const match = regex.exec(text)
        if (!match) {
            return undefined
        }
        return {
            index: match.index,
            length: match[0].length,
        }
    }

    private static cloneRegex(pattern: RegExp): RegExp {
        return new RegExp(pattern.source, pattern.flags)
    }
}

export function fixMath(
    document: vscode.TextDocument,
    range: vscode.Range | undefined,
    edit: vscode.TextEdit | undefined
): vscode.TextEdit | undefined {
    const config = vscode.workspace.getConfiguration(
        'latex-workshop',
        document.uri
    )
    const enabled = config.get('format.fixMath.enabled', false)
    if (!enabled) {
        return edit
    }

    const mathFixer = new MathFixer()


    const initialInVerbatim = range
        ? mathFixer.stateAfter(
            document.getText(
                new vscode.Range(new vscode.Position(0, 0), range.start)
            )
        )
        : false

    if (edit) {
        const fixed = mathFixer.apply(edit.newText, initialInVerbatim)
        edit.newText = fixed.text
        return edit
    }

    const targetRange =
        range ??
        document.validateRange(
            new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE)
        )
    const originalText = document.getText(targetRange)
    const fixed = mathFixer.apply(originalText, initialInVerbatim)
    if (fixed.text === originalText) {
        return undefined
    }
    return vscode.TextEdit.replace(targetRange, fixed.text)
}
