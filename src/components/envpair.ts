import * as vscode from 'vscode'
import * as lw from '../lw'
import { getLogger } from './logger'
import { UtensilsParser } from './parser/syntax'
import { latexParser } from 'latex-utensils'

const logger = getLogger('EnvPair')

enum PairType { ENVIRONMENT, DISPLAYMATH, INLINEMATH, COMMAND}

interface LaTeXCommandsPair {
    type: PairType,
    start: RegExp,
    end: RegExp
}

class CommandPair {
    /** The list of contained pairs */
    public children: CommandPair[] = []
    /** The parent of top-level pairs must be undefined */
    public parent: CommandPair | undefined = undefined

    constructor(
        public type: PairType,
        /** The opening string. It contains the leading slash */
        public start: string,
        /** The starting position of `start` */
        public startPosition: vscode.Position,
        /** The closing string. It contains the leading slash */
        public end?: string,
        /** The ending position of `end` */
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

    async buildCommandPairTree(doc: vscode.TextDocument): Promise<CommandPair[]> {
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

    private buildCommandPairTreeFromNode(node: latexParser.Node, parentCommandPair: CommandPair | undefined, commandPairs: CommandPair[]): CommandPair | undefined {
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
                const endPos = new vscode.Position(node.location.end.line - 1, node.location.end.column - 1)
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
                parentCommandPair = this.buildCommandPairTreeFromNode(subnode, parentCommandPair, commandPairs)
            }
            parentCommandPair = currentCommandPair?.parent
        } else if (latexParser.isDisplayMath(node)) {
            const beginPos = new vscode.Position(node.location.start.line - 1, node.location.start.column - 1)
            const endPos = new vscode.Position(node.location.end.line - 1, node.location.end.column - 1)
            const currentCommandPair = new CommandPair(PairType.DISPLAYMATH, '\\[', beginPos, '\\]', endPos)
            commandPairs.push(currentCommandPair)
        } else if (latexParser.isInlienMath(node)) {
            const beginPos = new vscode.Position(node.location.start.line - 1, node.location.start.column - 1)
            const endPos = new vscode.Position(node.location.end.line - 1, node.location.end.column - 1)
            const currentCommandPair = new CommandPair(PairType.INLINEMATH, '\\(', beginPos, '\\)', endPos)
            commandPairs.push(currentCommandPair)
        } else if (latexParser.isCommand(node)) {
            if (node.name === 'begin' && node.args.length > 0 && latexParser.isGroup(node.args[0])) {
                // This is an unbalanced environment
                const beginPos = new vscode.Position(node.location.start.line - 1, node.location.start.column - 1)
                const envName = latexParser.stringify(node.args[0]).slice(1, -1)
                const name = `\\begin{${envName}}`
                const currentCommandPair = new CommandPair(PairType.ENVIRONMENT, name, beginPos)
                if (parentCommandPair) {
                    currentCommandPair.parent = parentCommandPair
                    parentCommandPair.children.push(currentCommandPair)
                } else {
                    parentCommandPair = currentCommandPair
                    commandPairs.push(currentCommandPair)
                }
                return currentCommandPair
            }
            const name = '\\' + node.name
            for (const pair of EnvPair.delimiters) {
                if (pair.type === PairType.COMMAND && name.match(pair.end) && parentCommandPair && parentCommandPair.start.match(pair.start)) {
                    parentCommandPair.end = name
                    parentCommandPair.endPosition = new vscode.Position(node.location.end.line - 1, node.location.end.column - 1)
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
    async locateSurroundingPair(pos: vscode.Position, doc: vscode.TextDocument): Promise<CommandPair[]> {
        const commandPairTree = await this.buildCommandPairTree(doc)
        const matchedCommandPairs = this.walkThruCommandPairTree(pos, commandPairTree)
        return matchedCommandPairs
    }

    walkThruCommandPairTree(pos: vscode.Position, commandPairTree: CommandPair[]): CommandPair[] {
        const matchedCommandPairs: CommandPair[] = []
        for (const commandPair of commandPairTree) {
            if (commandPair.startPosition.isBeforeOrEqual(pos)) {
                if (!commandPair.endPosition || commandPair.endPosition.isAfter(pos)) {
                    matchedCommandPairs.push(commandPair)
                    if (commandPair.children) {
                        matchedCommandPairs.push(...this.walkThruCommandPairTree(pos, commandPair.children))
                    }
                }
            }
        }
        return matchedCommandPairs
    }

    async gotoPair() {
        const editor = vscode.window.activeTextEditor
        if (!editor || editor.document.languageId !== 'latex') {
            return
        }
        const curPos = editor.selection.active
        const document = editor.document

        const pairs = (await this.locateSurroundingPair(curPos, document))
        for (const pair of pairs) {
            if (!pair.endPosition || !pair.end) {
                continue
            }
            const endStartPosition = pair.endPosition.translate(0, -pair.end.length)
            const startRange = new vscode.Range(pair.startPosition, pair.startPosition.translate(0, pair.start.length))
            if (startRange.contains(curPos)) {
                editor.selection = new vscode.Selection(endStartPosition, endStartPosition)
                return
            }
            const endRange = new vscode.Range(endStartPosition, pair.endPosition)
            if (endRange.contains(curPos)) {
                editor.selection = new vscode.Selection(pair.startPosition, pair.startPosition)
                return
            }
        }
    }

    /**
     * Select or add a multi-cursor to an environment name if called with
     * `action = 'selection'` or `action = 'cursor'` respectively.
     *
     * Toggles between `\[...\]` and `\begin{$text}...\end{$text}`
     * where `$text` is `''` if `action = cursor` and `'equation*'` otherwise
     *
     * Only toggles if `action = equationToggle` (i.e. does not move selection)
     *
     * @param action  can be
     *      - 'selection': the environment name is selected both in the begin and end part
     *      - 'cursor': a multi-cursor is added at the beginning of the environment name is selected both in the begin and end part
     *      - 'equationToggle': toggles between `\[...\]` and `\begin{}...\end{}`
     */
    async envNameAction(action: 'selection'|'cursor'|'equationToggle') {
        const editor = vscode.window.activeTextEditor
        if (!editor || editor.document.languageId !== 'latex') {
            return
        }
        let startingPos = editor.selection.active
        const document = editor.document

        // Only keep display math and environments
        const matchedPairs = (await this.locateSurroundingPair(startingPos, document)).filter((pair: CommandPair) => {
            return pair.end && pair.endPosition && [PairType.DISPLAYMATH, PairType.ENVIRONMENT].includes(pair.type)
        })
        const matchedPair = matchedPairs.at(-1)
        if (!matchedPair?.end || !matchedPair?.endPosition) {
            logger.log('No matched command pair found in envNameAction')
            return
        }

        const beginEnvStartPos = matchedPair.startPosition.translate(0, '\\begin{'.length)
        let endEnvStartPos = matchedPair.endPosition.translate(0, -matchedPair.end.length + '\\end{'.length)

        const edit = new vscode.WorkspaceEdit()
        let envNameLength: number
        if (matchedPair.type === PairType.DISPLAYMATH) {
            const eqText = action === 'cursor' ? '' : 'equation*'
            const beginRange = new vscode.Range(matchedPair.startPosition, matchedPair.startPosition.translate(0, 2)) // 2 = '\\['.length
            const endRange = new vscode.Range(matchedPair.endPosition.translate(0, -2), matchedPair.endPosition) // 2 = '\\]'.length
            envNameLength = eqText.length
            edit.replace(document.uri, endRange, `\\end{${eqText}}`)
            edit.replace(document.uri, beginRange, `\\begin{${eqText}}`)
            const diff = 'begin{}'.length + envNameLength - '['.length
            if (startingPos.line === matchedPair.startPosition.line) {
                startingPos = startingPos.translate(0, diff)
            }
            if (matchedPair.startPosition.line === matchedPair.endPosition.line) {
                endEnvStartPos = endEnvStartPos.translate(0, diff)
            }
        } else if (matchedPair.type === PairType.ENVIRONMENT) {
            if (action === 'equationToggle') {
                const beginRange = new vscode.Range(matchedPair.startPosition, matchedPair.startPosition.translate(0, matchedPair.start.length))
                const endRange = new vscode.Range(matchedPair.endPosition.translate(0, -matchedPair.end.length), matchedPair.endPosition)
                edit.replace(document.uri, endRange, ']')
                edit.replace(document.uri, beginRange, '[')
                if (startingPos.line === matchedPair.startPosition.line) {
                    const diff = Math.max('['.length - matchedPair.start.length, -startingPos.character)
                    startingPos = startingPos.translate(0, diff)
                }
            }
        } else {
            // Bad match
            return
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
    }


    async selectEnvContent(mode: 'content' | 'whole') {
        const editor = vscode.window.activeTextEditor
        if (!editor || editor.document.languageId !== 'latex') {
            return
        }
        const startingPos = editor.selection.active
        const document = editor.document

        const matchedCommandPairs = await this.locateSurroundingPair(startingPos, document)
        for (const pair of matchedCommandPairs.reverse()) {
            if (pair.endPosition && pair.end) {
                let startEnvPos: vscode.Position
                let endEnvPos: vscode.Position
                if (mode === 'content') {
                    startEnvPos = pair.startPosition.translate(0, pair.start.length + 1)
                    endEnvPos = pair.endPosition.translate(0, -pair.end.length)
                } else if (mode === 'whole') {
                    startEnvPos = pair.startPosition
                    endEnvPos = pair.endPosition
                } else {
                    return
                }
                editor.selections = [new vscode.Selection(startEnvPos, endEnvPos)]
                if (editor.selections[0].contains(startingPos)) {
                    return
                }
            }
        }
    }

    async closeEnv() {
        const editor = vscode.window.activeTextEditor
        if (!editor || editor.document.languageId !== 'latex') {
            return
        }
        const cursorPos = editor.selection.active
        const document = editor.document

        const matchedPairs = (await this.locateSurroundingPair(cursorPos, document)).filter((pair: CommandPair) => { return !pair.endPosition})

        const matchedPair = matchedPairs.at(-1)
        if (!matchedPair) {
            logger.log('No matched command pair found in envNameAction')
            return
        }

        const beginStartOfLine = matchedPair.startPosition.with(undefined, 0)
        const beginIndentRange = new vscode.Range(beginStartOfLine, matchedPair.startPosition)
        const beginIndent = editor.document.getText(beginIndentRange)
        const endStartOfLine = cursorPos.with(undefined, 0)
        const endIndentRange = new vscode.Range(endStartOfLine, cursorPos)
        const endIndent = editor.document.getText(endIndentRange)
        // If both \begin and the current position are preceded by
        // whitespace only in their respective lines, we mimic the exact
        // kind of indentation of \begin when inserting \end.
        const endEnv = matchedPair.start.replace('\\begin', '\\end')
        if (/^\s*$/.test(beginIndent) && /^\s*$/.test(endIndent)) {
            return editor.edit(editBuilder => {
                editBuilder.replace(new vscode.Range(endStartOfLine, cursorPos), beginIndent + endEnv)
            })
        } else {
            return editor.edit(editBuilder => { editBuilder.insert(cursorPos, endEnv) })
        }
    }

}
