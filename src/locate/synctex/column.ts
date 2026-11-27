/**
 * Locate the column of a backward SyncTeX click inside a source line.
 *
 * SyncTeX only resolves a PDF position to a source line. To place the cursor
 * on the clicked word, the viewer sends the text of the clicked PDF text span
 * split at the caret (`textBeforeSelection` / `textAfterSelection`), and we
 * look for the position in the source line that agrees best with both sides.
 *
 * The PDF text differs from the LaTeX source in many ways: commands and their
 * arguments (`\citep{key}` is rendered as "(Author, 2020)"), escaped and
 * typographic characters (`\%`, ``` `` ```, `''`, `'` rendered as `’`, `--`),
 * ligatures (`ﬁ`), hyphenation at the end of a PDF line ("peda-"), spacing.
 * Both texts are therefore reduced to a comparable form that keeps only
 * letters and digits (NFKC-normalized and lower-cased, one code point at a
 * time so that every kept character still knows its source column), and
 * LaTeX commands whose arguments are never printed inline (citations,
 * references, labels, ...) are turned into barriers that cannot match.
 *
 * Each position in the reduced source line is then scored by the length of
 * the common suffix with the text before the caret plus the length of the
 * common prefix with the text after it. The best-scoring position wins.
 */

/** Minimal part of `vscode.TextDocument` used here, to keep this module testable. */
export interface LineSource {
    readonly lineCount: number,
    lineAt(line: number): { readonly text: string }
}

/** A character that never occurs in the reduced PDF text. */
const BARRIER = '\u0000'

/**
 * Do not trust a match that agrees on fewer reduced characters than this.
 * Measured on a 28-page article: wrong matches for clicks on text that is not
 * in the source (citations, generated headings) mostly score 3 or 4, correct
 * matches almost always 5 or more.
 */
const MIN_SCORE = 5

/**
 * Commands whose arguments do not appear in the PDF where the command is, or
 * appear in a different form. Their arguments are skipped and the command is
 * replaced by a barrier.
 */
const INVISIBLE_ARGUMENT_COMMANDS = /^(?:[a-zA-Z]*cite[a-zA-Z]*|[a-zA-Z]*ref|label|begin|end|input|include|includegraphics|includepdf|bibliography|bibliographystyle|addbibresource|usepackage|RequirePackage|documentclass|vspace|hspace|index|glossary|setlength|addtolength|setcounter|addtocounter)$/

/** Letters and digits are the only characters compared. */
const KEPT_CHARACTER = /[\p{L}\p{N}]/u

interface ReducedText {
    /** The reduced text. */
    text: string,
    /** `start[i]` is the source column of the first source character producing `text[i]`. */
    start: number[],
    /** `end[i]` is the source column right after the last source character producing `text[i]`. */
    end: number[]
}

/**
 * Reduce one code point to its comparable form: NFKC, lower case, letters and
 * digits only. May return zero, one or several characters (e.g. `ﬁ` → `fi`).
 */
function reduceCodePoint(codePoint: string): string {
    let result = ''
    for (const char of codePoint.normalize('NFKC').toLowerCase()) {
        if (KEPT_CHARACTER.test(char)) {
            result += char
        }
    }
    return result
}

/**
 * Reduce the text of a PDF text span. No column mapping is needed here.
 */
export function reducePdfText(text: string): string {
    let result = ''
    for (const codePoint of text.normalize('NFKC')) {
        result += reduceCodePoint(codePoint)
    }
    return result
}

/**
 * Skip the optional star and all following `[...]` / `{...}` groups of a
 * command starting at `index`. Returns the index after the last group.
 */
function skipArguments(line: string, index: number): number {
    let i = index
    if (line[i] === '*') {
        i++
    }
    for (;;) {
        let j = i
        while (j < line.length && (line[j] === ' ' || line[j] === '\t')) {
            j++
        }
        const open = line[j]
        if (open !== '[' && open !== '{') {
            return i
        }
        const close = open === '[' ? ']' : '}'
        let depth = 0
        let k = j
        for (; k < line.length; k++) {
            const char = line[k]
            if (char === '\\') {
                k++
                continue
            }
            if (char === open) {
                depth++
            } else if (char === close) {
                depth--
                if (depth === 0) {
                    break
                }
            }
        }
        if (k >= line.length) {
            // Unbalanced group, e.g. an argument continuing on the next line.
            return line.length
        }
        i = k + 1
    }
}

/**
 * Reduce a LaTeX source line, keeping track of the source column of every
 * kept character.
 */
export function reduceSourceLine(line: string): ReducedText {
    const reduced: ReducedText = { text: '', start: [], end: [] }
    const push = (chars: string, start: number, end: number) => {
        for (const char of chars) {
            reduced.text += char
            for (let n = 0; n < char.length; n++) {
                reduced.start.push(start)
                reduced.end.push(end)
            }
        }
    }

    let i = 0
    while (i < line.length) {
        const char = line[i]
        if (char === '%') {
            // Comment until the end of the line.
            break
        }
        if (char === '\\') {
            const name = /^[a-zA-Z@]+/.exec(line.slice(i + 1))?.[0]
            if (name === undefined) {
                // Control symbol such as `\%`, `\&`, `\\`, `\,`. The escaped
                // character is never a letter or a digit, so drop both.
                i += 2
                continue
            }
            const afterName = i + 1 + name.length
            if (INVISIBLE_ARGUMENT_COMMANDS.test(name)) {
                const afterArguments = skipArguments(line, afterName)
                push(BARRIER, i, afterArguments)
                i = afterArguments
            } else {
                // Formatting commands (`\emph`, `\textbf`, ...): drop the name,
                // keep matching inside the argument.
                i = afterName
            }
            continue
        }
        const codePoint = String.fromCodePoint(line.codePointAt(i) ?? 0)
        push(reduceCodePoint(codePoint), i, i + codePoint.length)
        i += codePoint.length
    }
    return reduced
}

/**
 * Find the column in `line` that matches the clicked PDF position best.
 *
 * @param line - The source line.
 * @param textBefore - The text of the clicked PDF span before the caret.
 * @param textAfter - The text of the clicked PDF span after the caret.
 * @returns The best column and its score, or `undefined` if nothing matches
 * well enough.
 */
export function findColumn(line: string, textBefore: string, textAfter: string): { column: number, score: number } | undefined {
    const before = reducePdfText(textBefore)
    const after = reducePdfText(textAfter)
    if (before.length + after.length === 0) {
        return
    }
    const source = reduceSourceLine(line)
    const text = source.text
    const minScore = Math.min(MIN_SCORE, before.length + after.length)

    let best: { position: number, matchedAfter: number, score: number } | undefined
    for (let position = 0; position <= text.length; position++) {
        let matchedBefore = 0
        while (matchedBefore < before.length && matchedBefore < position
            && before[before.length - 1 - matchedBefore] === text[position - 1 - matchedBefore]) {
            matchedBefore++
        }
        let matchedAfter = 0
        while (matchedAfter < after.length && position + matchedAfter < text.length
            && after[matchedAfter] === text[position + matchedAfter]) {
            matchedAfter++
        }
        const score = matchedBefore + matchedAfter
        // Strictly greater: on a tie, the first occurrence is kept.
        if (score >= minScore && (best === undefined || score > best.score)) {
            best = { position, matchedAfter, score }
        }
    }
    if (best === undefined) {
        return
    }

    let column: number
    if (best.matchedAfter > 0 || best.position === 0) {
        // The caret is right before the next matched character.
        column = best.position < text.length ? source.start[best.position] : line.length
    } else {
        // Only the text before the caret matched: stay right after it, before
        // anything that was skipped (e.g. a following `\citep{...}`).
        column = source.end[best.position - 1]
    }
    return { column, score: best.score }
}

/**
 * Get the row and column of a backward SyncTeX click. SyncTeX may be off by
 * one line, so the neighbouring lines are also considered; a neighbouring
 * line wins only if it matches strictly better than the reported line.
 *
 * @param doc - The source document.
 * @param row - The 0-based line reported by SyncTeX.
 * @param textBefore - The text of the clicked PDF span before the caret.
 * @param textAfter - The text of the clicked PDF span after the caret.
 * @returns The 0-based row and column. The column is 0 if nothing matched.
 */
export function getRowAndColumn(doc: LineSource, row: number, textBefore: string, textAfter: string): [number, number] {
    let best: { row: number, column: number, score: number } | undefined
    for (const candidate of [row, row - 1, row + 1]) {
        if (candidate < 0 || candidate >= doc.lineCount) {
            continue
        }
        const match = findColumn(doc.lineAt(candidate).text, textBefore, textAfter)
        if (match && (best === undefined || match.score > best.score)) {
            best = { row: candidate, column: match.column, score: match.score }
        }
    }
    return best ? [best.row, best.column] : [row, 0]
}
