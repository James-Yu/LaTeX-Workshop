import {latexParser} from 'latex-utensils'
import * as vscode from 'vscode'
import type {Extension} from '../../../main'
import {TexMathEnv} from './texmathenvfinder'


export class CursorRenderer {
    private readonly extension: Extension
    private currentTeXString: string | undefined
    private currentAst: latexParser.LatexAst | undefined

    constructor(extension: Extension) {
        this.extension = extension
    }

    // Test whether cursor is in tex command strings
    // like \begin{...} \end{...} \xxxx{ \[ \] \( \) or \\
    isCursorInTeXCommand(document: vscode.TextDocument): boolean {
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

    getStartAndEnd(node: latexParser.Node) {
        if (latexParser.hasContentArray(node) && node.content.length > 0) {
            const sloc = node.content[0].location
            const eloc = node.content[node.content.length-1].location
            if (sloc && eloc) {
                const start = { line: sloc.start.line - 1, character: sloc.start.column - 1 }
                const end = { line: eloc.end.line - 1, character: eloc.end.column - 1 }
                return {start, end}
            } else {
                return
            }
        }
        if (latexParser.isSubscript(node) || latexParser.isSuperscript(node)) {
            const start = { line: node.location.start.line - 1, character: node.location.start.column }
            const end = { line: node.location.end.line - 1, character: node.location.end.column - 1 }
            return {start, end}
        } else {
            if (node.location) {
                const start = { line: node.location.start.line - 1, character: node.location.start.column - 1 }
                const end = { line: node.location.end.line - 1, character: node.location.end.column - 1 }
                return {start, end}
            } else {
                return
            }
        }
    }

    cursorPosInSnippet(texMath: TexMathEnv, cursorPos: vscode.Position) {
        const line = cursorPos.line - texMath.range.start.line
        const character = line === 0 ? cursorPos.character - texMath.range.start.character : cursorPos.character
        return {line, character}
    }

    isInText(findResult: latexParser.FindResult<latexParser.Node, latexParser.Node> | undefined): boolean {
        let parent = findResult?.parent
        while (parent) {
            if (latexParser.isAmsMathTextCommand(parent.node)) {
                return true
            }
            parent = parent.parent
        }
        return false
    }

    async insertCursor(texMath: TexMathEnv, cursorPos: vscode.Position, cursor: string) {
        const cursorPosInSnippet = this.cursorPosInSnippet(texMath, cursorPos)
        const arry = texMath.texString.split('\n')
        const findResult = await this.nodeAt(texMath, cursorPos)
        const cursorNode = findResult?.node
        if (this.isInText(findResult)){
            return texMath.texString
        }
        if (!cursorNode || !cursorNode.location) {
            const {line, character} = this.cursorPosInSnippet(texMath, cursorPos)
            const curLine = arry[line]
            arry[line] = curLine.substring(0, character) + cursor + curLine.substring(character, curLine.length)
            return arry.join('\n')
        }
        const se = this.getStartAndEnd(cursorNode)
        if (!se) {
            return texMath.texString
        }
        const nodeStart = se.start
        const nodeEnd = se.end
        if (nodeStart.line === cursorPosInSnippet.line && cursorPosInSnippet.line === nodeEnd.line) {
            const line = cursorPosInSnippet.line
            const curLine = arry[line]
            arry[line] =
            curLine.substring(0, nodeStart.character)
            + '{'
            + curLine.substring(nodeStart.character, cursorPosInSnippet.character)
            + cursor
            + curLine.substring(cursorPosInSnippet.character, nodeEnd.character)
            + '}'
            + curLine.substring(nodeEnd.character, curLine.length)
        } else if (nodeStart.line === cursorPos.line) {
            return texMath.texString
        } else if (nodeEnd.line === cursorPos.line) {
            return texMath.texString
        } else {
            const line = cursorPosInSnippet.line
            const curLine = arry[line]
            arry[line] =
            curLine.substring(0, cursorPosInSnippet.character)
            + cursor
            + curLine.substring(cursorPosInSnippet.character, curLine.length)
        }
        return arry.join('\n')
    }

    async nodeAt(texMath: TexMathEnv, cursorPos: vscode.Position) {
        let ast: latexParser.LatexAst | undefined
        if (texMath.texString === this.currentTeXString && this.currentAst) {
            ast = this.currentAst
        } else {
            ast = await this.extension.pegParser.parseLatex(texMath.texString, {enableMathCharacterLocation: true})
            this.currentAst = ast
            this.currentTeXString = texMath.texString
        }
        if (!ast) {
            return
        }
        const cursorPosInSnippet = this.cursorPosInSnippet(texMath, cursorPos)
        const cursorLocInSnippet = {line: cursorPosInSnippet.line + 1, column: cursorPosInSnippet.character + 1}
        const result = latexParser.findNodeAt(ast.content, cursorLocInSnippet)
        if (!result) {
            return
        }
        return result
    }

    async renderCursor(document: vscode.TextDocument, texMath: TexMathEnv, thisColor: string): Promise<string> {
        const range = texMath.range
        const cursorPos = vscode.window.activeTextEditor?.selection.active
        if (!cursorPos || !range.contains(cursorPos) || range.start.isEqual(cursorPos) || range.end.isEqual(cursorPos)) {
            return texMath.texString
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const conf = configuration.get('hover.preview.cursor.enabled') as boolean
        if (!conf || this.isCursorInTeXCommand(document)) {
            return texMath.texString
        }
        const symbol = configuration.get('hover.preview.cursor.symbol') as string
        const color = configuration.get('hover.preview.cursor.color') as string
        const cursorString = color === 'auto' ? `{\\color{${thisColor}}${symbol}}` : `{\\color{${color}}${symbol}}`
        return this.insertCursor(texMath, cursorPos, cursorString)
    }

}
