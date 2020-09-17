import { latexParser } from 'latex-utensils'
import { Extension } from 'src/main'
import * as vscode from 'vscode'
import {IProvider} from './interface'

export class Glossary implements IProvider {
    private readonly extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    provideFrom() {
        return this.provide()
    }

    private provide(): vscode.CompletionItem[] {
        return []
    }

    private getRefFromNodeArray(nodes: latexParser.Node[]): vscode.CompletionItem[] {
        const refs: vscode.CompletionItem[] = []
        let label = ''

        nodes.forEach(node => {
            if (latexParser.isCommand(node) && node.args.length > 0) {
                if (node.name === 'newglossaryentry' && node.args[0].kind === 'arg.group' && node.args[0].content[0].kind === 'text.string') {
                    label = node.args[0].content[0].content
                } else if (node.name === 'newacronym' && node.args[0].kind === 'arg.group' && node.args[0].content[0].kind === 'text.string') {
                    label = node.args[0].content[0].content
                }
            }

            if (label !== '') {
                refs.push({
                    label,
                    kind: vscode.CompletionItemKind.Reference
                })
            }
        })
        return refs
    }

    /**
     * Updates the Manager cache for references defined in `file` with `nodes`.
     * If `nodes` is `undefined`, `content` is parsed with regular expressions,
     * and the result is used to update the cache.
     * @param file The path of a LaTeX file.
     * @param nodes AST of a LaTeX file.
     * @param content The content of a LaTeX file.
     */
    update(file: string, nodes?: latexParser.Node[], content?: string) {
        if (nodes !== undefined) {
            this.extension.manager.cachedContent[file].element.glossary = this.getRefFromNodeArray(nodes)
        } else if (content !== undefined) {
            this.extension.manager.cachedContent[file].element.glossary = [] // TODO: implement regex parser
        }
    }
}
