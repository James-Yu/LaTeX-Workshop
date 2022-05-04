import * as vscode from 'vscode'
import {latexParser} from 'latex-utensils'

import type {Extension} from '../../main'
import type {IProvider, ILwCompletionItem} from './interface'

enum GlossaryType {
    glossary,
    acronym
}

interface GlossaryEntry {
    label: string | undefined,
    description: string | undefined
}

export interface Suggestion extends ILwCompletionItem {
    type: GlossaryType
}

export class Glossary implements IProvider {
    private readonly extension: Extension
    // use object for deduplication
    private readonly glossaries = new Map<string, Suggestion>()
    private readonly acronyms = new Map<string, Suggestion>()

    constructor(extension: Extension) {
        this.extension = extension
    }

    provideFrom(result: RegExpMatchArray) {
        return this.provide(result)
    }

    private provide(result: RegExpMatchArray): vscode.CompletionItem[] {
        this.updateAll()
        let suggestions: Map<string, Suggestion>

        if (result[1] && result[1].match(/^ac/i)) {
            suggestions = this.acronyms
        } else {
            suggestions = new Map( [...this.acronyms, ...this.glossaries] )
        }

        // Compile the suggestion object to array
        const items = Array.from(suggestions.values())
        return items
    }

    private getGlossaryFromNodeArray(nodes: latexParser.Node[]): Suggestion[] {
        const glossaries: Suggestion[] = []
        let entry: GlossaryEntry
        let type: GlossaryType | undefined

        nodes.forEach(node => {
            if (latexParser.isCommand(node) && node.args.length > 0) {
                switch (node.name) {
                    case 'newglossaryentry':
                        type = GlossaryType.glossary
                        entry = this.getShortNodeDescription(node)
                        break
                    case 'provideglossaryentry':
                        type = GlossaryType.glossary
                        entry = this.getShortNodeDescription(node)
                        break
                    case 'longnewglossaryentry':
                        type = GlossaryType.glossary
                        entry = this.getLongNodeLabelDescription(node)
                        break
                    case 'longprovideglossaryentry':
                        type = GlossaryType.glossary
                        entry = this.getLongNodeLabelDescription(node)
                        break
                    case 'newacronym':
                        type = GlossaryType.acronym
                        entry = this.getLongNodeLabelDescription(node)
                        break
                    default:
                        break
                }
                if (type !== undefined && entry.description !== undefined && entry.label !== undefined) {
                    glossaries.push({
                        type,
                        label: entry.label,
                        detail: entry.description,
                        kind: vscode.CompletionItemKind.Reference
                    })
                }
            }
        })
        return glossaries
    }

    /**
     * Parse the description from "long nodes" such as \newacronym and \longnewglossaryentry
     *
     * Spec: \newacronym[〈key-val list〉]{〈label〉}{〈abbrv〉}{〈description〉}
     *
     * Fairly straightforward, a \newacronym command takes the form
     *     \newacronym[optional parameters]{lw}{LW}{LaTeX Workshop}
     *
     *
     * @param node the \newacronym node from the parser
     * @return the pair (label, description)
     */
    private getLongNodeLabelDescription(node: latexParser.Command): GlossaryEntry {
        let description: string | undefined = undefined
        let label: string | undefined = undefined

        const hasOptionalArg: boolean = latexParser.isOptionalArg(node.args[0])
        const labelNode = hasOptionalArg ? node.args[1] : node.args[0]
        const descriptionNode = hasOptionalArg ? node.args[3] : node.args[2]
        if (latexParser.isGroup(descriptionNode)) {
            description = latexParser.stringify(descriptionNode).slice(1, -1)
        }

        if (latexParser.isGroup(labelNode)) {
            label = latexParser.stringify(labelNode).slice(1, -1)
        }

        return {label, description}
    }

    /**
     * Parse the description from "short nodes" like \newglossaryentry
     *
     * Spec: \newglossaryentry{〈label〉}{〈key=value list〉}
     *
     * Example glossary entries:
     *     \newglossaryentry{lw}{name={LaTeX Workshop}, description={What this extension is}}
     *     \newglossaryentry{vscode}{name=VSCode, description=Editor}
     *
     * Note: descriptions can be single words or a {group of words}
     *
     * @param node the \newglossaryentry node from the parser
     * @returns the value of the description field
     */
    private getShortNodeDescription(node: latexParser.Command): GlossaryEntry {
        let result: RegExpExecArray | null
        let description: string | undefined = undefined
        let label: string | undefined = undefined
        let lastNodeWasDescription = false

        // Get label
        if (latexParser.isGroup(node.args[0])) {
            label = latexParser.stringify(node.args[0]).slice(1, -1)
        }

        // Get description
        if (latexParser.isGroup(node.args[1])) {
            for (const subNode of node.args[1].content) {
                if (latexParser.isTextString(subNode)) {
                    // Description is of the form description=single_word
                    if ((result = /description=(.*)/.exec(subNode.content)) !== null) {
                        if (result[1] !== '') {
                            description = result[1]
                            break
                        }
                        lastNodeWasDescription = true
                    }
                } else if (lastNodeWasDescription && latexParser.isGroup(subNode)) {
                    // otherwise we have description={group of words}
                    description = latexParser.stringify(subNode).slice(1, -1)
                    break
                }
            }
        }

        return {label, description}
    }

    private updateAll() {
        // Extract cached references
        const glossaryList: string[] = []

        this.extension.manager.getIncludedTeX().forEach(cachedFile => {
            const cachedGlossaries = this.extension.manager.getCachedContent(cachedFile)?.element.glossary
            if (cachedGlossaries === undefined) {
                return
            }
            cachedGlossaries.forEach(ref => {
                if (ref.type === GlossaryType.glossary) {
                    this.glossaries.set(ref.label, ref)
                } else {
                    this.acronyms.set(ref.label, ref)
                }
                glossaryList.push(ref.label)
            })
        })

        // Remove references that has been deleted
        this.glossaries.forEach((_, key) => {
            if (!glossaryList.includes(key)) {
                this.glossaries.delete(key)
            }
        })
        this.acronyms.forEach((_, key) => {
            if (!glossaryList.includes(key)) {
                this.acronyms.delete(key)
            }
        })
    }

    /**
     * Update the Manager cache for references defined in `file` with `nodes`.
     * If `nodes` is `undefined`, `content` is parsed with regular expressions,
     * and the result is used to update the cache.
     * @param file The path of a LaTeX file.
     * @param nodes AST of a LaTeX file.
     * @param content The content of a LaTeX file.
     */
    update(file: string, nodes?: latexParser.Node[], content?: string) {
        const cache = this.extension.manager.getCachedContent(file)
        if (cache === undefined) {
            return
        }
        if (nodes !== undefined) {
            cache.element.glossary = this.getGlossaryFromNodeArray(nodes)
        } else if (content !== undefined) {
            cache.element.glossary = this.getGlossaryFromContent(content)
        }
    }

    getGlossaryFromContent(content: string): Suggestion[] {
        const glossaries: Suggestion[] = []
        const glossaryList: string[] = []

        // We assume that the label is always result[1] and use getDescription(result) for the description
        const regexes: {
            [key: string]: {
                regex: RegExp,
                type: GlossaryType,
                getDescription: (result: RegExpMatchArray) => string
            }
        } = {
            'glossary': {
                regex: /\\(?:provide|new)glossaryentry{([^{}]*)}\s*{(?:(?!description).)*description=(?:([^{},]*)|{([^{}]*))[,}]/gms,
                type: GlossaryType.glossary,
                getDescription: (result) => { return result[2] ? result[2] : result[3] }
            },
            'longGlossary': {
                regex: /\\long(?:provide|new)glossaryentry{([^{}]*)}\s*{[^{}]*}\s*{([^{}]*)}/gms,
                type: GlossaryType.glossary,
                getDescription: (result) => { return result[2] }
            },
            'acronym': {
                regex: /\\newacronym(?:\[[^[\]]*\])?{([^{}]*)}{[^{}]*}{([^{}]*)}/gm,
                type: GlossaryType.acronym,
                getDescription: (result) => { return result[2] }
            }
        }

        for(const key in regexes){
            while(true) {
                const result = regexes[key].regex.exec(content)
                if (result === null) {
                    break
                }
                if (glossaryList.includes(result[1])) {
                    continue
                }
                glossaries.push({
                    type: regexes[key].type,
                    label: result[1],
                    detail: regexes[key].getDescription(result),
                    kind: vscode.CompletionItemKind.Reference
                })
            }
        }

        return glossaries
    }
}
