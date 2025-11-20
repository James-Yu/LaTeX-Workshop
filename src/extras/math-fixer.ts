import * as vscode from 'vscode'
import { stripCommentsAndVerbatimPreservingLength } from '../utils/utils'

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

    public apply(
        text: string,
        initialInVerbatim: boolean = false
    ): { text: string, inVerbatim: boolean } {
        // 1. Mask verbatim and comments
        const { text: masked, finalInVerbatim } = stripCommentsAndVerbatimPreservingLength(text, initialInVerbatim)

        // 2. Find math delimiters in masked text
        const mathStack: MathMode[] = []
        let result = ''
        let lastIndex = 0
        let match: RegExpExecArray | null

        MathFixer.tokenPattern.lastIndex = 0
        while ((match = MathFixer.tokenPattern.exec(masked)) !== null) {
            const index = match.index
            const fullMatch = match[0]
            const escaped = match[1]
            const displayMath = match[2]
            const inlineMath = match[3]

            // Append text before the match (from the ORIGINAL text)
            result += text.slice(lastIndex, index)

            if (escaped) {
                // Escaped character, keep as is
                result += fullMatch
            } else if (displayMath) {
                if (mathStack.length > 0 && mathStack[mathStack.length - 1] === MathMode.Display) {
                    mathStack.pop()
                    result += '\\]'
                } else {
                    mathStack.push(MathMode.Display)
                    result += '\\['
                }
            } else if (inlineMath) {
                if (mathStack.length > 0 && mathStack[mathStack.length - 1] === MathMode.Inline) {
                    mathStack.pop()
                    result += '\\)'
                } else {
                    mathStack.push(MathMode.Inline)
                    result += '\\('
                }
            }

            lastIndex = index + fullMatch.length
        }

        // Append remaining text
        result += text.slice(lastIndex)

        return {
            text: result,
            inVerbatim: finalInVerbatim,
        }
    }

    public stateAfter(text: string, initialInVerbatim: boolean = false): boolean {
        const { finalInVerbatim } = stripCommentsAndVerbatimPreservingLength(text, initialInVerbatim)
        return finalInVerbatim
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
