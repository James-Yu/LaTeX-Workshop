import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import {latexParser} from 'latex-utensils'
import {stripEnvironments, isNewCommand} from '../../utils/utils'

import type {Extension} from '../../main'
import type {IProvider} from './interface'

export interface ReferenceEntry extends vscode.CompletionItem {
    /**
     *  The file that defines the ref.
     */
    file: string,
    /**
     * The position that defines the ref.
     */
    position: vscode.Position,
    /**
     *  Stores the ref number.
     */
    prevIndex?: {refNumber: string, pageNumber: string}
}

export type ReferenceDocType = {
    documentation: ReferenceEntry['documentation'],
    file: ReferenceEntry['file'],
    position: {line: number, character: number},
    key: string,
    label: ReferenceEntry['label'],
    prevIndex: ReferenceEntry['prevIndex']
}

export class Reference implements IProvider {
    private readonly extension: Extension
    // Here we use an object instead of an array for de-duplication
    private readonly suggestions = new Map<string, ReferenceEntry>()
    private prevIndexObj = new Map<string, {refNumber: string, pageNumber: string}>()
    private readonly envsToSkip = ['tikzpicture']

    constructor(extension: Extension) {
        this.extension = extension
    }

    provideFrom(_type: string, _result: RegExpMatchArray, args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}) {
        return this.provide(args)
    }

    private provide(args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}): vscode.CompletionItem[] {
        // Compile the suggestion object to array
        this.updateAll(args)
        let keys = [...this.suggestions.keys(), ...this.prevIndexObj.keys()]
        keys = Array.from(new Set(keys))
        const items: vscode.CompletionItem[] = []
        for (const key of keys) {
            const sug = this.suggestions.get(key)
            if (sug) {
                const data: ReferenceDocType = {
                    documentation: sug.documentation,
                    file: sug.file,
                    position: {
                        line: sug.position.line,
                        character: sug.position.character
                    },
                    key,
                    label: sug.label,
                    prevIndex: sug.prevIndex
                }
                sug.documentation = JSON.stringify(data)
                items.push(sug)
            } else {
                items.push({label: key})
            }
        }
        return items
    }

    /**
     * Updates the Manager cache for references defined in `file` with `nodes`.
     * If `nodes` is `undefined`, `content` is parsed with regular expressions,
     * and the result is used to update the cache.
     * @param file The path of a LaTeX file.
     * @param nodes AST of a LaTeX file.
     * @param lines The lines of the content. They are used to generate the documentation of completion items.
     * @param content The content of a LaTeX file.
     */
    update(file: string, nodes?: latexParser.Node[], lines?: string[], content?: string) {
        const cache = this.extension.manager.getCachedContent(file)
        if (cache === undefined) {
            return
        }
        if (nodes !== undefined && lines !== undefined) {
            cache.element.reference = this.getRefFromNodeArray(nodes, lines)
        } else if (content !== undefined) {
            cache.element.reference = this.getRefFromContent(content)
        }
    }

    getRef(token: string): ReferenceEntry | undefined {
        this.updateAll()
        return this.suggestions.get(token)
    }

    private updateAll(args?: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}) {
        // Extract cached references
        const refList: string[] = []
        let range: vscode.Range | undefined = undefined
        if (args) {
            const startPos = args.document.lineAt(args.position).text.lastIndexOf('{', args.position.character)
            if (startPos < 0) {
                return
            }
            range = new vscode.Range(args.position.line, startPos + 1, args.position.line, args.position.character)
        }
        this.extension.manager.getIncludedTeX().forEach(cachedFile => {
            const cachedRefs = this.extension.manager.getCachedContent(cachedFile)?.element.reference
            if (cachedRefs === undefined) {
                return
            }
            cachedRefs.forEach(ref => {
                if (ref.range === undefined) {
                    return
                }
                this.suggestions.set(ref.label, {...ref,
                    file: cachedFile,
                    position: ref.range instanceof vscode.Range ? ref.range.start : ref.range.inserting.start,
                    range,
                    prevIndex: this.prevIndexObj.get(ref.label)
                })
                refList.push(ref.label)
            })
        })
        // Remove references that have been deleted
        this.suggestions.forEach((_, key) => {
            if (!refList.includes(key)) {
                this.suggestions.delete(key)
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
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useLabelKeyVal = configuration.get('intellisense.label.keyval')
        const refs: vscode.CompletionItem[] = []
        let label = ''
        if (isNewCommand(node) || latexParser.isDefCommand(node)) {
            // Do not scan labels inside \newcommand & co
            return refs
        }
        if (latexParser.isEnvironment(node) && this.envsToSkip.includes(node.name)) {
            return refs
        }
        if (latexParser.isLabelCommand(node) && node.name === 'label') {
            // \label{some-text}
            label = node.label
        } else if (latexParser.isTextString(node) && node.content === 'label=' && useLabelKeyVal && nextNode !== undefined) {
            // label={some=text}
            label = ((nextNode as latexParser.Group).content[0] as latexParser.TextString).content
        }
        if (label !== '' && (latexParser.isLabelCommand(node) || latexParser.isTextString(node))) {
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
        if (latexParser.hasArgsArray(node)) {
            return this.getRefFromNodeArray(node.args, lines)
        }
        return refs
    }

    private getRefFromContent(content: string): vscode.CompletionItem[] {
        const refReg = /(?:\\label(?:\[[^[\]{}]*\])?|(?:^|[,\s])label=){([^#\\}]*)}/gm
        const refs: vscode.CompletionItem[] = []
        const refList: string[] = []
        content = stripEnvironments(content, this.envsToSkip)
        while (true) {
            const result = refReg.exec(content)
            if (result === null) {
                break
            }
            if (refList.includes(result[1])) {
                continue
            }
            const prevContent = content.substring(0, content.substring(0, result.index).lastIndexOf('\n') - 1)
            const followLength = content.substring(result.index, content.length).split('\n', 4).join('\n').length
            const positionContent = content.substring(0, result.index).split('\n')

            refs.push({
                label: result[1],
                kind: vscode.CompletionItemKind.Reference,
                // One row before, four rows after
                documentation: content.substring(prevContent.lastIndexOf('\n') + 1, result.index + followLength),
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
        this.suggestions.forEach((entry) => {
            entry.prevIndex = undefined
        })
        this.prevIndexObj = new Map<string, {refNumber: string, pageNumber: string}>()
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
            if ( result[1].endsWith('@cref') && this.prevIndexObj.has(result[1].replace('@cref', '')) ) {
                // Drop extra \newlabel entries added by cleveref
                continue
            }
            this.prevIndexObj.set(result[1], {refNumber: result[2], pageNumber: result[3]})
            const ent = this.suggestions.get(result[1])
            if (ent) {
                ent.prevIndex = {refNumber: result[2], pageNumber: result[3]}
            }
        }
    }

}
