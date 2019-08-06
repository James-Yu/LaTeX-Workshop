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
    suggestions: {[id: string]: Suggestion} = {}

    constructor(extension: Extension) {
        this.extension = extension
    }

    provide(args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}): vscode.CompletionItem[] {
        // Update the dirty content in active text editor
        if (vscode.window.activeTextEditor) {
            const content = vscode.window.activeTextEditor.document.getText()
            const refs = this.getReferenceFromAST(latexParser.parse(content), content.split('\n'))
            this.extension.manager.cachedContent[vscode.window.activeTextEditor.document.uri.fsPath].element.reference = refs
        }
        // Extract cached references
        const refList: string[] = []
        Object.keys(this.extension.manager.cachedContent).forEach(cachedFile => {
            const cachedRefs = this.extension.manager.cachedContent[cachedFile].element.reference
            if (cachedRefs === undefined) {
                return
            }
            for (const ref of cachedRefs) {
                if (ref.range === undefined) {
                    continue
                }
                this.suggestions[ref.label] = {...ref,
                    file: cachedFile,
                    position: ref.range.start,
                    range: args.document.getWordRangeAtPosition(args.position, /[-a-zA-Z0-9_:.]+/),
                }
                refList.push(ref.label)
            }
        })
        // Remove references that has been deleted
        Object.keys(this.suggestions).forEach(key => {
            if (refList.indexOf(key) <= -1) {
                delete this.suggestions[key]
            }
        })
        // Compile the suggestion object to array
        return Object.keys(this.suggestions).map(key => this.suggestions[key])
    }

    update(file: string, content: string) {
        const refs = this.getReferenceFromAST(latexParser.parse(content), content.split('\n'))
        this.extension.manager.cachedContent[file].element.reference = refs
    }

    private getReferenceFromAST(ast: latexParser.LatexAst | latexParser.Node, lines: string[], nextNode?: latexParser.Node): vscode.CompletionItem[] {
        let refs: vscode.CompletionItem[] = []
        let label = ''
        if (ast.kind === 'command' && ast.name === 'label') {
            // \label{some-text}
            label = (ast.args.filter(arg => arg.kind === 'arg.group')[0].content[0] as latexParser.TextString).content
        } else if (ast.kind === 'text.string' && ast.content === 'label=' && nextNode !== undefined) {
            // label={some=text}
            label = ((nextNode as latexParser.Group).content[0] as latexParser.TextString).content
        }
        if (label !== '' && (ast.kind === 'command' || ast.kind === 'text.string')) {
            refs.push({
                label,
                kind: vscode.CompletionItemKind.Reference,
                documentation: lines.slice(ast.location.start.line - 2, ast.location.end.line + 4).join('\n'),
                range: new vscode.Range(ast.location.start.line - 1, ast.location.start.column,
                                        ast.location.end.line - 1, ast.location.end.column)
            })
            // Here we abuse the definition of range to store the location of the reference definition
            return refs
        }
        if (ast.hasOwnProperty('content') && Array.isArray(ast['content'])) {
            // AstRoot | AstPreamble | non-label nodes -> loop in all its contents
            const nodes = ast['content'] as latexParser.Node[]
            for (let index = 0; index < nodes.length; ++index) {
                if (index < nodes.length - 1) {
                    // Also pass the next node to handle cases like `label={some-text}`
                    refs = refs.concat(this.getReferenceFromAST(nodes[index], lines, nodes[index+1]))
                } else {
                    refs = refs.concat(this.getReferenceFromAST(nodes[index], lines))
                }
            }
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
