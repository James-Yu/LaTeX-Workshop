import * as vscode from 'vscode'

import type * as Ast from '@unified-latex/unified-latex-types'
import { lw } from '../lw'
import { argContentToStr } from '../utils/parser'
import { parser } from '../parse/parser'

const logger = lw.log('EnvPair')

export const pair = {
    goto,
    select,
    name,
    close,
    build
}

enum PairType { ENVIRONMENT, DISPLAYMATH, INLINEMATH, COMMAND}

const delimiters = [
    {type: PairType.ENVIRONMENT, start: /\\begin\{([\w\d]+\*?)\}/, end: /\\end\{([\w\d]+\*?)/},
    {type: PairType.INLINEMATH, start: /\\\(/, end: /\\\)/},
    {type: PairType.INLINEMATH, start: /\$/, end: /\$/},
    {type: PairType.DISPLAYMATH, start: /\\\[/, end: /\\\]/},
    {type: PairType.DISPLAYMATH, start: /\$\$/, end: /\$\$/},
    {type: PairType.COMMAND, start: /\\if\w*/, end: /\\fi/},
    {type: PairType.COMMAND, start: /\\if\w*/, end: /\\else/},
    {type: PairType.COMMAND, start: /\\else/, end: /\\fi/}
]

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

    /**
     * Does the start statement contain `pos`
     */
    startContains(pos: vscode.Position): boolean {
        const startRange = new vscode.Range(this.startPosition, this.startPosition.translate(0, this.start.length))
        return startRange.contains(pos)
    }

    /**
     * Does the end statement contain `pos`
     */
    endContains(pos: vscode.Position): boolean {
        if (this.end && this.endPosition) {
            const endRange = new vscode.Range(this.endPosition, this.endPosition.translate(0, -this.end.length))
            return endRange.contains(pos)
        }
        return false
    }
}

/**
 * Builds a tree structure of LaTeX commands and environments in the given
 * document.
 *
 * Parses the LaTeX content in the document and constructs a tree structure of
 * CommandPair objects, representing the commands and environments in the
 * document. The tree is built by iterating through the abstract syntax tree
 * (AST) of the LaTeX content.
 *
 * @param document - The vscode.TextDocument object representing the LaTeX
 * document.
 * @returns Promise<CommandPair[]> - A Promise resolving to an array of
 * CommandPair objects representing the commands and environments in the
 * document.
 */
async function build(document: vscode.TextDocument): Promise<CommandPair[]> {
    const ast = await parser.parseLaTeX(document.getText())
    if (!ast) {
        logger.log('Error parsing current document as AST.')
        return []
    }

    const commandPairs: CommandPair[] = []
    let parentPair: CommandPair | undefined = undefined
    for (let index = 0; index < ast.content.length; index++) {
        const node = ast.content[index]
        const next = index === ast.content.length - 1 ? undefined : ast.content[index + 1]
        parentPair = buildCommandPairTreeFromNode(document, node, next, parentPair, commandPairs)
    }
    return commandPairs
}

/**
 * Builds a CommandPair object tree from a given AST node.
 *
 * Recursively constructs a CommandPair tree from the provided AST node. It
 * identifies different types of LaTeX elements (environments, display math,
 * inline math, commands) and creates CommandPair objects accordingly.
 *
 * @param doc - The vscode.TextDocument object representing the LaTeX document.
 * @param node - The AST node to process.
 * @param next - The next AST node after the current one.
 * @param parentCommandPair - The parent CommandPair for the current node.
 * @param commandPairs - An array to store the generated CommandPair objects.
 * @returns CommandPair | undefined - The parent CommandPair for the next
 * iteration.
 */
function buildCommandPairTreeFromNode(doc: vscode.TextDocument, node: Ast.Node, next: Ast.Node | undefined, parentCommandPair: CommandPair | undefined, commandPairs: CommandPair[]): CommandPair | undefined {
    if (node.position === undefined) {
        return parentCommandPair
    }
    if (node.type === 'environment' || node.type === 'mathenv') {
        // The following is necessary as node.env may be Ast.String, bug in upstream (16.06.23)
        const envName = argContentToStr([node.env as unknown as Ast.Node]) || node.env
        let currentCommandPair: CommandPair | undefined
        // If we encounter `\begin{document}`, clear commandPairs
        if (envName === 'document') {
            commandPairs.length = 0
            currentCommandPair = undefined
            parentCommandPair = undefined
        } else {
            const beginName = `\\begin{${envName}}`
            const endName = `\\end{${envName}}`
            const beginPos = new vscode.Position(node.position.start.line - 1, node.position.start.column - 1)
            const endPos = new vscode.Position(node.position.end.line - 1, node.position.end.column - 1)
            currentCommandPair = new CommandPair(PairType.ENVIRONMENT, beginName, beginPos, endName, endPos)
            if (parentCommandPair) {
                currentCommandPair.parent = parentCommandPair
                parentCommandPair.children.push(currentCommandPair)
            } else {
                commandPairs.push(currentCommandPair)
            }
            parentCommandPair = currentCommandPair
        }
        for (let index = 0; index < node.content.length; index++) {
            const subnode = node.content[index]
            const subnext = index === node.content.length - 1 ? undefined : node.content[index + 1]
            parentCommandPair = buildCommandPairTreeFromNode(doc, subnode, subnext, parentCommandPair, commandPairs)
        }
        parentCommandPair = currentCommandPair?.parent
    } else if (node.type === 'displaymath') {
        const beginPos = new vscode.Position(node.position.start.line - 1, node.position.start.column - 1)
        const endPos = new vscode.Position(node.position.end.line - 1, node.position.end.column - 1)
        if (doc.getText(new vscode.Range(beginPos, beginPos.translate(0, 2))) === '$$') {
            const currentCommandPair = new CommandPair(PairType.DISPLAYMATH, '$$', beginPos, '$$', endPos)
            commandPairs.push(currentCommandPair)
        } else {
            const currentCommandPair = new CommandPair(PairType.DISPLAYMATH, '\\[', beginPos, '\\]', endPos)
            commandPairs.push(currentCommandPair)
        }
    } else if (node.type === 'inlinemath') {
        const beginPos = new vscode.Position(node.position.start.line - 1, node.position.start.column - 1)
        const endPos = new vscode.Position(node.position.end.line - 1, node.position.end.column - 1)
        if (doc.getText(new vscode.Range(beginPos, beginPos.translate(0, 1))) === '$') {
            const currentCommandPair = new CommandPair(PairType.INLINEMATH, '$', beginPos, '$', endPos)
            commandPairs.push(currentCommandPair)
        } else {
            const currentCommandPair = new CommandPair(PairType.INLINEMATH, '\\(', beginPos, '\\)', endPos)
            commandPairs.push(currentCommandPair)
        }
    } else if (node.type === 'macro') {
        if (node.content === 'begin' && next?.type === 'group' && next.content[0]?.type === 'string') {
            // This is an unbalanced environment
            const beginPos = new vscode.Position(node.position.start.line - 1, node.position.start.column - 1)
            const envName = next.content[0].content
            const envTeX = `\\begin{${envName}}`
            const currentCommandPair = new CommandPair(PairType.ENVIRONMENT, envTeX, beginPos)
            if (parentCommandPair) {
                currentCommandPair.parent = parentCommandPair
                parentCommandPair.children.push(currentCommandPair)
            } else {
                commandPairs.push(currentCommandPair)
            }
            // currentCommandPair becomes the new parent
            return currentCommandPair
        }
        const macroName = '\\' + node.content
        for (const macroPair of delimiters) {
            if (macroPair.type === PairType.COMMAND && macroName.match(macroPair.end) && parentCommandPair && parentCommandPair.start.match(macroPair.start)) {
                parentCommandPair.end = macroName
                parentCommandPair.endPosition = new vscode.Position(node.position.end.line - 1, node.position.end.column - 1)
                parentCommandPair = parentCommandPair.parent
                // Do not return after finding an 'end' token as it can also be the start of an other pair.
            }
        }
        for (const macroPair of delimiters) {
            if (macroPair.type === PairType.COMMAND && macroName.match(macroPair.start)) {
                const beginPos = new vscode.Position(node.position.start.line - 1, node.position.start.column - 1)
                const currentCommandPair = new CommandPair(PairType.COMMAND, macroName, beginPos)
                if (parentCommandPair) {
                    currentCommandPair.parent = parentCommandPair
                    parentCommandPair.children.push(currentCommandPair)
                } else {
                    commandPairs.push(currentCommandPair)
                }
                // currentCommandPair becomes the new parent
                return currentCommandPair
            }
        }
        // #4063
        if (node.content === 'item' && node.args) {
            for (let argIndex = 0; argIndex < node.args.length; argIndex++) {
                for (let index = 0; index < node.args[argIndex].content.length; index++) {
                    const subnode = node.args[argIndex].content[index]
                    const subnext = index === node.args[argIndex].content.length - 1 ? undefined : node.args[argIndex].content[index + 1]
                    parentCommandPair = buildCommandPairTreeFromNode(doc, subnode, subnext, parentCommandPair, commandPairs)
                }
            }
        }
    }
    return parentCommandPair
}


/**
 * Locates all pairs surrounding the given position in the document.
 *
 * Builds the command pair tree for the document and then walks through it to
 * find all command pairs that contain the specified position. Returns an array
 * of CommandPair objects.
 *
 * @param pos - The starting position (e.g., cursor position).
 * @param doc - The document in which the search is performed.
 * @returns Promise<CommandPair[]> - A Promise resolving to an array of
 * CommandPair objects surrounding the specified position.
 */
async function locateSurroundingPair(pos: vscode.Position, doc: vscode.TextDocument): Promise<CommandPair[]> {
    const commandPairTree = await build(doc)
    const matchedCommandPairs = walkThruForSurroundingPairs(pos, commandPairTree)
    return matchedCommandPairs
}

/**
 * Walks through the command pair tree to find all pairs surrounding the current
 * position.
 *
 * Recursively walks through the command pair tree to find all CommandPair
 * objects that contain the specified position. Returns an array of CommandPair
 * objects.
 *
 * @param pos - The current cursor position.
 * @param commandPairTree - The array of CommandPair objects representing the
 * entire tree.
 * @returns CommandPair[] - An array of CommandPair objects surrounding the
 * specified position.
 */
function walkThruForSurroundingPairs(pos: vscode.Position, commandPairTree: CommandPair[]): CommandPair[] {
    const surroundingPairs: CommandPair[] = []
    for (const commandPair of commandPairTree) {
        if (commandPair.startPosition.isBeforeOrEqual(pos)) {
            if (!commandPair.endPosition || commandPair.endPosition.isAfter(pos)) {
                surroundingPairs.push(commandPair)
                if (commandPair.children) {
                    surroundingPairs.push(...walkThruForSurroundingPairs(pos, commandPair.children))
                }
            }
        }
    }
    return surroundingPairs
}

/**
 * Walks through the command pair tree to find all pairs at the same depth as
 * the pair containing the specified position.
 *
 * Builds the command pair tree for the document and then walks through it to
 * find all command pairs that share the same depth as the pair containing the
 * specified position. Returns an array of CommandPair objects.
 *
 * @param pos - The current cursor position.
 * @param doc - The current document.
 * @returns Promise<CommandPair[]> - A Promise resolving to an array of
 * CommandPair objects at the same depth as the pair containing the specified
 * position.
 */
async function locatePairsAtDepth(pos: vscode.Position, doc: vscode.TextDocument): Promise<CommandPair[]> {
    const commandPairTree = await build(doc)
    const overlappingPairs = walkThruForPairsNextToPosition(pos, commandPairTree)
    return overlappingPairs
}

/**
 * Walks through the command pair tree to find all pairs at the same depth as
 * the pair containing the specified position.
 *
 * Recursively walks through the command pair tree to find all CommandPair
 * objects at the same depth as the pair containing the specified position.
 * Returns an array of CommandPair objects.
 *
 * @param pos - The current cursor position.
 * @param commandPairTree - The array of CommandPair objects representing the
 * entire tree.
 * @returns CommandPair[] - An array of CommandPair objects at the same depth as
 * the specified position.
 */
function walkThruForPairsNextToPosition(pos: vscode.Position, commandPairTree: CommandPair[]): CommandPair[] {
    const pairsAtPosition: CommandPair[] = []
    if (commandPairTree.some((macroPair: CommandPair) => macroPair.startContains(pos) || macroPair.endContains(pos))) {
        return commandPairTree
    }

    for (const commandPair of commandPairTree) {
        if (commandPair.startPosition.isBefore(pos)) {
            if (!commandPair.endPosition || commandPair.endPosition.isAfter(pos)) {
                if (commandPair.children) {
                    pairsAtPosition.push(...walkThruForPairsNextToPosition(pos, commandPair.children))
                }
            }
        }
    }
    return pairsAtPosition
}

/**
 *  Navigates to the matching end statement or the opening statement of the
 * first pair in a contiguous chain.
 *
 * If the cursor is on an opening statement, it moves to the matching end
 * statement. If the cursor is on an end statement, it moves to the opening
 * statement of the first pair making a contiguous chain of pairs up to the
 * current position.
 *
 * Consider the following LaTeX content
 *
 *  \ifpoo
 *      ....
 *  \else
 *      ...
 *  \fi
 *
 * Calling this function yields the following move \ifpoo -> \else \else -> \fi
 *  \fi -> \ifpoo
 */
async function goto() {
    const editor = vscode.window.activeTextEditor
    if (!editor || editor.document.languageId !== 'latex') {
        return
    }
    const curPos = editor.selection.active
    const document = editor.document

    const macroPairs = (await locatePairsAtDepth(curPos, document))
    // First, test if we are an opening statement.
    for (const macroPair of macroPairs) {
        if (macroPair.startContains(curPos) && macroPair.endPosition && macroPair.end) {
            const endStartPosition = macroPair.endPosition.translate(0, -macroPair.end.length)
            editor.selection = new vscode.Selection(endStartPosition, endStartPosition)
            return
        }
    }

    // Second, if we are not on an opening statement, test if we are on a closing one.
    for (const [index, macroPair] of macroPairs.entries()) {
        if (macroPair.endContains(curPos)) {
            editor.selection = new vscode.Selection(macroPair.startPosition, macroPair.startPosition)
            const contiguousPairs = [macroPair]
            let currentPos: vscode.Position = macroPair.startPosition
            // Locate the chain of contiguous pairs up to here
            for (const previousPair of macroPairs.slice(undefined, index).reverse()) {
                if (previousPair.endContains(currentPos)) {
                    currentPos = previousPair.startPosition
                    contiguousPairs.push(previousPair)
                } else {
                    break
                }
            }
            const firstPair = contiguousPairs.pop() as CommandPair
            editor.selection = new vscode.Selection(firstPair.startPosition, firstPair.startPosition )
            return
        }
    }
}

/**
 * Selects or adds a multi-cursor to an environment name.
 *
 * Toggles between `\[...\]` and `\begin{$text}...\end{$text}`, where `$text` is
 * `''` if `action = cursor` and `'equation*'` otherwise.
 * - If `action = 'selection'`, the environment name is selected in both the
 *   begin and end parts.
 * - If `action = 'cursor'`, a multi-cursor is added at the beginning of the
 *   environment name in both the begin and end parts.
 * - If `action = 'equationToggle'`, it toggles between `\[...\]` and
 *   `\begin{}...\end{}` without moving the selection.
 */
async function name(action: 'selection'|'cursor'|'equationToggle') {
    const editor = vscode.window.activeTextEditor
    if (!editor || editor.document.languageId !== 'latex') {
        return
    }
    let startingPos = editor.selection.active
    const document = editor.document

    // Only keep display math and environments
    const matchedPairs = (await locateSurroundingPair(startingPos, document)).filter((macroPair: CommandPair) => {
        return macroPair.end && macroPair.endPosition && [PairType.DISPLAYMATH, PairType.ENVIRONMENT].includes(macroPair.type)
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
            edit.replace(document.uri, endRange, '\\]')
            edit.replace(document.uri, beginRange, '\\[')
            if (startingPos.line === matchedPair.startPosition.line) {
                const diff = Math.max('['.length - matchedPair.start.length, -startingPos.character)
                startingPos = startingPos.translate(0, diff)
            }
        } else {
            envNameLength = matchedPair.start.length - '\\begin{}'.length
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

/**
 * Selects the content or the whole of the current environment.
 *
 * Depending on the `mode` parameter, selects either the content or the whole
 * current environment.
 * - If `mode = 'content'`, selects the content of the environment.
 * - If `mode = 'whole'`, selects the whole environment.
 */
async function select(mode: 'content' | 'whole') {
    const editor = vscode.window.activeTextEditor
    if (!editor || editor.document.languageId !== 'latex') {
        return
    }
    const startingPos = editor.selection.active
    const document = editor.document

    const matchedMacroPairs = await locateSurroundingPair(startingPos, document)
    for (const macroPair of matchedMacroPairs.reverse()) {
        if (macroPair.endPosition && macroPair.end) {
            let startEnvPos: vscode.Position
            let endEnvPos: vscode.Position
            if (mode === 'content') {
                startEnvPos = macroPair.startPosition.translate(0, macroPair.start.length)
                endEnvPos = macroPair.endPosition.translate(0, -macroPair.end.length)
            } else if (mode === 'whole') {
                startEnvPos = macroPair.startPosition
                endEnvPos = macroPair.endPosition
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

/**
 * Closes the current environment by inserting the corresponding end statement.
 *
 * Inserts the corresponding end statement at the cursor position. If both the
 * `\begin` and the current position are preceded by whitespace only in their
 * respective lines, it mimics the exact kind of indentation of `\begin` when
 * inserting `\end`.
 */
async function close() {
    const editor = vscode.window.activeTextEditor
    if (!editor || editor.document.languageId !== 'latex') {
        return
    }
    const cursorPos = editor.selection.active
    const document = editor.document

    const matchedPairs = (await locateSurroundingPair(cursorPos, document)).filter((macroPair: CommandPair) => { return !macroPair.endPosition})

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
