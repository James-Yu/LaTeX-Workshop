import * as vscode from 'vscode'
import * as utils from './utils'

/**
 * If a string on `position` is like `\macro`, `\macro{` or `\macro[`,
 * return `\macro`.
 *
 * @param document The document to be scanned.
 * @param position The position to be scanned at.
 */
function macroTokenizer(document: vscode.TextDocument, position: vscode.Position): string | undefined {
    let startRegex: RegExp
    if (document.languageId === 'latex-expl3') {
        startRegex = /\\(?=[^\\{},[\]]*$)/
    } else {
        startRegex = /\\(?=[a-zA-Z]*$)/
    }
    const startResult = document.getText(new vscode.Range(new vscode.Position(position.line, 0), position)).match(startRegex)
    if (startResult === null || startResult.index === undefined || startResult.index < 0) {
        return
    }
    const firstBracket = document.getText(new vscode.Range(position, new vscode.Position(position.line, 65535))).match(/[[{]/)
    if (firstBracket && firstBracket.index !== undefined && firstBracket.index > 0) {
        return document.getText(new vscode.Range(
                new vscode.Position(position.line, startResult.index),
                new vscode.Position(position.line, position.character + firstBracket.index)
            )).trim()
    }
    const wordRange = document.getWordRangeAtPosition(position)
    if (wordRange) {
        return document.getText(wordRange.with(new vscode.Position(position.line, startResult.index))).trim()
    }
    return
}

/**
 * If a string on `position` surround by `{...}` or `[...]`,
 * return the string inside brackets.
 *
 * @param document The document to be scanned.
 * @param position The position to be scanned at.
 */
function argTokenizer(document: vscode.TextDocument, position: vscode.Position): string | undefined {
    const startResult = document.getText(new vscode.Range(new vscode.Position(position.line, 0), position)).match(/[{,[](?=[^{},[\]]*$)/)
    if (startResult === null || startResult.index === undefined || startResult.index < 0) {
        return
    }
    const endResult = document.getText(new vscode.Range(position, new vscode.Position(position.line, 65535))).match(/[}\],]/)
    if (endResult === null || endResult.index === undefined || endResult.index < 0) {
        return
    }
    return document.getText(new vscode.Range(
        new vscode.Position(position.line, startResult.index + 1),
        new vscode.Position(position.line, position.character + endResult.index)
    )).trim()
}


/**
 * If a string on `position` is like `\macro{` or `\macro[`, then
 * returns the `\macro`. If it is like `{...}` or `[...]`, then
 * returns the string inside brackets.
 *
 * @param document The document to be scanned.
 * @param position The position to be scanned at.
 */
export function tokenizer(document: vscode.TextDocument, position: vscode.Position): string | undefined {
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
    const escapedToken = utils.escapeRegExp(token)
    const regex = new RegExp(`\\\\usepackage(?:\\[[^\\[\\]\\{\\}]*\\])?\\{[\\w,]*${escapedToken}[\\w,]*\\}`)
    if (line.match(regex)) {
        return true
    }
    return false
}
