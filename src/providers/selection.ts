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
    content: latexParser.Node[],
    contentLuRange: ILuRange2
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

    private getInnerContentLuRange(node: latexParser.Node): ILuRange2 | undefined {
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
        } else if (latexParser.isMathDelimiters(node)) {
            return {
                start: LuPos.from({
                    line: node.location.start.line,
                    column: node.location.start.column + node.left.length + node.lcommand.length
                }),
                end: LuPos.from({
                    line: node.location.end.line,
                    column: node.location.end.column - node.right.length - node.rcommand.length
                })
            }
        }
        return
    }

    private findInnerContentIncludingPos(
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
            content: tmpContent,
            contentLuRange: {
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
        const curRange = toVscodeRange(curNode.location)
        let curSelectionRange = new vscode.SelectionRange(curRange, parentSelectionRange)
        let innerContentLuRange = this.getInnerContentLuRange(curNode)
        if (innerContentLuRange) {
            if (innerContentLuRange.start.isAfter(lupos) || innerContentLuRange.end.isBefore(lupos)) {
                return curSelectionRange
            }
            const newCurRange = toVscodeRange(innerContentLuRange)
            curSelectionRange = new vscode.SelectionRange(newCurRange, curSelectionRange)
        }
        if (latexParser.hasContentArray(curNode)) {
            let innerContent = curNode.content
            let newInnerContent: IContent | undefined
            if (latexParser.isEnvironment(curNode) && (curNode.name === 'itemize' || curNode.name === 'enumerate')) {
                let itemNodes = curNode.content.filter(latexParser.isCommand)
                itemNodes = itemNodes.filter((node) => node.name === 'item')
                newInnerContent = this.findInnerContentIncludingPos(lupos, innerContent, itemNodes, innerContentLuRange)
                if (newInnerContent) {
                    innerContent = newInnerContent.content
                    innerContentLuRange = newInnerContent.contentLuRange
                    const newContentRange = toVscodeRange(innerContentLuRange)
                    curSelectionRange = new vscode.SelectionRange(newContentRange, curSelectionRange)
                }
            }
            const linebreaksNodes = innerContent.filter(latexParser.isLinebreak)
            newInnerContent = this.findInnerContentIncludingPos(lupos, innerContent, linebreaksNodes, innerContentLuRange)
            if (newInnerContent) {
                innerContent = newInnerContent.content
                innerContentLuRange = newInnerContent.contentLuRange
                const newContentRange = toVscodeRange(innerContentLuRange)
                curSelectionRange = new vscode.SelectionRange(newContentRange, curSelectionRange)
            }
            const alignmentTabNodes = innerContent.filter(latexParser.isAlignmentTab)
            newInnerContent = this.findInnerContentIncludingPos(lupos, innerContent, alignmentTabNodes, innerContentLuRange)
            if (newInnerContent) {
                // curContent = newContent.innerContent
                innerContentLuRange = newInnerContent.contentLuRange
                const newContentRange = toVscodeRange(innerContentLuRange)
                curSelectionRange = new vscode.SelectionRange(newContentRange, curSelectionRange)
            }
        }
        return curSelectionRange
    }

}
