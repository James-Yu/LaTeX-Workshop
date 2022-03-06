import {latexParser} from 'latex-utensils'
import * as vscode from 'vscode'

import {Extension} from '../main'

interface INode {
    location: ILuRange
}

interface ILuRange {
    start: {
        line: number,
        column: number
    },
    end: {
        line: number,
        column: number
    }
}

interface ILuRange2 {
    start: LuPos,
    end: LuPos
}

interface ILuPos {
    readonly line: number,
    readonly column: number
}

interface IContent {
    innerContent: latexParser.Node[],
    innerContentLuRange: ILuRange2
}

class LuPos implements ILuPos {

    static from(loc: ILuPos) {
        return new LuPos(loc.line, loc.column)
    }

    constructor(
        readonly line: number,
        readonly column: number
    ) {}

    isAfter(other: ILuPos): boolean {
        return this.line > other.line || ( this.line === other.line && this.column > other.column )
    }

    isAfterOrEqual(other: ILuPos): boolean {
        return this.line > other.line || ( this.line === other.line && this.column >= other.column )
    }

    isBefore(other: ILuPos): boolean {
        return this.line < other.line || ( this.line === other.line && this.column < other.column )
    }

    isBeforeOrEqual(other: ILuPos): boolean {
        return this.line < other.line || ( this.line === other.line && this.column <= other.column )
    }

}

function toVscodeRange(loc: ILuRange): vscode.Range {
    return new vscode.Range(
        loc.start.line - 1, loc.start.column - 1,
        loc.end.line - 1, loc.end.column - 1
    )
}

function toLatexUtensilPosition(pos: vscode.Position): LuPos {
    return new LuPos(pos.line + 1, pos.character + 1)
}


export class SelectionRangeProvider implements vscode.SelectionRangeProvider {

    constructor(private readonly extension: Extension) {}

    async provideSelectionRanges(document: vscode.TextDocument, positions: vscode.Position[]) {
        const content = document.getText()
        const latexAst = await this.extension.pegParser.parseLatex(content, {enableMathCharacterLocation: true})
        if (!latexAst) {
            return []
        }
        const ret: vscode.SelectionRange[] = []
        positions.forEach(pos => {
            const lupos = toLatexUtensilPosition(pos)
            const result = latexParser.findNodeAt(
                latexAst.content,
                lupos
            )
            const selectionRange = this.resultToSelectionRange(lupos, result)
            if (selectionRange) {
                ret.push(selectionRange)
            }
        })
        return ret
    }

    private getInnerContentRange(node: latexParser.Node): ILuRange2 | undefined {
        if (latexParser.isEnvironment(node) || latexParser.isMathEnv(node) || latexParser.isMathEnvAligned(node)) {
            return {
                start: LuPos.from({
                    line: node.location.start.line,
                    column: node.location.start.column + '\\begin{}'.length + node.name.length
                }),
                end: LuPos.from({
                    line: node.location.end.line,
                    column: node.location.end.column - '\\end{}'.length - node.name.length
                })
            }
        } else if (latexParser.isGroup(node) || latexParser.isInlienMath(node)) {
            return {
                start: LuPos.from({
                    line: node.location.start.line,
                    column: node.location.start.column + 1
                }),
                end: LuPos.from({
                    line: node.location.end.line,
                    column: node.location.end.column - 1
                })
            }
        } else if (latexParser.isLabelCommand(node)) {
            return {
                start: LuPos.from({
                    line: node.location.start.line,
                    column: node.location.start.column + '\\{'.length + node.name.length
                }),
                end: LuPos.from({
                    line: node.location.end.line,
                    column: node.location.end.column - '}'.length
                })
            }
        }
        return
    }

    private findContent(
        lupos: LuPos,
        content: latexParser.Node[],
        sepNodes: latexParser.Node[],
        innerContentRange: ILuRange2 | undefined
    ): IContent | undefined {
        const startSep = Array.from(sepNodes).reverse().find((node) => node.location && lupos.isAfterOrEqual(node.location.end)) as INode | undefined
        const endSep = sepNodes.find((node) => node.location && lupos.isBeforeOrEqual(node.location.start)) as INode | undefined
        const startSepPos =startSep ? LuPos.from(startSep.location.end) : innerContentRange?.start
        const endSepPos = endSep ? LuPos.from(endSep.location.start) : innerContentRange?.end
        if (!startSepPos || !endSepPos) {
            return
        }
        let tmpContent = content.filter((node) => node.location && startSepPos.isBeforeOrEqual(node.location.start))
        tmpContent = tmpContent.filter((node) => node.location && endSepPos.isAfterOrEqual(node.location.end))
        return {
            innerContent: tmpContent,
            innerContentLuRange: {
                start: startSepPos,
                end: endSepPos
            }
        }
    }

    private resultToSelectionRange(
        lupos: LuPos,
        result: ReturnType<typeof latexParser.findNodeAt>
    ): vscode.SelectionRange | undefined {
        if (!result) {
            return
        }
        const curNode = result.node
        const parentNode = result.parent
        const parentSelectionRange = parentNode ? this.resultToSelectionRange(lupos, parentNode) : undefined
        if (!curNode.location) {
            return parentSelectionRange
        }
        let curRange = toVscodeRange(curNode.location)
        let curSelectionRange = new vscode.SelectionRange(curRange, parentSelectionRange)
        let innerContentRange = this.getInnerContentRange(curNode)
        if (innerContentRange) {
            if (innerContentRange.start.isAfter(lupos) || innerContentRange.end.isBefore(lupos)) {
                return curSelectionRange
            }
        }
        if (innerContentRange){
            curRange = toVscodeRange(innerContentRange)
            curSelectionRange = new vscode.SelectionRange(curRange, curSelectionRange)
        }
        if (latexParser.hasContentArray(curNode)) {
            let curContent = curNode.content
            let newContent: IContent | undefined
            if (latexParser.isEnvironment(curNode) && (curNode.name === 'itemize' || curNode.name === 'enumerate')) {
                let itemNodes = curNode.content.filter(latexParser.isCommand)
                itemNodes = itemNodes.filter((node) => node.name === 'item')
                newContent = this.findContent(lupos, curContent, itemNodes, innerContentRange)
                if (newContent) {
                    curContent = newContent.innerContent
                    innerContentRange = {start: newContent.innerContentLuRange.start, end: newContent.innerContentLuRange.end}
                    const newContentRange = toVscodeRange(innerContentRange)
                    curSelectionRange = new vscode.SelectionRange(newContentRange, curSelectionRange)
                }
            }
            const linebreaksNodes = curContent.filter(latexParser.isLinebreak)
            newContent = this.findContent(lupos, curContent, linebreaksNodes, innerContentRange)
            if (newContent) {
                curContent = newContent.innerContent
                innerContentRange = {start: newContent.innerContentLuRange.start, end: newContent.innerContentLuRange.end}
                const newContentRange = toVscodeRange(innerContentRange)
                curSelectionRange = new vscode.SelectionRange(newContentRange, curSelectionRange)
            }
            const alignmentTabNodes = curContent.filter(latexParser.isAlignmentTab)
            newContent = this.findContent(lupos, curContent, alignmentTabNodes, innerContentRange)
            if (newContent) {
                // curContent = newContent.innerContent
                innerContentRange = {start: newContent.innerContentLuRange.start, end: newContent.innerContentLuRange.end}
                const newContentRange = toVscodeRange(innerContentRange)
                curSelectionRange = new vscode.SelectionRange(newContentRange, curSelectionRange)
            }
        }
        return curSelectionRange
    }

}
