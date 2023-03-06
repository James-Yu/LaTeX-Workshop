import * as vscode from 'vscode'
import * as lw from '../lw'
import * as utils from '../utils/utils'
import { getLogger } from './logger'
import { UtensilsParser } from './parser/syntax'
import { latexParser } from 'latex-utensils'

const logger = getLogger('EnvPair')

function regexpAllMatches(str: string, reg: RegExp) {
    const res: RegExpExecArray[] = []
    let m = reg.exec(str)
    while (m) {
        res.push(m)
        m = reg.exec(str)
    }
    return res
}

enum SearchDirection { DOWNWARDS, UPWARDS }
enum PairType { ENVIRONMENT, DISPLAYMATH, INLINEMATH, COMMAND}

interface LaTeXCommandsPair {
    type: PairType,
    start: RegExp,
    end: RegExp
}

interface PairElement {
    pairType: PairType,
    direction: SearchDirection,
    matching: RegExp,
    pos: vscode.Position,
    length: number,
    envName?: string
}

interface MatchEnv {
    name: string,
    type: string, // 'begin', 'end', '[', ']', '(', ')'
    pos: vscode.Position
}

class CommandPair {
    public children: CommandPair[] = []
    public parent: CommandPair | undefined = undefined // The parent of top-level pairs must be undefined

    constructor(
        public type: PairType,
        public start: string,
        public startPosition: vscode.Position,
        public end?: string,
        public endPosition?: vscode.Position,
        ) {}

}

export class EnvPair {
    private static readonly delimiters: LaTeXCommandsPair[] = [
        {type: PairType.ENVIRONMENT, start: /\\begin\{([\w\d]+\*?)\}/, end: /\\end\{([\w\d]+\*?)/},
        {type: PairType.INLINEMATH, start: /\\\(/, end: /\\\)/},
        {type: PairType.DISPLAYMATH, start: /\\\[/, end: /\\\]/},
        {type: PairType.COMMAND, start: /\\if\w*/, end: /\\fi/},
        {type: PairType.COMMAND, start: /\\if\w*/, end: /\\else/},
        {type: PairType.COMMAND, start: /\\else/, end: /\\fi/}
    ]

    constructor() {}

    private static tryDelimiter(delimiter: LaTeXCommandsPair, direction: SearchDirection, line: string, pos: vscode.Position, startingIndex: number): PairElement | null {
        const begin = direction === SearchDirection.DOWNWARDS ? delimiter.start : delimiter.end
        const end = direction === SearchDirection.DOWNWARDS ? delimiter.end : delimiter.start

        const result = line.match(begin)
        if (result) {
            const matchLength = result[0].length
            if (startingIndex + matchLength >= pos.character) {
                return {
                    pairType: delimiter.type,
                    direction: SearchDirection.DOWNWARDS,
                    matching: end,
                    length: matchLength,
                    pos: new vscode.Position(pos.line, startingIndex)
                }
            }
        }
        return null
    }

    private static tokenizeLine(document: vscode.TextDocument, pos: vscode.Position): PairElement[] {
        const line = utils.stripCommentsAndVerbatim(document.lineAt(pos).text)
        const ind = pos.character
        const results: PairElement[] = []
        if (ind > line.length) {
            return results
        }
        const lineUpToInd = line.slice(0, ind + 1)
        const startInd = lineUpToInd.lastIndexOf('\\')
        const lineFromLastBackslash = line.slice(startInd)

        for(const delimiter of EnvPair.delimiters) {
            const result = EnvPair.tryDelimiter(delimiter, SearchDirection.DOWNWARDS, lineFromLastBackslash, pos, startInd)
            if (result) {
                results.push(result)
            }
        }

        for(const delimiter of EnvPair.delimiters) {
            const result = EnvPair.tryDelimiter(delimiter, SearchDirection.UPWARDS, lineFromLastBackslash, pos, startInd)
            if (result) {
                results.push(result)
            }
        }
        return results
    }

    private static async buildCommandPairTree(doc: vscode.TextDocument): Promise<CommandPair[]> {
        let ast: latexParser.LatexAst | undefined = await UtensilsParser.parseLatex(doc.getText()).catch((e) => {
            if (latexParser.isSyntaxError(e)) {
                const line = e.location.start.line
                logger.log(`Error parsing dirty AST of active editor at line ${line}. Fallback to cache.`)
            }
            return undefined
        })

        if (!ast) {
            await lw.cacher.promise(doc.fileName)
            ast = lw.cacher.get(doc.fileName)?.ast
        }

        if (!ast) {
            logger.log(`Error loading AST during structuring: ${doc.fileName} .`)
            return []
        }

        const commandPairs: CommandPair[] = []
        let parentPair: CommandPair | undefined = undefined
        for (const node of ast.content) {
            parentPair = this.buildCommandPairTreeFromNode(node, parentPair, commandPairs)
        }
        return commandPairs
    }

    private static buildCommandPairTreeFromNode(node: latexParser.Node, parentCommandPair: CommandPair | undefined, commandPairs: CommandPair[]): CommandPair | undefined {
        if (latexParser.isEnvironment(node) || latexParser.isMathEnv(node) || latexParser.isMathEnvAligned(node)) {
            const name = node.name
            let currentCommandPair: CommandPair | undefined
            // If we encounter `\begin{document}`, clear commandPairs
            if (name === 'document') {
                commandPairs.length = 0
                currentCommandPair = undefined
                parentCommandPair = undefined
            } else {
                const beginName = `\\begin{${name}}`
                const endName = `\\end{${name}}`
                const beginPos = new vscode.Position(node.location.start.line - 1, node.location.start.column - 1)
                const endPos = new vscode.Position(node.location.end.line - 1, node.location.end.column - 1 + endName.length)
                currentCommandPair = new CommandPair(PairType.ENVIRONMENT, beginName, beginPos, endName, endPos)
                if (parentCommandPair) {
                    currentCommandPair.parent = parentCommandPair
                    parentCommandPair.children.push(currentCommandPair)
                } else {
                    commandPairs.push(currentCommandPair)
                }
                parentCommandPair = currentCommandPair
            }
            for (const subnode of node.content) {
                parentCommandPair = EnvPair.buildCommandPairTreeFromNode(subnode, parentCommandPair, commandPairs)
            }
            parentCommandPair = currentCommandPair?.parent
        } else if (latexParser.isDisplayMath(node)) {
            const beginPos = new vscode.Position(node.location.start.line - 1, node.location.start.column - 1)
            const endPos = new vscode.Position(node.location.end.line - 1, node.location.end.column - 1 + 2) // 2 = '\\]'.length
            const currentCommandPair = new CommandPair(PairType.DISPLAYMATH, '\\[', beginPos, '\\]', endPos)
            commandPairs.push(currentCommandPair)
        } else if (latexParser.isInlienMath(node)) {
            const beginPos = new vscode.Position(node.location.start.line - 1, node.location.start.column - 1)
            const endPos = new vscode.Position(node.location.end.line - 1, node.location.end.column - 1 + 2)  // 2 = '\\)'.length
            const currentCommandPair = new CommandPair(PairType.INLINEMATH, '\\(', beginPos, '\\)', endPos)
            commandPairs.push(currentCommandPair)
        } else if (latexParser.isCommand(node)) {
            const name = '\\' + node.name
            for (const pair of EnvPair.delimiters) {
                if (pair.type === PairType.COMMAND && name.match(pair.end) && parentCommandPair && parentCommandPair.start.match(pair.start)) {
                    parentCommandPair.end = name
                    parentCommandPair.endPosition = new vscode.Position(node.location.start.line - 1, node.location.start.column - 1 + parentCommandPair.end.length)
                    parentCommandPair = parentCommandPair.parent
                    // Do not return after finding an 'end' token as it can also be the start of an other pair.
                }
            }
            for (const pair of EnvPair.delimiters) {
                if (pair.type === PairType.COMMAND && name.match(pair.start)) {
                    const beginPos = new vscode.Position(node.location.start.line - 1, node.location.start.column - 1)
                    const currentCommandPair = new CommandPair(PairType.COMMAND, name, beginPos)
                    if (parentCommandPair) {
                        currentCommandPair.parent = parentCommandPair
                        parentCommandPair.children.push(currentCommandPair)
                    } else {
                        parentCommandPair = currentCommandPair
                        commandPairs.push(currentCommandPair)
                    }
                    return currentCommandPair
                }
            }
        }
        return parentCommandPair
    }


    /**
     * Search upwards or downwards for a begin or end environment captured by `pattern`.
     * The environment can also be \[...\] or \(...\)
     *
     * @param pattern A regex that matches begin or end environments. Note that the regex
     * must capture the delimiters
     * @param dir +1 to search downwards, -1 to search upwards
     * @param pos starting position (e.g. cursor position)
     * @param doc the document in which the search is performed
     * @param splitSubstring where to split the string if dir = 1 (default at end of `\begin{...}`)
     */
    static async locateSurroundingPair(pos: vscode.Position, doc: vscode.TextDocument): Promise<CommandPair[]> {
        const commandPairTree = await EnvPair.buildCommandPairTree(doc)
        const matchedCommandPairs = this.walkThruCommandPairTree(pos, commandPairTree)
        return matchedCommandPairs
    }

    static walkThruCommandPairTree(pos: vscode.Position, commandPairTree: CommandPair[]): CommandPair[] {
        const matchedCommandPairs: CommandPair[] = []
        for (const commandPair of commandPairTree) {
            if (commandPair.startPosition.isBeforeOrEqual(pos)) {
                if (commandPair.endPosition && commandPair.endPosition.isAfter(pos)) {
                    matchedCommandPairs.push(commandPair)
                    if (commandPair.children) {
                        matchedCommandPairs.push(...EnvPair.walkThruCommandPairTree(pos, commandPair.children))
                    }
                }
            }
        }
        return matchedCommandPairs
    }

    gotoPair() {
        const editor = vscode.window.activeTextEditor
        if (!editor || editor.document.languageId !== 'latex') {
            return
        }
        const curPos = editor.selection.active
        const document = editor.document

        void EnvPair.locateSurroundingPair(curPos, document)
    }

    envNameAction(action: 'selection'|'cursor'|'equationToggle') {

    }

    selectEnv() {

    }

    closeEnv() {

    }

}

export class OldEnvPair {
    private readonly beginLength = '\\begin'.length
    private readonly endLength = '\\end'.length
    private readonly delimiters = Object.create(null) as { [key: string]: {end: string, splitCharacter: string} }

    constructor() {
        this.delimiters['begin'] = {end: 'end', splitCharacter: '}'}
        this.delimiters['['] = {end: ']', splitCharacter: '['}
        this.delimiters['('] = {end: ')', splitCharacter: '('}
    }

    private getEnvName(line: string, ind: number, beginOrEnd: string): string | null {
        const subline = line.slice(ind)
        const re = new RegExp('^' + beginOrEnd + '\\{([^\\{\\}]*)\\}')
        const env = subline.match(re)
        if (env && env.length === 2) {
            return env[1]
        }
        return null
    }

    private tokenizeLine(document: vscode.TextDocument, pos: vscode.Position): MatchEnv | null {
        const line = utils.stripCommentsAndVerbatim(document.lineAt(pos).text)
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
     * Search upwards or downwards for a begin or end environment captured by `pattern`.
     * The environment can also be \[...\] or \(...\)
     *
     * @param pattern A regex that matches begin or end environments. Note that the regex
     * must capture the delimiters
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
        let startCol: number | undefined
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
                logger.log('Direction error in locateMatchingPair')
                return null
        }
        const begins = Object.keys(this.delimiters)
        const ends = Object.values(this.delimiters).map(value => value.end)
        while (true) {
            line = utils.stripCommentsAndVerbatim(line)
            let allMatches = regexpAllMatches(line, patRegexp)
            if (dir === -1) {
                allMatches = allMatches.reverse()
            }
            for (const m of allMatches) {
                if ((dir === 1 && begins.includes(m[1])) || (dir === -1 && ends.includes(m[1]))) {
                    nested += 1
                }
                if ((dir === 1 && ends.includes(m[1])) || (dir === -1 && begins.includes(m[1]))) {
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
    envNameAction(action: 'selection'|'cursor'|'equationToggle') {
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
        const endEnv = this.locateMatchingPair(pattern, dirDown, beginEnv.pos, document, this.delimiters[beginEnv.type].splitCharacter)
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

        void vscode.workspace.applyEdit(edit).then(success => {
            if (success || edit.size === 0) {
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
                        logger.log('Error while selecting environment name')
                }
            }
        })

        // editor.revealRange(new vscode.Range(beginEnvStartPos, endEnvStartPos))
    }

    /**
     * Select an environment
     */
    selectEnv() {
        const editor = vscode.window.activeTextEditor
        if (!editor || editor.document.languageId !== 'latex') {
            return
        }
        const startingPos = editor.selection.active
        const document = editor.document
        const searchEnvs = '[^\\{\\}]*'
        const pattern = `(?<!\\\\)\\\\(\\(|\\)|\\[|\\]|(?:begin|end)(?=\\{(${searchEnvs})\\}))`
        const dirUp = -1
        const beginEnv = this.locateMatchingPair(pattern, dirUp, startingPos, document)
        if (!beginEnv) {
            return
        }
        const dirDown = 1
        const endEnv = this.locateMatchingPair(pattern, dirDown, beginEnv.pos, document, this.delimiters[beginEnv.type].splitCharacter)
        if (!endEnv) {
            return
        }

        let envNameLength: number = 0
        // const edit = new vscode.WorkspaceEdit()

        if (beginEnv.type === 'begin' && endEnv.type === 'end') {
            envNameLength = beginEnv.name.length + 2 // for '{' and '}'
            if (beginEnv.name !== endEnv.name) {
                return // bad match
            }
        }

        const beginEnvPos = beginEnv.pos.translate(0, -1)
        const endEnvPos = endEnv.pos.translate(0, envNameLength + beginEnv.type.length)
        editor.selections = [new vscode.Selection(beginEnvPos, endEnvPos)]

        // applyEdit now returns false if edit is empty.
        // void vscode.workspace.applyEdit(edit).then(success => {
        //     if (success) {
        //     }
        // })

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
            const beginStartOfLine = resMatchingPair.pos.with(undefined, 0)
            const beginIndentRange = new vscode.Range(beginStartOfLine, resMatchingPair.pos.translate(0, -1))
            const beginIndent = editor.document.getText(beginIndentRange)
            const endStartOfLine = curPos.with(undefined, 0)
            const endIndentRange = new vscode.Range(endStartOfLine, curPos)
            const endIndent = editor.document.getText(endIndentRange)
            // If both \begin and the current position are preceded by
            // whitespace only in their respective lines, we mimic the exact
            // kind of indentation of \begin when inserting \end.
            if (/^\s*$/.test(beginIndent) && /^\s*$/.test(endIndent)) {
                return editor.edit(editBuilder => {
                    editBuilder.replace(new vscode.Range(endStartOfLine, curPos), beginIndent + endEnv)
                })
            } else {
                return editor.edit(editBuilder => { editBuilder.insert(curPos, endEnv) })
            }
        }
        return
    }

}
