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

    constructor(extension: Extension) {
        this.extension = extension
    }

    provide(args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}): vscode.CompletionItem[] {
        // Compile the suggestion object to array
        this.updateAll(args)
        return Object.keys(this.suggestions).map(key => this.suggestions[key])
    }

    update(file: string, nodes: latexParser.Node[], lines: string[]) {
        this.extension.manager.cachedContent[file].element.reference = this.getRefFromNodeArray(nodes, lines)
    }

    getRefDict(): {[key: string]: Suggestion} {
        if (this.suggestions) {
            this.updateAll()
        }
        return this.suggestions
    }

    private updateAll(args?: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}) {
        // Update the dirty content in active text editor
        if (vscode.window.activeTextEditor) {
            const content = vscode.window.activeTextEditor.document.getText()
            const refs = this.getRefFromNodeArray(latexParser.parse(content).content, content.split('\n'))
            this.extension.manager.cachedContent[vscode.window.activeTextEditor.document.uri.fsPath].element.reference = refs
        }
        // Extract cached references
        const refList: string[] = []
        Object.keys(this.extension.manager.cachedContent).forEach(cachedFile => {
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
                }
                refList.push(ref.label)
            })
        })
        // Remove references that has been deleted
        Object.keys(this.suggestions).forEach(key => {
            if (refList.indexOf(key) <= -1) {
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

    setNumbersFromAuxFile(rootFile: string) {
        const outDir = this.extension.manager.getOutDir(rootFile)
        const rootDir = path.dirname(rootFile)
        const auxFile = path.resolve(rootDir, path.join(outDir, path.basename(rootFile, '.tex') + '.aux'))
        Object.keys(this.suggestions).forEach(key => {
            this.suggestions[key].prevIndex = undefined
        })
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
            if (result[1] in this.suggestions) {
                this.suggestions[result[1]].prevIndex = {refNumber: result[2], pageNumber: result[3]}
            }
        }
    }

}
