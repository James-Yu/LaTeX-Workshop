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
    const line = document.lineAt(position.line).text
    const prefix = line.slice(0, position.character)
    // Prefer an explicit argument boundary so spaces inside labels and filenames are preserved.
    const argumentStart = prefix.match(/[{,[](?=[^{},[\]]*$)/)
    // A continuation line may have only indentation before a citation key.
    const startResult = argumentStart ?? prefix.match(/\s(?=[^{},[\]\s]*$)/)
    if (startResult === null || startResult.index === undefined || startResult.index < 0) {
        return
    }
    const endResult = line.slice(position.character).match(argumentStart ? /[}\],$]|$/ : /[}\],\s$]|$/)
    if (endResult === null || endResult.index === undefined || endResult.index < 0) {
        return
    }
    const argument = line.slice(startResult.index + 1, position.character + endResult.index)
    const start = startResult.index + 1 + argument.length - argument.trimStart().length
    return new vscode.Range(position.line, start, position.line, start + argument.trim().length)
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
