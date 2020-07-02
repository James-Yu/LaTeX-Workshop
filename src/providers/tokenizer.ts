import * as vscode from 'vscode'
import * as utils from '../utils/utils'

/**
 * If a string on `position` is like `\command{` or `\command[`, then
 * returns the `\command`. If it is like `{...}` or `[...]`, then
 * returns the string inside brackets.
 *
 * @param document The document to be scanned.
 * @param position The position to be scanned at.
 */
export function tokenizer(document: vscode.TextDocument, position: vscode.Position): string | undefined {
    const startResult = document.getText(new vscode.Range(new vscode.Position(position.line, 0), position)).match(/[\\{,](?=[^\\{,]*$)/)
    const endResult = document.getText(new vscode.Range(position, new vscode.Position(position.line, 65535))).match(/[{}[\],]/)
    if (startResult === null || endResult === null ||
        startResult.index === undefined || endResult.index === undefined ||
        startResult.index < 0 || endResult.index < 0) {
        return undefined
    }
    const startIndex = startResult[0] === '\\' ? startResult.index : startResult.index + 1
    return document.getText(new vscode.Range(
        new vscode.Position(position.line, startIndex),
        new vscode.Position(position.line, position.character + endResult.index)
    )).trim()
}

/**
 * Returns `true` if the `posion` of the `document` is on a command `\usepackage{...}` including
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
