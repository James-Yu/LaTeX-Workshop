/**
 * This file contains functions related to text manipulations
 */

import * as vscode from 'vscode'
import { getLongestBalancedString } from '../providers/structure'

/**
 * Toggle a keyword, if the cursor is inside a keyword,
 * the keyword will be removed, otherwise a snippet will be added.
 * @param keyword the keyword to toggle without backslash eg. textbf or underline
 * @param outerBraces whether or not the tag should be wrapped with outer braces eg. {\color ...} or \textbf{...}
 */
export function toggleSelectedKeyword(keyword: string, outerBraces?: boolean) : undefined | 'added' | 'removed' {

  const editor = vscode.window.activeTextEditor

  if (editor === undefined) {
    return
  }

  const { selection, document } = editor
  const selectionText = document.getText(selection)

  const line = document.lineAt(selection.anchor)

  const pattern = new RegExp(`\\\\${keyword}{`, 'g')

  let match = pattern.exec(line.text)

  while (match !== null) {

    const matchStart = line.range.start.translate(0, match.index)
    const matchEnd = matchStart.translate(0, match[0].length)
    const searchString = document.getText(new vscode.Range(matchEnd, line.range.end))

    const insideText = getLongestBalancedString(searchString)
    const matchRange = new vscode.Range(matchStart, matchEnd.translate(0, insideText.length + 1))


    if (matchRange.contains(selection)) {
      // Remove keyword
      editor.edit(((editBuilder) => {
        editBuilder.replace(matchRange, insideText)
      }))
      return 'removed'
    }

    match = pattern.exec(line.text)
  }

  // Add keyword
  if (selectionText.length > 0) {

    editor.edit(((editBuilder) => {
      if (outerBraces === true) {
        editBuilder.replace(selection, `{\\${keyword} ${selectionText}}`)
      } else {
        editBuilder.replace(selection, `\\${keyword}{${selectionText}}`)
      }
    }))

  } else {

    let snippet: vscode.SnippetString

    if (outerBraces === true) {
      snippet = new vscode.SnippetString(`{\\${keyword} $1}`)
    } else {
      snippet = new vscode.SnippetString(`\\${keyword}{$1}`)
    }

    editor.insertSnippet(snippet, selection.start)

  }

  return 'added'
}
