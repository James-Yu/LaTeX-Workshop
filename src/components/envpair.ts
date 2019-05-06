import * as vscode from 'vscode'
import * as utils from '../utils'
import { Extension } from '../main'


function regexpAllMatches(str: string, reg: RegExp) {
    const res: any[] = []
    let m = reg.exec(str)
    while (m) {
        res.push(m)
        m = reg.exec(str)
    }
    return res
}

interface MatchEnv {
    name: string
    type: string // 'begin' or 'end'
    pos: vscode.Position
}

export class EnvPair {
    extension: Extension
    beginLength = '\\begin'.length
    endLength = '\\end'.length

    constructor(extension: Extension) {
        this.extension = extension
    }

    getEnvName(line: string, ind: number, beginOrEnd: string) : string | null {
        const subline = line.slice(ind)
        const re = new RegExp('^' +  beginOrEnd + '\\{([^\\{\\}]*)\\}')
        const env = subline.match(re)
        if (env && env.length === 2) {
            return env[1]
        }
        return null
    }

    tokenizeLine(document: vscode.TextDocument, pos: vscode.Position) : MatchEnv | null {
        const line = utils.stripComments(document.lineAt(pos).text, '%')
        const ind = pos.character
        if (ind > line.length) {
            return null
        }
        const lineUpToInd = line.slice(0, ind + 1)
        const startInd = lineUpToInd.lastIndexOf('\\')
        const startPos = new vscode.Position(pos.line, startInd)
        if (startInd + this.beginLength  >= ind && line.slice(startInd, startInd + this.beginLength) === '\\begin') {
            const envName = this.getEnvName(line, startInd, '\\\\begin')
            if (envName) {
                return {pos: startPos, type: 'begin', name: envName}
            }
        } else if (startInd + this.endLength  >= ind && line.slice(startInd, startInd + this.endLength) === '\\end') {
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
     */
    locateMatchingPair(pattern: string, dir: number, pos: vscode.Position, doc: vscode.TextDocument) : MatchEnv | null {
        const patRegexp = new RegExp(pattern, 'g')
        let lineNumber = pos.line
        let nested = 0
        let line = doc.lineAt(lineNumber).text
        /* Drop the pattern on the current line */
        if (dir === 1) {
            line = line.slice(line.indexOf('}', pos.character) + 1)
        } else if (dir === -1) {
            line = line.slice(0, pos.character)
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
                if ((dir === 1 && (m[1] === 'end' || m[1] === ']')) || (dir === -1 && (m[1] === 'begin' || m[1] === '[')))  {
                    if (nested === 0) {
                        const matchPos = new vscode.Position(lineNumber, m.index + 1)
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
        const dir = (tokens.type ===  'begin') ? 1 : -1
        const resMatchingPair = this.locateMatchingPair(pattern, dir, startPos, document)
        if (resMatchingPair) {
            const newPos = resMatchingPair.pos
            editor.selection = new vscode.Selection(newPos, newPos)
            editor.revealRange(new vscode.Range(newPos, newPos))
        }
    }

    /**
     * Select or add a multicursor to an environment name
     *
     * @param selectionOrCursor  can be
     *      - 'selection': the environment name is selected both in the begin and end part
     *      - 'cursor': a multicursor is added at the beginning of the environment name is selected both in the begin and end part
     */
    selectEnvName(selectionOrCursor: 'selection'|'cursor') {
        const editor = vscode.window.activeTextEditor
        if (!editor || editor.document.languageId !== 'latex') {
            return
        }
        const curPos = editor.selection.active
        const document = editor.document

        const pattern = '\\\\(begin|end)\\{([^\\{\\}]*)\\}'
        const dirUp = -1
        const beginEnv = this.locateMatchingPair(pattern, dirUp, curPos, document)
        if (!beginEnv) {
            return
        }
        const dirDown = 1
        const endEnv = this.locateMatchingPair(pattern, dirDown, beginEnv.pos, document)
        if (!endEnv) {
            return
        }

        const beginEnvStartPos = beginEnv.pos.translate(0, 'begin{'.length)
        const endEnvStartPos = endEnv.pos.translate(0, 'end{'.length)
        switch (selectionOrCursor) {
            case 'cursor':
                editor.selections = [new vscode.Selection(beginEnvStartPos, beginEnvStartPos), new vscode.Selection(endEnvStartPos, endEnvStartPos)]
                break
            case 'selection':
                const envNameLength = beginEnv.name.length
                const beginEnvStopPos = beginEnvStartPos.translate(0, envNameLength)
                const endEnvStopPos = endEnvStartPos.translate(0, envNameLength)
                editor.selections = [new vscode.Selection(beginEnvStartPos, beginEnvStopPos), new vscode.Selection(endEnvStartPos, endEnvStopPos)]
                break
            default:
                this.extension.logger.addLogMessage(`Error - while selecting environment name`)
        }
        // editor.revealRange(new vscode.Range(beginEnvStartPos, endEnvStartPos))
    }

    closeEnv() {
        const editor = vscode.window.activeTextEditor
        if (!editor || editor.document.languageId !== 'latex') {
            return
        }
        const document = editor.document
        const curPos = editor.selection.active

        const pattern = '\\\\(begin|end)\\{([^\\{\\}]*)\\}'
        const dir = -1
        const resMatchingPair = this.locateMatchingPair(pattern, dir, curPos, document)
        if (resMatchingPair) {
            const endEnv = '\\end{' + resMatchingPair.name + '}'
            return editor.edit(editBuilder => { editBuilder.insert(curPos, endEnv) })
        }
        return
    }

}
