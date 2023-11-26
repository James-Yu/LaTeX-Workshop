import * as vscode from 'vscode'
import type * as Ast from '@unified-latex/unified-latex-types'
import { lw } from '../lw'


const logger = lw.log('Selection')

function inNode(position: vscode.Position, node: Ast.Node) {
    if (node.position === undefined) {
        return false
    }
    if (node.position.start.line > position.line + 1 ||
        node.position.end.line < position.line + 1) {
        return false
    }
    if (node.position.start.line === position.line + 1 &&
        node.position.start.column > position.character + 1) {
        return false
    }
    if (node.position.end.line === position.line + 1 &&
        node.position.end.column < position.character + 1) {
        return false
    }
    return true
}

function findArg(position: vscode.Position, node: Ast.Node, stack: Ast.Node[]) {
    if (!('args' in node) || node.args === undefined) {
        return
    }
    for (const arg of node.args) {
        for (const child of arg.content) {
            if (!inNode(position, child)) {
                continue
            }
            stack.push(child)
            findNode(position, child, stack)
            break
        }
    }
}

export function findNode(position: vscode.Position, node: Ast.Node, stack: Ast.Node[] = [ node ]): Ast.Node[] {
    if ('content' in node && typeof node.content !== 'string') {
        for (const child of node.content) {
            if (inNode(position, child)) {
                stack.push(child)
                findNode(position, child, stack)
                break
            } else {
                findArg(position, child, stack)
            }
        }
    }
    findArg(position, node, stack)

    return stack
}

function nodeStackToSelectionRange(stack: Ast.Node[]): vscode.SelectionRange {
    const last = stack[stack.length - 1]
    const parent: Ast.Node | undefined = stack[stack.length - 2]
    return new vscode.SelectionRange(
        new vscode.Range(
            (last.position?.start.line || 1) - 1, (last.position?.start.column || 1) - 1,
            (last.position?.end.line || 1) - 1, (last.position?.end.column || 1) - 1
        ), parent ? nodeStackToSelectionRange(stack.slice(0, -1)) : undefined)
}

export class SelectionRangeProvider implements vscode.SelectionRangeProvider {
    async provideSelectionRanges(document: vscode.TextDocument, positions: vscode.Position[]) {
        await lw.cache.wait(document.fileName)
        const content = lw.cache.get(document.fileName)?.content
        const ast = lw.cache.get(document.fileName)?.ast
        if (!content || !ast) {
            logger.log(`Error loading ${content ? 'AST' : 'content'} during structuring: ${document.fileName} .`)
            return []
        }

        const ret: vscode.SelectionRange[] = []
        positions.forEach(position => {
            const nodeStack = findNode(position, ast)
            const selectionRange = nodeStackToSelectionRange(nodeStack)
            ret.push(selectionRange)
        })
        return ret
    }
}
