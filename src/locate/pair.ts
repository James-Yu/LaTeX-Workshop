import * as vscode from 'vscode'

import type * as Ast from '@unified-latex/unified-latex-types'
import { lw } from '../lw'
import { argContentToStr } from '../utils/parser'

const logger = lw.log('EnvPair')

export const pair = {
    goto,
    select,
    name,
    close,
    build
}

enum PairType { ENVIRONMENT, DISPLAYMATH, INLINEMATH, MACRO}

const delimiters = [
    {type: PairType.ENVIRONMENT, start: /\\begin\{([\w\d]+\*?)\}/, end: /\\end\{([\w\d]+\*?)/},
    {type: PairType.INLINEMATH, start: /\\\(/, end: /\\\)/},
    {type: PairType.INLINEMATH, start: /\$/, end: /\$/},
    {type: PairType.DISPLAYMATH, start: /\\\[/, end: /\\\]/},
    {type: PairType.DISPLAYMATH, start: /\$\$/, end: /\$\$/},
    {type: PairType.MACRO, start: /\\if\w*/, end: /\\fi/},
    {type: PairType.MACRO, start: /\\if\w*/, end: /\\else/},
    {type: PairType.MACRO, start: /\\else/, end: /\\fi/}
]

class MacroPair {
    /** The list of contained pairs */
    public children: MacroPair[] = []
    /** The parent of top-level pairs must be undefined */
    public parent: MacroPair | undefined = undefined

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
 * Builds a tree structure of LaTeX macros and environments in the given
 * document.
 *
 * Parses the LaTeX content in the document and constructs a tree structure of
 * MacroPair objects, representing the macros and environments in the
 * document. The tree is built by iterating through the abstract syntax tree
 * (AST) of the LaTeX content.
 *
 * @param document - The vscode.TextDocument object representing the LaTeX
 * document.
 * @returns Promise<MacroPair[]> - A Promise resolving to an array of
 * MacroPair objects representing the macros and environments in the
 * document.
 */
async function build(document: vscode.TextDocument): Promise<MacroPair[]> {
    const ast = await lw.parser.parse.tex(document.getText())
    if (!ast) {
        logger.log('Error parsing current document as AST.')
        return []
    }

    const macroPairs: MacroPair[] = []
    let parentPair: MacroPair | undefined = undefined
    for (let index = 0; index < ast.content.length; index++) {
        const node = ast.content[index]
        const next = index === ast.content.length - 1 ? undefined : ast.content[index + 1]
        parentPair = buildMacroPairTreeFromNode(document, node, next, parentPair, macroPairs)
    }
    return macroPairs
}

/**
 * Builds a MacroPair object tree from a given AST node.
 *
 * Recursively constructs a MacroPair tree from the provided AST node. It
 * identifies different types of LaTeX elements (environments, display math,
 * inline math, macros) and creates MacroPair objects accordingly.
 *
 * @param doc - The vscode.TextDocument object representing the LaTeX document.
 * @param node - The AST node to process.
 * @param next - The next AST node after the current one.
 * @param parentMacroPair - The parent MacroPair for the current node.
 * @param macros - An array to store the generated MacroPair objects.
 * @returns MacroPair | undefined - The parent MacroPair for the next
 * iteration.
 */
function buildMacroPairTreeFromNode(doc: vscode.TextDocument, node: Ast.Node, next: Ast.Node | undefined, parentMacroPair: MacroPair | undefined, macros: MacroPair[]): MacroPair | undefined {
    if (node.position === undefined) {
        return parentMacroPair
    }
    if (node.type === 'environment' || node.type === 'mathenv') {
        // The following is necessary as node.env may be Ast.String, bug in upstream (16.06.23)
        const envName = argContentToStr([node.env as unknown as Ast.Node]) || node.env
        let currentMacroPair: MacroPair | undefined
        // If we encounter `\begin{document}`, clear macro pairs
        if (envName === 'document') {
            macros.length = 0
            currentMacroPair = undefined
            parentMacroPair = undefined
        } else {
            const beginName = `\\begin{${envName}}`
            const endName = `\\end{${envName}}`
            const beginPos = new vscode.Position(node.position.start.line - 1, node.position.start.column - 1)
            const endPos = new vscode.Position(node.position.end.line - 1, node.position.end.column - 1)
            currentMacroPair = new MacroPair(PairType.ENVIRONMENT, beginName, beginPos, endName, endPos)
            if (parentMacroPair) {
                currentMacroPair.parent = parentMacroPair
                parentMacroPair.children.push(currentMacroPair)
            } else {
                macros.push(currentMacroPair)
            }
            parentMacroPair = currentMacroPair
        }
        for (let index = 0; index < node.content.length; index++) {
            const subnode = node.content[index]
            const subnext = index === node.content.length - 1 ? undefined : node.content[index + 1]
            parentMacroPair = buildMacroPairTreeFromNode(doc, subnode, subnext, parentMacroPair, macros)
        }
        parentMacroPair = currentMacroPair?.parent
    } else if (node.type === 'displaymath') {
        const beginPos = new vscode.Position(node.position.start.line - 1, node.position.start.column - 1)
        const endPos = new vscode.Position(node.position.end.line - 1, node.position.end.column - 1)
        if (doc.getText(new vscode.Range(beginPos, beginPos.translate(0, 2))) === '$$') {
            const currentMacroPair = new MacroPair(PairType.DISPLAYMATH, '$$', beginPos, '$$', endPos)
            macros.push(currentMacroPair)
        } else {
            const currentMacroPair = new MacroPair(PairType.DISPLAYMATH, '\\[', beginPos, '\\]', endPos)
            macros.push(currentMacroPair)
        }
    } else if (node.type === 'inlinemath') {
        const beginPos = new vscode.Position(node.position.start.line - 1, node.position.start.column - 1)
        const endPos = new vscode.Position(node.position.end.line - 1, node.position.end.column - 1)
        if (doc.getText(new vscode.Range(beginPos, beginPos.translate(0, 1))) === '$') {
            const currentMacroPair = new MacroPair(PairType.INLINEMATH, '$', beginPos, '$', endPos)
            macros.push(currentMacroPair)
        } else {
            const currentMacroPair = new MacroPair(PairType.INLINEMATH, '\\(', beginPos, '\\)', endPos)
            macros.push(currentMacroPair)
        }
    } else if (node.type === 'macro') {
        if (node.content === 'begin' && next?.type === 'group' && next.content[0]?.type === 'string') {
            // This is an unbalanced environment
            const beginPos = new vscode.Position(node.position.start.line - 1, node.position.start.column - 1)
            const envName = next.content[0].content
            const envTeX = `\\begin{${envName}}`
            const currentMacroPair = new MacroPair(PairType.ENVIRONMENT, envTeX, beginPos)
            if (parentMacroPair) {
                currentMacroPair.parent = parentMacroPair
                parentMacroPair.children.push(currentMacroPair)
            } else {
                macros.push(currentMacroPair)
            }
            // currentMacroPair becomes the new parent
            return currentMacroPair
        }
        const macroName = '\\' + node.content
        for (const macroPair of delimiters) {
            if (macroPair.type === PairType.MACRO && macroName.match(macroPair.end) && parentMacroPair && parentMacroPair.start.match(macroPair.start)) {
                parentMacroPair.end = macroName
                parentMacroPair.endPosition = new vscode.Position(node.position.end.line - 1, node.position.end.column - 1)
                parentMacroPair = parentMacroPair.parent
                // Do not return after finding an 'end' token as it can also be the start of an other pair.
            }
        }
        for (const macroPair of delimiters) {
            if (macroPair.type === PairType.MACRO && macroName.match(macroPair.start)) {
                const beginPos = new vscode.Position(node.position.start.line - 1, node.position.start.column - 1)
                const currentMacroPair = new MacroPair(PairType.MACRO, macroName, beginPos)
                if (parentMacroPair) {
                    currentMacroPair.parent = parentMacroPair
                    parentMacroPair.children.push(currentMacroPair)
                } else {
                    macros.push(currentMacroPair)
                }
                // currentMacroPair becomes the new parent
                return currentMacroPair
            }
        }
        // #4063
        if (node.content === 'item' && node.args) {
            for (let argIndex = 0; argIndex < node.args.length; argIndex++) {
                for (let index = 0; index < node.args[argIndex].content.length; index++) {
                    const subnode = node.args[argIndex].content[index]
                    const subnext = index === node.args[argIndex].content.length - 1 ? undefined : node.args[argIndex].content[index + 1]
                    parentMacroPair = buildMacroPairTreeFromNode(doc, subnode, subnext, parentMacroPair, macros)
                }
            }
        }
    }
    return parentMacroPair
}


/**
 * Locates all pairs surrounding the given position in the document.
 *
 * Builds the macro pair tree for the document and then walks through it to
 * find all macro pairs that contain the specified position. Returns an array
 * of MacroPair objects.
 *
 * @param pos - The starting position (e.g., cursor position).
 * @param doc - The document in which the search is performed.
 * @returns Promise<MacroPair[]> - A Promise resolving to an array of
 * MacroPair objects surrounding the specified position.
 */
async function locateSurroundingPair(pos: vscode.Position, doc: vscode.TextDocument): Promise<MacroPair[]> {
    return walkThruForSurroundingPairs(pos, await build(doc))
}

/**
 * Walks through the macro pair tree to find all pairs surrounding the current
 * position.
 *
 * Recursively walks through the macro pair tree to find all MacroPair
 * objects that contain the specified position. Returns an array of MacroPair
 * objects.
 *
 * @param pos - The current cursor position.
 * @param macroPairTree - The array of MacroPair objects representing the
 * entire tree.
 * @returns MacroPair[] - An array of MacroPair objects surrounding the
 * specified position.
 */
function walkThruForSurroundingPairs(pos: vscode.Position, macroPairTree: MacroPair[]): MacroPair[] {
    const surroundingPairs: MacroPair[] = []
    for (const macroPair of macroPairTree) {
        if (macroPair.startPosition.isBeforeOrEqual(pos)) {
            if (!macroPair.endPosition || macroPair.endPosition.isAfter(pos)) {
                surroundingPairs.push(macroPair)
                if (macroPair.children) {
                    surroundingPairs.push(...walkThruForSurroundingPairs(pos, macroPair.children))
                }
            }
        }
    }
    return surroundingPairs
}

/**
 * Walks through the macro pair tree to find all pairs at the same depth as
 * the pair containing the specified position.
 *
 * Builds the macro pair tree for the document and then walks through it to
 * find all macro pairs that share the same depth as the pair containing the
 * specified position. Returns an array of MacroPair objects.
 *
 * @param pos - The current cursor position.
 * @param doc - The current document.
 * @returns Promise<MacroPair[]> - A Promise resolving to an array of
 * MacroPair objects at the same depth as the pair containing the specified
 * position.
 */
async function locatePairsAtDepth(pos: vscode.Position, doc: vscode.TextDocument): Promise<MacroPair[]> {
    return walkThruForPairsNextToPosition(pos, await build(doc))
}

/**
 * Walks through the macro pair tree to find all pairs at the same depth as
 * the pair containing the specified position.
 *
 * Recursively walks through the macro pair tree to find all MacroPair
 * objects at the same depth as the pair containing the specified position.
 * Returns an array of MacroPair objects.
 *
 * @param pos - The current cursor position.
 * @param macroPairTree - The array of MacroPair objects representing the
 * entire tree.
 * @returns MacroPair[] - An array of MacroPair objects at the same depth as
 * the specified position.
 */
function walkThruForPairsNextToPosition(pos: vscode.Position, macroPairTree: MacroPair[]): MacroPair[] {
    const pairsAtPosition: MacroPair[] = []
    if (macroPairTree.some((macroPair: MacroPair) => macroPair.startContains(pos) || macroPair.endContains(pos))) {
        return macroPairTree
    }

    for (const macroPair of macroPairTree) {
        if (macroPair.startPosition.isBefore(pos)) {
            if (!macroPair.endPosition || macroPair.endPosition.isAfter(pos)) {
                if (macroPair.children) {
                    pairsAtPosition.push(...walkThruForPairsNextToPosition(pos, macroPair.children))
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
            const firstPair = contiguousPairs.pop() as MacroPair
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
    const matchedPairs = (await locateSurroundingPair(startingPos, document)).filter((macroPair: MacroPair) => {
        return macroPair.end && macroPair.endPosition && [PairType.DISPLAYMATH, PairType.ENVIRONMENT].includes(macroPair.type)
    })
    const matchedPair = matchedPairs.at(-1)
    if (!matchedPair?.end || !matchedPair?.endPosition) {
        logger.log('No matched macro pair found in envNameAction')
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

    const matchedPairs = (await locateSurroundingPair(cursorPos, document)).filter((macroPair: MacroPair) => { return !macroPair.endPosition})

    const matchedPair = matchedPairs.at(-1)
    if (!matchedPair) {
        logger.log('No matched macro pair found in envNameAction')
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
