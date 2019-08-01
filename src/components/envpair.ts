import * as vscode from 'vscode'
import * as utils from '../utils'
import { Extension } from '../main'


function regexpAllMatches(str: string, reg: RegExp) {
    const res: RegExpExecArray[] = []
    let m = reg.exec(str)
    while (m) {
        res.push(m)
        m = reg.exec(str)
    }
    return res
}

interface MatchEnv {
    name: string,
    type: string, // 'begin' or 'end'
    pos: vscode.Position
}

export class EnvPair {
    extension: Extension
    beginLength = '\\begin'.length
    endLength = '\\end'.length

    constructor(extension: Extension) {
        this.extension = extension
    }

    getEnvName(line: string, ind: number, beginOrEnd: string): string | null {
        const subline = line.slice(ind)
        const re = new RegExp('^' + beginOrEnd + '\\{([^\\{\\}]*)\\}')
        const env = subline.match(re)
        if (env && env.length === 2) {
            return env[1]
        }
        return null
    }

    tokenizeLine(document: vscode.TextDocument, pos: vscode.Position): MatchEnv | null {
        const line = utils.stripComments(document.lineAt(pos).text, '%')
        const ind = pos.character
        if (ind > line.length) {
            return null
        }
        const lineUpToInd = line.slice(0, ind + 1)
        const startInd = lineUpToInd.lastIndexOf('\\')
        const startPos = new vscode.Position(pos.line, startInd)
        if (startInd + this.beginLength >= ind && line.slice(startInd, startInd + this.beginLength) === '\\begin') {
            const envName = this.getEnvName(line, startInd, '\\\\begin')
            if (envName) {
                return {pos: startPos, type: 'begin', name: envName}
            }
        } else if (startInd + this.endLength >= ind && line.slice(startInd, startInd + this.endLength) === '\\end') {
            const envName = this.getEnvName(line, startInd, '\\\\end')
            if (envName) {
                return {pos: startPos, type: 'end', name: envName}
            }
        }
        return null
    }

    /**
     * Searches upwards or downwards for a begin or end environment captured by `pattern`.
     * Begin environment can also be `\[` and end environment can also be `\]`
     *
     * @param pattern A regex that matches begin or end environments.
     *
     * Note: the regex must capture (`begin` or `[`) or (`end` or `]`) in the first
     * capturing group. If nesting is possible, the pattern must capture *both* `begin` and `end`.
     * If `dir` is -1, regex must capture `begin` and/or `[` and likewise if `dir` is +1.
     * @param dir +1 to search downwards, -1 to search upwards
     * @param pos starting position (e.g. cursor position)
     * @param doc the document in which the search is performed
     * @param splitSubstring where to split the string if dir = 1 (default at end of `\begin{...}`)
     */
    locateMatchingPair(pattern: string, dir: number, pos: vscode.Position, doc: vscode.TextDocument, splitSubstring?: string): MatchEnv | null {
        const patRegexp = new RegExp(pattern, 'g')
        let lineNumber = pos.line
        let nested = 0
        let line = doc.lineAt(lineNumber).text
        let startCol
        /* Drop the pattern on the current line */
        switch (dir) {
            case 1:
                if (!splitSubstring) {
                    startCol = line.indexOf('}', pos.character) + 1
                } else {
                    startCol = line.indexOf(splitSubstring, pos.character) + 1
                }
                line = line.slice(startCol)
                break
            case -1:
                startCol = 0
                line = line.slice(startCol, pos.character)
                break
            default:
                this.extension.logger.addLogMessage('Direction error in locateMatchingPair')
                return null
        }
        while (true) {
            line = utils.stripComments(line, '%')
            let allMatches = regexpAllMatches(line, patRegexp)
            if (dir === -1) {
                allMatches = allMatches.reverse()
            }
            for (const m of allMatches) {
                if ((dir === 1 && (m[1] === 'begin' || m[1] === '[')) || (dir === -1 && (m[1] === 'end' || m[1] === ']'))) {
                    nested += 1
                }
                if ((dir === 1 && (m[1] === 'end' || m[1] === ']')) || (dir === -1 && (m[1] === 'begin' || m[1] === '['))) {
                    if (nested === 0) {
                        const col = m.index + 1 + startCol
                        const matchPos = new vscode.Position(lineNumber, col)
                        const matchName = m[2]
                        const matchType = m[1]
                        return {name: matchName, type: matchType, pos: matchPos}
                    }
                    nested -= 1
                }
            }
            lineNumber += dir
            if (lineNumber < 0 || lineNumber >= doc.lineCount) {
                break
            }
            line = doc.lineAt(lineNumber).text
            startCol = 0
        }
        return null
    }

    /**
     * While on a 'begin' or 'end' keyword, moves the cursor to the corresponding 'end/begin'
     */
    gotoPair() {
        const editor = vscode.window.activeTextEditor
        if (!editor || editor.document.languageId !== 'latex') {
            return
        }
        const curPos = editor.selection.active
        const document = editor.document

        const tokens = this.tokenizeLine(document, curPos)
        if (!tokens) {
            return
        }
        const startPos = tokens.pos
        const pattern = '\\\\(begin|end)\\{' + utils.escapeRegExp(tokens.name) + '\\}'
        const dir = (tokens.type === 'begin') ? 1 : -1
        const resMatchingPair = this.locateMatchingPair(pattern, dir, startPos, document)
        if (resMatchingPair) {
            const newPos = resMatchingPair.pos
            editor.selection = new vscode.Selection(newPos, newPos)
            editor.revealRange(new vscode.Range(newPos, newPos))
        }
    }

    /**
     * Select or add a multicursor to an environment name if called with
     * `action = 'selection'` or `action = 'cursor'` respectively.
     *
     * Toggles between `\[...\]` and `\begin{$text}...\end{$text}`
     * where `$text` is `''` if `action = cursor` and `'equation*'` otherwise
     *
     * Only toggles if `action = equationToggle` (i.e. does not move selection)
     *
     * @param action  can be
     *      - 'selection': the environment name is selected both in the begin and end part
     *      - 'cursor': a multicursor is added at the beginning of the environment name is selected both in the begin and end part
     *      - 'equationToggle': toggles between `\[...\]` and `\begin{}...\end{}`
     */
    envAction(action: 'selection'|'cursor'|'equationToggle') {
        const editor = vscode.window.activeTextEditor
        if (!editor || editor.document.languageId !== 'latex') {
            return
        }
        let startingPos = editor.selection.active
        const document = editor.document

        let searchEnvs = '[^\\{\\}]*'

        if (action === 'equationToggle') {
            searchEnvs = '(?:equation|align|flalign|alignat|gather|multline|eqnarray)\\*?'
        }

        const pattern = `(?<!\\\\)\\\\(\\[|\\]|(?:begin|end)(?=\\{(${searchEnvs})\\}))`
        const dirUp = -1
        const beginEnv = this.locateMatchingPair(pattern, dirUp, startingPos, document)
        if (!beginEnv) {
            return
        }
        const dirDown = 1
        const endEnv = this.locateMatchingPair(pattern, dirDown, beginEnv.pos, document, beginEnv.type === '[' ? '[' : '}')
        if (!endEnv) {
            return
        }

        let envNameLength: number
        const beginEnvStartPos = beginEnv.pos.translate(0, 'begin{'.length)
        let endEnvStartPos = endEnv.pos.translate(0, 'end{'.length)
        const edit = new vscode.WorkspaceEdit()

        if (beginEnv.type === '[' && endEnv.type === ']') {
            const eqText = action === 'cursor' ? '' : 'equation*'
            const beginRange = new vscode.Range(beginEnv.pos, beginEnv.pos.translate(0, 1))
            const endRange = new vscode.Range(endEnv.pos, endEnv.pos.translate(0, 1))
            envNameLength = eqText.length
            edit.replace(document.uri, endRange, `end{${eqText}}`)
            edit.replace(document.uri, beginRange, `begin{${eqText}}`)

            const diff = 'begin{}'.length + envNameLength - '['.length
            if (startingPos.line === beginEnv.pos.line) {
                startingPos = startingPos.translate(0, diff)
            }
            if (beginEnv.pos.line === endEnv.pos.line) {
                endEnvStartPos = endEnvStartPos.translate(0, diff)
            }
        } else if (beginEnv.type === 'begin' && endEnv.type === 'end') {
            envNameLength = beginEnv.name.length
            if (endEnv.name.length !== envNameLength) {
                return // bad match
            }
            if (action === 'equationToggle') {
                const beginRange = new vscode.Range(beginEnv.pos, beginEnv.pos.translate(0, envNameLength + 'begin{}'.length))
                const endRange = new vscode.Range(endEnv.pos, endEnv.pos.translate(0, envNameLength + 'end{}'.length))
                edit.replace(document.uri, endRange, ']')
                edit.replace(document.uri, beginRange, '[')
                if (startingPos.line === beginEnv.pos.line) {
                    const diff = Math.max('['.length - 'begin{}'.length - envNameLength, -startingPos.character)
                    startingPos = startingPos.translate(0, diff)
                }
            }
        } else {
            return // bad match
        }

        vscode.workspace.applyEdit(edit).then(success => {
            if (success) {
                switch (action) {
                    case 'cursor':
                        editor.selections = [new vscode.Selection(beginEnvStartPos, beginEnvStartPos), new vscode.Selection(endEnvStartPos, endEnvStartPos)]
                        break
                    case 'selection': {
                        const beginEnvStopPos = beginEnvStartPos.translate(0, envNameLength)
                        const endEnvStopPos = endEnvStartPos.translate(0, envNameLength)
                        editor.selections = [new vscode.Selection(beginEnvStartPos, beginEnvStopPos), new vscode.Selection(endEnvStartPos, endEnvStopPos)]
                        break
                    }
                    case 'equationToggle':
                        editor.selection = new vscode.Selection(startingPos, startingPos)
                        break
                    default:
                        this.extension.logger.addLogMessage('Error - while selecting environment name')
                }
            }
        })

        // editor.revealRange(new vscode.Range(beginEnvStartPos, endEnvStartPos))
    }

    closeEnv() {
        const editor = vscode.window.activeTextEditor
        if (!editor || editor.document.languageId !== 'latex') {
            return
        }
        const document = editor.document
        const curPos = editor.selection.active

        const pattern = '\\\\(begin|end){([^{}]*)}'
        const dir = -1
        const resMatchingPair = this.locateMatchingPair(pattern, dir, curPos, document)
        if (resMatchingPair) {
            const endEnv = '\\end{' + resMatchingPair.name + '}'
            return editor.edit(editBuilder => { editBuilder.insert(curPos, endEnv) })
        }
        return
    }

}
