import * as vscode from 'vscode'
import { lw } from '../lw'

export {
    provider,
    action
}

/**
 * Each number corresponds to the warning number of ChkTeX.
 */
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

function characterBeforeRange(document: vscode.TextDocument, range: vscode.Range) {
    return document.getText(range.with(range.start.translate(0, -1)))[0]
}

function isOpeningQuote(document: vscode.TextDocument, range: vscode.Range) {
    return range.start.character === 0 || characterBeforeRange(document, range) === ' '
}

class CodeActionProvider implements vscode.CodeActionProvider {
    // Leading underscore to avoid tslint complaint
    provideCodeActions(document: vscode.TextDocument, _range: vscode.Range, context: vscode.CodeActionContext, _token: vscode.CancellationToken): vscode.Command[] {
        const actions: vscode.Command[] = []
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
}

const provider = new CodeActionProvider()

function action(document: vscode.TextDocument, range: vscode.Range, code: number, message: string) {
    let fixString: string | undefined
    let regexResult: RegExpExecArray | null
    switch (code) {
        case 24:
        case 26:
        case 39:
        case 42:
            // In all these cases remove all proceeding whitespace.
            void replaceWhitespaceOnLineBefore(document, range.end, '')
            break
        case 4:
        case 5:
        case 28:
            // In all these cases just clear what ChkTeX highlighted.
            void replaceRangeWithString(document, range, '')
            break
        case 1:
            void replaceWhitespaceOnLineBefore(document, range.end.translate(0, -1), '{}')
            break
        case 2:
            void replaceWhitespaceOnLineBefore(document, range.end, '~')
            break
        case 6:
            void replaceWhitespaceOnLineBefore(document, range.end.translate(0, -1), '\\/')
            break
        case 11:
            // add a space after so we don't accidentally join with the following word.
            regexResult = /\\[cl]?dots/.exec(message)
            if (!regexResult) {
                break
            }
            fixString = regexResult[0] + ' '
            void replaceRangeWithString(document, range, fixString)
            break
        case 12:
            void replaceRangeWithString(document, range, '\\ ')
            break
        case 13:
            void replaceWhitespaceOnLineBefore(document, range.end.translate(0, -1), '\\@')
            break
        case 18:
            if (isOpeningQuote(document, range)) {
                void replaceRangeWithRepeatedString(document, range, '``')
            } else {
                void replaceRangeWithRepeatedString(document, range, "''")
            }
            break
        case 32:
            void replaceRangeWithRepeatedString(document, range, '`')
            break
        case 33:
            void replaceRangeWithRepeatedString(document, range, "'")
            break
        case 34:
            if (isOpeningQuote(document, range)) {
                void replaceRangeWithRepeatedString(document, range, '`')
            } else {
                void replaceRangeWithRepeatedString(document, range, "'")
            }
            break
        case 35:
            regexResult = /`(.+)'/.exec(message)
            if (!regexResult) {
                break
            }
            fixString = regexResult[1]
            void replaceRangeWithString(document, range, fixString)
            break
        case 45:
            void replaceMathDelimitersInRange(document, range, '$$', '\\[', '\\]')
            break
        case 46:
            void replaceMathDelimitersInRange(document, range, '$', '\\(', '\\)')
            break
        default:
            break
    }
}

function replaceWhitespaceOnLineBefore(document: vscode.TextDocument, position: vscode.Position, replaceWith: string) {
    const beforePosRange = new vscode.Range(new vscode.Position(position.line, 0), position)
    const text = document.getText(beforePosRange)
    const regexResult = /\s*$/.exec(text)
    if (!regexResult) {
        return vscode.workspace.applyEdit(new vscode.WorkspaceEdit())
    }
    const charactersToRemove = regexResult[0].length
    const wsRange = new vscode.Range(new vscode.Position(position.line, position.character - charactersToRemove), position)
    const edit = new vscode.WorkspaceEdit()
    edit.replace(document.uri, wsRange, replaceWith)
    return vscode.workspace.applyEdit(edit)
}

function replaceRangeWithString(document: vscode.TextDocument, range: vscode.Range, replacementString: string) {
    const edit = new vscode.WorkspaceEdit()
    edit.replace(document.uri, range, replacementString)
    return vscode.workspace.applyEdit(edit)
}

function replaceRangeWithRepeatedString(document: vscode.TextDocument, range: vscode.Range, replacementString: string) {
    return replaceRangeWithString(document, range, replacementString.repeat(range.end.character - range.start.character))
}

function replaceMathDelimitersInRange(document: vscode.TextDocument, range: vscode.Range, oldDelim: '$' | '$$', startDelim: string, endDelim: string) {
    const oldDelimLength = oldDelim.length
    let endRange = range.with(range.end.translate(0, - oldDelimLength), range.end)
    const text = document.getText(endRange)
    // Check if the end position really contains the end delimiter.
    // This is not the case when the opening and closing delimiters are on different lines
    if (text !== oldDelim) {
        if (oldDelim === '$$') {
            const pat = /(?<!\\)\$\$/
            const endPos = lw.parser.find.endPair(document, pat, endRange.start)
            if (!endPos) {
                return
            }
            endRange = new vscode.Range(endPos.translate(0, - oldDelimLength), endPos)
        } else {
            return
        }
    }
    const edit = new vscode.WorkspaceEdit()
    edit.replace(document.uri, endRange, endDelim)
    const startRange = range.with(range.start, range.start.translate(0, oldDelimLength))
    edit.replace(document.uri, startRange, startDelim)
    return vscode.workspace.applyEdit(edit)
}
