import * as vs from 'vscode'

import type { Extension } from '../main'

const CODE_TO_ACTION_STRING: {[key: number]: string} = {
    1: 'Terminate command with empty statement',
    2: 'Convert to non-breaking space (~)',
    4: 'Remove italic correction \\/ (not in italic buffer)',
    5: 'Remove extraneous italic correction(s)',
    6: 'Add italic correction (\\/)',
    11: 'Fix ellipsis',
    12: 'Add interword space (\\ )',
    13: 'Add intersentence space (\\@)',
    18: "Replace with ` or '",
    32: 'Replace with `',
    33: "Replace with '",
    24: 'Remove extraneous space',
    28: 'Remove incorrect \\/',
    26: 'Remove extraneous space',
    34: "Replace with ` or '",
    35: 'Use suggested alternative',
    39: 'Remove extraneous space',
    42: 'Remove extraneous space',
    45: 'Use \\[ ... \\] instead of $$ ... $$',
    46: 'Use \\( ... \\) instead of $ ... $'
}

function characterBeforeRange(document: vs.TextDocument, range: vs.Range) {
    return document.getText(range.with(range.start.translate(0, -1)))[0]
}

function isOpeningQuote(document: vs.TextDocument, range: vs.Range) {
    return range.start.character === 0 || characterBeforeRange(document, range) === ' '
}


export class CodeActions {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    // Leading underscore to avoid tslint complaint
    provideCodeActions(document: vs.TextDocument, _range: vs.Range, context: vs.CodeActionContext, _token: vs.CancellationToken): vs.Command[] {
        const actions: vs.Command[] = []
        context.diagnostics.filter(d => d.source === 'ChkTeX').forEach(d => {
            let code = typeof d.code === 'object' ? d.code.value : d.code
            if (!code) {
                return
            }
            if (typeof code === 'string') {
                code = parseInt(code)
            }
            const label = CODE_TO_ACTION_STRING[code]
            if (label !== undefined) {
                actions.push({
                    title: label,
                    command: 'latex-workshop.code-action',
                    arguments: [document, d.range, d.code, d.message]
                })
            }
        })

        return actions
    }

    runCodeAction(document: vs.TextDocument, range: vs.Range, code: number, message: string) {
        let fixString: string | undefined
        let regexResult: RegExpExecArray | null
        switch (code) {
            case 24:
            case 26:
            case 39:
            case 42:
                // In all these cases remove all proceeding whitespace.
                this.replaceWhitespaceOnLineBefore(document, range.end, '')
                break
            case 4:
            case 5:
            case 28:
                // In all these cases just clear what ChkTeX highlighted.
                this.replaceRangeWithString(document, range, '')
                break
            case 1:
                this.replaceWhitespaceOnLineBefore(document, range.end.translate(0, -1), '{}')
                break
            case 2:
                this.replaceWhitespaceOnLineBefore(document, range.end, '~')
                break
            case 6:
                this.replaceWhitespaceOnLineBefore(document, range.end.translate(0, -1), '\\/')
                break
            case 11:
                // add a space after so we don't accidentally join with the following word.
                regexResult = /\\[cl]?dots/.exec(message)
                if (!regexResult) {
                    break
                }
                fixString = regexResult[0] + ' '
                this.replaceRangeWithString(document, range, fixString)
                break
            case 12:
                this.replaceRangeWithString(document, range, '\\ ')
                break
            case 13:
                this.replaceWhitespaceOnLineBefore(document, range.end.translate(0, -1), '\\@')
                break
            case 18:
                if (isOpeningQuote(document, range)) {
                    this.replaceRangeWithRepeatedString(document, range, '``')
                } else {
                    this.replaceRangeWithRepeatedString(document, range, "''")
                }
                break
            case 32:
                this.replaceRangeWithRepeatedString(document, range, '`')
                break
            case 33:
                this.replaceRangeWithRepeatedString(document, range, "'")
                break
            case 34:
                if (isOpeningQuote(document, range)) {
                    this.replaceRangeWithRepeatedString(document, range, '`')
                } else {
                    this.replaceRangeWithRepeatedString(document, range, "'")
                }
                break
            case 35:
                regexResult = /`(.+)'/.exec(message)
                if (!regexResult) {
                    break
                }
                fixString = regexResult[1]
                this.replaceRangeWithString(document, range, fixString)
                break
            case 45:
                this.replaceMathDelimitersInRange(document, range, '$$', '\\[', '\\]')
                break
            case 46:
                this.replaceMathDelimitersInRange(document, range, '$', '\\(', '\\)')
                break
            default:
                break
        }
    }

    private replaceWhitespaceOnLineBefore(document: vs.TextDocument, position: vs.Position, replaceWith: string) {
        const beforePosRange = new vs.Range(new vs.Position(position.line, 0), position)
        const text = document.getText(beforePosRange)
        const regexResult = /\s*$/.exec(text)
        if (!regexResult) {
            return vs.workspace.applyEdit(new vs.WorkspaceEdit())
        }
        const charactersToRemove = regexResult[0].length
        const wsRange = new vs.Range(new vs.Position(position.line, position.character - charactersToRemove), position)
        const edit = new vs.WorkspaceEdit()
        edit.replace(document.uri, wsRange, replaceWith)
        return vs.workspace.applyEdit(edit)
    }

    private replaceRangeWithString(document: vs.TextDocument, range: vs.Range, replacementString: string) {
        const edit = new vs.WorkspaceEdit()
        edit.replace(document.uri, range, replacementString)
        return vs.workspace.applyEdit(edit)
    }

    private replaceRangeWithRepeatedString(document: vs.TextDocument, range: vs.Range, replacementString: string) {
        return this.replaceRangeWithString(document, range, replacementString.repeat(range.end.character - range.start.character))
    }

    private replaceMathDelimitersInRange(document: vs.TextDocument, range: vs.Range, oldDelim: string, startDelim: string, endDelim: string) {
        const oldDelimLength = oldDelim.length
        let endRange = range.with(range.end.translate(0, - oldDelimLength), range.end)
        const text = document.getText(endRange)
        // Check if the end position really contains the end delimiter.
        // This is not the case when the opening and closing delimiters are on different lines
        const regex = new RegExp('^' + oldDelim.replace(/\$/g, '\\$') + '$')
        const regexResult = regex.exec(text)
        if (!regexResult) {
            if (oldDelim === '$$') {
                const pat = new RegExp(oldDelim.replace(/\$/g, '\\$') + '(?!\\$)')
                const endPos = this.extension.mathPreview.texMathEnvFinder.findEndPair(document, pat, endRange.start)
                if (!endPos) {
                    return
                }
                endRange = new vs.Range(endPos.translate(0, - oldDelimLength), endPos)
            } else {
                return
            }
        }
        const edit = new vs.WorkspaceEdit()
        edit.replace(document.uri, endRange, endDelim)
        const startRange = range.with(range.start, range.start.translate(0, oldDelimLength))
        edit.replace(document.uri, startRange, startDelim)
        return vs.workspace.applyEdit(edit)
    }

}
