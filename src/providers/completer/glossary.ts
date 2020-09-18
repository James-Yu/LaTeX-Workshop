import { latexParser } from 'latex-utensils'
import { Extension } from 'src/main'
import * as vscode from 'vscode'
import {IProvider} from './interface'

export interface Suggestion extends vscode.CompletionItem {
    type: 'glossary' | 'acronym'
}

export class Glossary implements IProvider {
    private readonly extension: Extension
    // use object for deduplication
    private readonly glossaries: {[id: string]: Suggestion} = {}
    private readonly acronyms: {[id: string]: Suggestion} = {}

    constructor(extension: Extension) {
        this.extension = extension
    }

    provideFrom(_type: string, result: RegExpMatchArray) {
        return this.provide(result)
    }

    private provide(result: RegExpMatchArray): vscode.CompletionItem[] {
        this.updateAll()
        let suggestions

        if (result[1] && result[1].match(/^[Gg]/)) {
            suggestions = this.glossaries
        } else {
            suggestions = this.acronyms
        }

        // Compile the suggestion object to array
        let keys = Object.keys(suggestions)
        keys = Array.from(new Set(keys))
        const items: vscode.CompletionItem[] = []
        for (const key of keys) {
            const gls = suggestions[key]
            if (gls) {
                items.push(gls)
            } else {
                items.push({label: key})
            }
        }
        return items
    }

    private getRefFromNodeArray(nodes: latexParser.Node[]): Suggestion[] {
        const refs: Suggestion[] = []

        nodes.forEach(node => {
            if (latexParser.isCommand(node) && node.args.length > 0) {
                if (node.name === 'newglossaryentry' && node.args[0].kind === 'arg.group' && node.args[0].content[0].kind === 'text.string') {
                    refs.push({
                        type: 'glossary',
                        label: node.args[0].content[0].content
                    })
                } else if (node.name === 'newacronym' && node.args[0].kind === 'arg.group' && node.args[0].content[0].kind === 'text.string') {
                    refs.push({
                        type: 'acronym',
                        label: node.args[0].content[0].content
                    })
                }
            }
        })
        return refs
    }

    private updateAll() {
        // Extract cached references
        const refList: string[] = []

        this.extension.manager.getIncludedTeX().forEach(cachedFile => {
            const cachedRefs = this.extension.manager.cachedContent[cachedFile].element.glossary
            if (cachedRefs === undefined) {
                return
            }
            cachedRefs.forEach(ref => {
                if (ref.type === 'glossary') {
                    this.glossaries[ref.label] = ref
                } else {
                    this.acronyms[ref.label] = ref
                }
                refList.push(ref.label)
            })
        })

        // Remove references that has been deleted
        Object.keys(this.glossaries).forEach(key => {
            if (!refList.includes(key)) {
                delete this.glossaries[key]
            }
        })
        Object.keys(this.acronyms).forEach(key => {
            if (!refList.includes(key)) {
                delete this.acronyms[key]
            }
        })
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
