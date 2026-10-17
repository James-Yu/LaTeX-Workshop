import * as vscode from 'vscode'
import * as utils from './utils'

/**
 * If the string at `position` is a latex command, e.g., `\macro`, `\macro{` or `\macro[`,
 * return the range of the command string (`\macro`).
 *
 * @param document The document to be scanned.
 * @param position The position to be scanned at.
 */
function macroTokenizer(document: vscode.TextDocument, position: vscode.Position): vscode.Range | undefined {
    // A control sequence is a control word or a single non-whitespace symbol.
    const pattern = document.languageId === 'latex-expl3'
        ? /\\(?:[a-zA-Z_@:]+|[^\sa-zA-Z_@:])/
        : /\\(?:[a-zA-Z]+|[^\sa-zA-Z])/
    return document.getWordRangeAtPosition(position, pattern)
}

/**
 * If the string at `position` is surround by `{...}` or `[...]`,
 * return the range for the argument at `position` inside the brackets.
 *
 * @param document The document to be scanned.
 * @param position The position to be scanned at.
 */
function argTokenizer(document: vscode.TextDocument, position: vscode.Position): vscode.Range | undefined {
    const startResult = document.getText(new vscode.Range(new vscode.Position(position.line, 0), position)).match(/[{,[\s](?=[^{},[\]\s]*$)/)
    if (startResult === null || startResult.index === undefined || startResult.index < 0) {
        return
    }
    const endResult = document.getText(new vscode.Range(position, new vscode.Position(position.line, 65535))).match(/[}\],\s$]|$/)
    if (endResult === null || endResult.index === undefined || endResult.index < 0) {
        return
    }
    return new vscode.Range(
        new vscode.Position(position.line, startResult.index + 1),
        new vscode.Position(position.line, position.character + endResult.index)
    )
}


/**
 * If the string at `position` is like `\macro{` or `\macro[`, then
 * returns the range for `\macro`. If it is like `{...}` or `[...]`, then
 * returns the range the argument inside brackets.
 *
 * @param document The document to be scanned.
 * @param position The position to be scanned at.
 */
export function tokenizer(document: vscode.TextDocument, position: vscode.Position): vscode.Range | undefined {
    // \macro case
    const macroToken = macroTokenizer(document, position)
    if (macroToken) {
        return macroToken
    }

    // Inside {...} or [...]
    const argToken = argTokenizer(document, position)
    if (argToken) {
        return argToken
    }
    return
}

/**
 * Return `true` if the `position` of the `document` is on a macro `\usepackage{...}` including
 * `token`
 * @param document The document to be scanned.
 * @param position The position to be scanned at.
 * @param token The name of package.
 */
export function onAPackage(document: vscode.TextDocument, position: vscode.Position, token: string): boolean {
    const line = document.lineAt(position.line).text
    // First, test if the cursor is on a list of words.
    if (!token.match(/^[\w,\s]*$/)) {
        return false
    }
    const escapedToken = utils.escapeRegExp(token)
    const regex = new RegExp(`\\\\(?:usepackage|RequirePackage)(?:\\[[^\\[\\]\\{\\}]*\\])?\\{[\\w,\\s]*${escapedToken}[\\w,\\s]*\\}`)
    if (line.match(regex)) {
        return true
    }
    return false
}
