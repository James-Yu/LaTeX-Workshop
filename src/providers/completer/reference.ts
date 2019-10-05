import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import {latexParser} from 'latex-utensils'

import {Extension} from '../../main'

export interface Suggestion extends vscode.CompletionItem {
    file: string, // The file that defines the ref
    position: vscode.Position, // The position that defines the ref
    prevIndex?: {refNumber: string, pageNumber: string} // Stores the ref number
}

export class Reference {
    extension: Extension
    // Here we use an object instead of an array for de-duplication
    private suggestions: {[id: string]: Suggestion} = {}
    private prevIndexObj: { [k: string]: {refNumber: string, pageNumber: string} } = {}

    constructor(extension: Extension) {
        this.extension = extension
    }

    provide(args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}): vscode.CompletionItem[] {
        // Compile the suggestion object to array
        this.updateAll(args)
        return Object.keys(this.suggestions).map(key => this.suggestions[key])
    }

    update(file: string, nodes?: latexParser.Node[], lines?: string[], content?: string) {
        if (nodes !== undefined && lines !== undefined) {
            this.extension.manager.cachedContent[file].element.reference = this.getRefFromNodeArray(nodes, lines)
        } else if (content !== undefined) {
            this.extension.manager.cachedContent[file].element.reference = this.getRefFromContent(content)
        }
    }

    getRefDict(): {[key: string]: Suggestion} {
        if (this.suggestions) {
            this.updateAll()
        }
        return this.suggestions
    }

    private updateAll(args?: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}) {
        // Extract cached references
        const refList: string[] = []
        this.extension.manager.getIncludedTeX().forEach(cachedFile => {
            const cachedRefs = this.extension.manager.cachedContent[cachedFile].element.reference
            if (cachedRefs === undefined) {
                return
            }
            cachedRefs.forEach(ref => {
                if (ref.range === undefined) {
                    return
                }
                this.suggestions[ref.label] = {...ref,
                    file: cachedFile,
                    position: ref.range.start,
                    range: args ? args.document.getWordRangeAtPosition(args.position, /[-a-zA-Z0-9_:.]+/) : undefined,
                    prevIndex: this.prevIndexObj[ref.label]
                }
                refList.push(ref.label)
            })
        })
        // Remove references that has been deleted
        Object.keys(this.suggestions).forEach(key => {
            if (!refList.includes(key)) {
                delete this.suggestions[key]
            }
        })
    }

    // This function will return all references in a node array, including sub-nodes
    private getRefFromNodeArray(nodes: latexParser.Node[], lines: string[]): vscode.CompletionItem[] {
        let refs: vscode.CompletionItem[] = []
        for (let index = 0; index < nodes.length; ++index) {
            if (index < nodes.length - 1) {
                // Also pass the next node to handle cases like `label={some-text}`
                refs = refs.concat(this.getRefFromNode(nodes[index], lines, nodes[index+1]))
            } else {
                refs = refs.concat(this.getRefFromNode(nodes[index], lines))
            }
        }
        return refs
    }

    // This function will return the reference defined by the node, or all references in `content`
    private getRefFromNode(node: latexParser.Node, lines: string[], nextNode?: latexParser.Node): vscode.CompletionItem[] {
        const refs: vscode.CompletionItem[] = []
        let label = ''
        if (latexParser.isCommand(node) && node.name === 'label') {
            // \label{some-text}
            label = (node.args.filter(latexParser.isGroup)[0].content[0] as latexParser.TextString).content
        } else if (latexParser.isTextString(node) && node.content === 'label=' && nextNode !== undefined) {
            // label={some=text}
            label = ((nextNode as latexParser.Group).content[0] as latexParser.TextString).content
        }
        if (label !== '' && (latexParser.isCommand(node) || latexParser.isTextString(node))) {
            refs.push({
                label,
                kind: vscode.CompletionItemKind.Reference,
                // One row before, four rows after
                documentation: lines.slice(node.location.start.line - 2, node.location.end.line + 4).join('\n'),
                // Here we abuse the definition of range to store the location of the reference definition
                range: new vscode.Range(node.location.start.line - 1, node.location.start.column,
                                        node.location.end.line - 1, node.location.end.column)
            })
            return refs
        }
        if (latexParser.hasContentArray(node)) {
            return this.getRefFromNodeArray(node.content, lines)
        }
        return refs
    }

    private getRefFromContent(content: string) {
        const refReg = /(?:\\label(?:\[[^[\]{}]*\])?|(?:^|[,\s])label=){([^}]*)}/gm
        const refs: vscode.CompletionItem[] = []
        const refList: string[] = []
        const contentNoEmpty = content.split('\n').filter(para => para !== '').join('\n')
        while (true) {
            const result = refReg.exec(content)
            if (result === null) {
                break
            }
            if (refList.includes(result[1])) {
                continue
            }
            const prevContent = contentNoEmpty.substring(0, contentNoEmpty.substring(0, result.index).lastIndexOf('\n') - 1)
            const followLength = contentNoEmpty.substring(result.index, contentNoEmpty.length).split('\n', 4).join('\n').length
            const positionContent = content.substring(0, result.index).split('\n')

            refs.push({
                label: result[1],
                kind: vscode.CompletionItemKind.Reference,
                // One row before, four rows after
                documentation: contentNoEmpty.substring(prevContent.lastIndexOf('\n') + 1, result.index + followLength),
                // Here we abuse the definition of range to store the location of the reference definition
                range: new vscode.Range(positionContent.length - 1, positionContent[positionContent.length - 1].length,
                                        positionContent.length - 1, positionContent[positionContent.length - 1].length)
            })
            refList.push(result[1])
        }
        return refs
    }

    setNumbersFromAuxFile(rootFile: string) {
        const outDir = this.extension.manager.getOutDir(rootFile)
        const rootDir = path.dirname(rootFile)
        const auxFile = path.resolve(rootDir, path.join(outDir, path.basename(rootFile, '.tex') + '.aux'))
        Object.keys(this.suggestions).forEach(key => {
            this.suggestions[key].prevIndex = undefined
        })
        this.prevIndexObj = {}
        if (!fs.existsSync(auxFile)) {
            return
        }
        const newLabelReg = /^\\newlabel\{(.*?)\}\{\{(.*?)\}\{(.*?)\}/gm
        const auxContent = fs.readFileSync(auxFile, {encoding: 'utf8'})
        while (true) {
            const result = newLabelReg.exec(auxContent)
            if (result === null) {
                break
            }
            this.prevIndexObj[result[1]] = {refNumber: result[2], pageNumber: result[3]}
            if (result[1] in this.suggestions) {
                this.suggestions[result[1]].prevIndex = {refNumber: result[2], pageNumber: result[3]}
            }
        }
    }

}
