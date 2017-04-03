import * as vs from 'vscode'

import { Extension } from './main'

const codesToStaticActionStrings = {
    1: "Terminate command with empty statement",
    2: "Convert to non-breaking space (~)",
    4: "Remove italic correction \\/ (not in italic buffer)",
    5: "Remove extraneous italic correction(s)",
    6: "Add italic correction (\\/)",
    11: "Fix ellipsis",
    12: "Add interword space (\\ )",
    13: "Add intersentence space (\\@)",
    18: "Replace with ` or '",
    32: "Replace with `",
    33: "Replace with '",
    24: "Remove extraneous space",
    28: "Remove incorrect \\/",
    26: "Remove extraneous space",
    34: "Replace with ` or '",
    35: "Use suggested alternative",
    39: "Remove extraneous space",
    42: "Remove extraneous space"
}

function replaceWhitespaceOnLineBefore(document: vs.TextDocument, position: vs.Position, replaceWith: string): any {
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

function replaceRangeWithString(document: vs.TextDocument, range: vs.Range, replacementString: string): any {
    const edit = new vs.WorkspaceEdit()
    edit.replace(document.uri, range, replacementString)
    return vs.workspace.applyEdit(edit)
}

function replaceRangeWithRepeatedString(document: vs.TextDocument, range: vs.Range, replacementString: string): any {
    return replaceRangeWithString(document, range, replacementString.repeat(range.end.character - range.start.character))
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
            const label = codesToStaticActionStrings[d.code]
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

    runCodeAction(document: vs.TextDocument, range: vs.Range, code: number, message: string): any {
        let fixString
        let regexResult
        switch (code) {
            case 24:
            case 26:
            case 39:
            case 42:
                // In all these cases remove all proceeding whitespace.
                replaceWhitespaceOnLineBefore(document, range.end, '')
                break
            case 4:
            case 5:
            case 28:
                // In all these cases just clear what ChxTeX highlighted.
                replaceRangeWithString(document, range, "")
                break
            case 1:
                replaceWhitespaceOnLineBefore(document, range.end.translate(0, -1), '{}')
                break
            case 2:
                replaceWhitespaceOnLineBefore(document, range.end, '~')
                break
            case 6:
                replaceWhitespaceOnLineBefore(document, range.end.translate(0, -1), '\\/')
                break
            case 11:
                // add a space after so we don't accidentally join with the following word.
                regexResult = /\\[cl]?dots/.exec(message)
                if (!regexResult) {
                    break
                }
                fixString = regexResult[0] + " "
                replaceRangeWithString(document, range, fixString)
                break
            case 12:
                replaceRangeWithString(document, range, '\\ ')
                break
            case 13:
                replaceWhitespaceOnLineBefore(document, range.end.translate(0, -1), '\\@')
                break
            case 18:
                if (isOpeningQuote(document, range)) {
                    replaceRangeWithRepeatedString(document, range, "``")
                } else {
                    replaceRangeWithRepeatedString(document, range, "''")
                }
                break
            case 32:
                replaceRangeWithRepeatedString(document, range, "`")
                break
            case 33:
                replaceRangeWithRepeatedString(document, range, "'")
                break
            case 34:
                if (isOpeningQuote(document, range)) {
                    replaceRangeWithRepeatedString(document, range, "`")
                } else {
                    replaceRangeWithRepeatedString(document, range, "'")
                }
                break
            case 35:
                regexResult = /`(.+)'/.exec(message)
                if (!regexResult) {
                    break
                }
                fixString = regexResult[1]
                replaceRangeWithString(document, range, fixString)
                break
            default:
                break
        }
    }
}
