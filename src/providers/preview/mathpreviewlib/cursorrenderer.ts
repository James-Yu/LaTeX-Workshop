import * as vscode from 'vscode'
import type * as Ast from '@unified-latex/unified-latex-types'
import { TexMathEnv } from './texmathenvfinder'
import type { ITextDocumentLike } from './textdocumentlike'
import { parser } from '../../../components/parser'
import { getLogger } from '../../../components/logger'
import { findNode } from '../../selection'

const logger = getLogger('Preview', 'Math', 'Cursor')

const cache: {
    texString?: string,
    ast?: Ast.Root
} = {}

// Test whether cursor is in tex command strings
// like \begin{...} \end{...} \xxxx{ \[ \] \( \) or \\
function isCursorInTeXCommand(document: ITextDocumentLike): boolean {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
        return false
    }
    const cursor = editor.selection.active
    const r = document.getWordRangeAtPosition(cursor, /\\(?:begin|end|label)\{.*?\}|\\[a-zA-Z]+\{?|\\[()[\]]|\\\\/)
    if (r && r.start.isBefore(cursor) && r.end.isAfter(cursor) ) {
        return true
    }
    return false
}

function findCursorPosInSnippet(texMath: TexMathEnv, cursorPos: vscode.Position): vscode.Position {
    const line = cursorPos.line - texMath.range.start.line
    const character = line === 0 ? cursorPos.character - texMath.range.start.character : cursorPos.character
    return new vscode.Position(line, character)
}

function insertCursor(texMath: TexMathEnv, cursorPos: vscode.Position, cursor: string): string {
    const findResult = findNodeAt(texMath, cursorPos)
    if (findResult === undefined || cache.ast === undefined) {
        return texMath.texString
    }
    if (findResult.find(node => node.type === 'macro' && node.content === 'text')) {
        return texMath.texString
    }
    const cursorNode = findResult[findResult.length - 1]
    if (cursorNode?.type === 'macro') {
        return texMath.texString
    }
    const texLines = texMath.texString.split('\n')
    texLines[cursorPos.line] = texLines[cursorPos.line].slice(0, cursorPos.character) + cursor + texLines[cursorPos.line].slice(cursorPos.character)
    return texLines.join('\n')
}

function findNodeAt(texMath: TexMathEnv, cursorPos: vscode.Position) {
    let ast: Ast.Root | undefined
    if (texMath.texString === cache.texString && cache.ast) {
        logger.log(`Use previous AST of ${texMath.texString} .`)
        ast = cache.ast
    } else {
        logger.log(`Parse LaTeX AST from ${texMath.texString} .`)
        ast = parser.unifiedParse(texMath.texString)
        cache.ast = ast
        cache.texString = texMath.texString
    }
    if (!ast) {
        logger.log('Failed parsing LaTeX AST.')
        return
    }
    const cursorPosInSnippet = findCursorPosInSnippet(texMath, cursorPos)
    const result = findNode(cursorPosInSnippet, ast)
    return result
}

export function renderCursor(document: ITextDocumentLike, texMath: TexMathEnv, thisColor: string): string {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const cursorEnabled = configuration.get('hover.preview.cursor.enabled') as boolean
    if (!cursorEnabled) {
        return texMath.texString
    }
    const texMathRange = texMath.range
    const cursorPos = vscode.window.activeTextEditor?.selection.active
    if (!cursorPos) {
        return texMath.texString
    }
    if (!isCursorInsideTexMath(texMathRange, cursorPos)) {
        return texMath.texString
    }
    if (isCursorInTeXCommand(document)) {
        return texMath.texString
    }
    const symbol = configuration.get('hover.preview.cursor.symbol') as string
    const color = configuration.get('hover.preview.cursor.color') as string
    const cursorString = color === 'auto' ? `{\\color{${thisColor}}${symbol}}` : `{\\color{${color}}${symbol}}`
    return insertCursor(texMath, cursorPos, cursorString)
}

function isCursorInsideTexMath(texMathRange: vscode.Range, cursorPos: vscode.Position): boolean {
    return texMathRange.contains(cursorPos) && !texMathRange.start.isEqual(cursorPos) && !texMathRange.end.isEqual(cursorPos)
}

export const testTools = {
    insertCursor,
    isCursorInsideTexMath,
}
