import * as vscode from 'vscode'
import { stripCommentsAndVerbatim } from '../utils/utils'

/**
 * Represents the type of math environment we are currently in.
 */
enum MathMode {
    Inline, // $ ... $
    Display, // $$ ... $$
}

/**
 * Transforms inline math delimiters ($ ... $) into \( ... \) and
 * display math delimiters ($$ ... $$) into \[ ... \]
 * while respecting verbatim-like regions.
 */
export class MathFixer {
    // Regex to find tokens: escaped char, display math, or inline math.
    // Group 1: Escaped char (e.g. \$)
    // Group 2: Display math ($$)
    // Group 3: Inline math ($)
    private static readonly tokenPattern = /(\\.)|(\$\$)|(\$)/g

    public apply(text: string): string {
        // 1. Strip comments and verbatim content
        // stripCommentsAndVerbatim preserves line count.
        // Verbatim environments are replaced by empty lines.
        // \verb commands are replaced by spaces (preserving length).
        // Comments are removed (replaced by empty string at end of line).
        const stripped = stripCommentsAndVerbatim(text)
        const strippedLines = stripped.split('\n')
        const originalLines = text.split('\n')

        if (strippedLines.length !== originalLines.length) {
            // Should not happen if stripCommentsAndVerbatim is correct
            return text
        }

        const mathStack: MathMode[] = []
        const resultLines: string[] = []

        for (let i = 0; i < originalLines.length; i++) {
            const sLine = strippedLines[i]
            const oLine = originalLines[i]

            // If stripped line is empty (and original wasn't empty, or even if it was),
            // it might be a stripped verbatim line or just empty.
            // If it's empty, we can skip regex matching, but we must preserve the original line.
            // However, if the original line had content but stripped is empty, it means it was fully stripped (verbatim/comment).
            // So we just keep the original line.
            if (!sLine || sLine.trim() === '') {
                resultLines.push(oLine)
                continue
            }

            // Find matches in the stripped line
            let lineResult = ''
            let lastIndex = 0
            let match: RegExpExecArray | null

            MathFixer.tokenPattern.lastIndex = 0
            while ((match = MathFixer.tokenPattern.exec(sLine)) !== null) {
                const index = match.index
                const fullMatch = match[0]
                const escaped = match[1]
                const displayMath = match[2]
                const inlineMath = match[3]

                // Append text before the match (from the ORIGINAL line)
                lineResult += oLine.slice(lastIndex, index)

                if (escaped) {
                    // Escaped character, keep as is (from original)
                    lineResult += oLine.slice(index, index + fullMatch.length)
                } else if (displayMath) {
                    if (mathStack.length > 0 && mathStack[mathStack.length - 1] === MathMode.Display) {
                        mathStack.pop()
                        lineResult += '\\]'
                    } else {
                        mathStack.push(MathMode.Display)
                        lineResult += '\\['
                    }
                } else if (inlineMath) {
                    if (mathStack.length > 0 && mathStack[mathStack.length - 1] === MathMode.Inline) {
                        mathStack.pop()
                        lineResult += '\\)'
                    } else {
                        mathStack.push(MathMode.Inline)
                        lineResult += '\\('
                    }
                }

                lastIndex = index + fullMatch.length
            }

            // Append remaining text from original line
            lineResult += oLine.slice(lastIndex)
            resultLines.push(lineResult)
        }

        return resultLines.join('\n')
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

    if (edit) {
        const fixed = mathFixer.apply(edit.newText)
        edit.newText = fixed
        return edit
    }

    const targetRange =
        range ??
        document.validateRange(
            new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE)
        )
    const originalText = document.getText(targetRange)
    const fixed = mathFixer.apply(originalText)
    if (fixed === originalText) {
        return undefined
    }
    return vscode.TextEdit.replace(targetRange, fixed)
}
