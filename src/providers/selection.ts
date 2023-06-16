import * as vscode from 'vscode'
import type * as Ast from '@unified-latex/unified-latex-types'
import * as lw from '../lw'
import { getLogger } from '../components/logger'

const logger = getLogger('Selection')

function findNode(position: vscode.Position, node: Ast.Node, stack: Ast.Node[] = [ node ]): Ast.Node[] {
    if ('content' in node && typeof node.content !== 'string') {
        for (const child of node.content) {
            if (child.position === undefined) {
                continue
            }
            if (child.position.start.line > position.line + 1 ||
                child.position.end.line < position.line + 1) {
                continue
            }
            if (child.position.start.line === position.line + 1 &&
                child.position.start.column > position.character + 1) {
                continue
            }
            if (child.position.end.line === position.line + 1 &&
                child.position.end.column < position.character + 1) {
                continue
            }
            stack.push(child)
            findNode(position, child, stack)
            break
        }
    }

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
        await lw.cacher.wait(document.fileName)
        const content = lw.cacher.get(document.fileName)?.content
        const ast = lw.cacher.get(document.fileName)?.ast
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
