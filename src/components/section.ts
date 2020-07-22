import * as vscode from 'vscode'
import { Extension } from '../main'

export class Section {
    private readonly extension: Extension
    private readonly levels: string[] = ['part', 'chapter', 'section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph']
    private readonly upperLevels: {[key: string]: string} = {}
    private readonly lowerLevels: {[key: string]: string} = {}

    constructor(extension: Extension) {
        this.extension = extension
        for (let i = 0; i < this.levels.length; i++) {
            const current = this.levels[i]
            const upper = this.levels[Math.max(i - 1, 0)]
            const lower = this.levels[Math.min(i + 1, this.levels.length - 1)]
            this.upperLevels[current] = upper
            this.lowerLevels[current] = lower
        }
    }


    /**
     * Shift the level sectioning in the selection by one (up or down)
     * @param change 'promote' or 'demote'
     */
    shiftSectioningLevel(change: 'promote' | 'demote') {
        this.extension.logger.addLogMessage(`Calling shiftSectioningLevel with parameter: ${change}`)
        if (change !== 'promote' && change !== 'demote') {
            throw TypeError(
            `Invalid value of function parameter 'change' (=${change})`
            )
        }

        const editor = vscode.window.activeTextEditor
        if (editor === undefined) {
            return
        }

        const replacer = (
            _match: string,
            sectionName: string,
            asterisk: string | undefined,
            options: string | undefined,
            contents: string
        ) => {
            if (change === 'promote') {
                return '\\' + this.upperLevels[sectionName] + (asterisk ?? '') + (options ?? '') + contents
            } else {
                // if (change === 'demote')
                return '\\' + this.lowerLevels[sectionName] + (asterisk ?? '') + (options ?? '') + contents
            }
        }

        // when supported, negative lookbehind at start would be nice --- (?<!\\)
        const pattern = '\\\\(' + this.levels.join('|') + ')(\\*)?(\\[.+?\\])?(\\{.*?\\})'
        const regex = new RegExp(pattern, 'g')

        function getLastLineLength(someText: string) {
            const lines = someText.split(/\n/)
            return lines.slice(lines.length - 1, lines.length)[0].length
        }

        const document = editor.document
        const selections = editor.selections
        const newSelections: vscode.Selection[] = []

        const edit = new vscode.WorkspaceEdit()

        for (let selection of selections) {
            let mode: 'selection' | 'cursor' = 'selection'
            let oldSelection: vscode.Selection | null = null
            if (selection.isEmpty) {
                mode = 'cursor'
                oldSelection = selection
                const line = document.lineAt(selection.anchor)
                selection = new vscode.Selection(line.range.start, line.range.end)
            }

            const selectionText = document.getText(selection)
            const newText = selectionText.replace(regex, replacer)
            edit.replace(document.uri, selection, newText)

            const changeInEndCharacterPosition = getLastLineLength(newText) - getLastLineLength(selectionText)
            if (mode === 'selection') {
                newSelections.push(
                    new vscode.Selection(selection.start,
                        new vscode.Position(selection.end.line,
                            selection.end.character + changeInEndCharacterPosition
                        )
                    )
                )
            } else if (oldSelection) { // mode === 'cursor'
                const anchorPosition = oldSelection.anchor.character + changeInEndCharacterPosition
                const activePosition = oldSelection.active.character + changeInEndCharacterPosition
                newSelections.push(
                    new vscode.Selection(
                        new vscode.Position(oldSelection.anchor.line, anchorPosition < 0 ? 0 : anchorPosition),
                        new vscode.Position(oldSelection.active.line, activePosition < 0 ? 0 : activePosition)
                    )
                )
            }
        }

        vscode.workspace.applyEdit(edit).then(success => {
            if (success) {
                editor.selections = newSelections
            }
        })
    }

}
