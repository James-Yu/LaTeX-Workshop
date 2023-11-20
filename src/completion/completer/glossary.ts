import * as vscode from 'vscode'
import type * as Ast from '@unified-latex/unified-latex-types'
import { lw } from '../../lw'
import type { ICompletionItem, IProvider } from '../latex'
import { Cache } from '../../core/cache'
import { argContentToStr } from '../../utils/parser'
import { getLongestBalancedString } from '../../utils/utils'

enum GlossaryType {
    glossary,
    acronym
}

interface GlossaryEntry {
    label: string | undefined,
    description: string | undefined
}

export interface GlossarySuggestion extends ICompletionItem {
    type: GlossaryType,
    filePath: string,
    position: vscode.Position
}

export class Glossary implements IProvider {
    // use object for deduplication
    private readonly glossaries = new Map<string, GlossarySuggestion>()
    private readonly acronyms = new Map<string, GlossarySuggestion>()

    provideFrom(result: RegExpMatchArray) {
        return this.provide(result)
    }

    private provide(result: RegExpMatchArray): vscode.CompletionItem[] {
        this.updateAll()
        let suggestions: Map<string, GlossarySuggestion>

        if (result[1] && result[1].match(/^ac/i)) {
            suggestions = this.acronyms
        } else {
            suggestions = new Map( [...this.acronyms, ...this.glossaries] )
        }

        // Compile the suggestion object to array
        const items = Array.from(suggestions.values())
        return items
    }

    getEntry(token: string): GlossarySuggestion | undefined {
        this.updateAll()
        return this.glossaries.get(token) || this.acronyms.get(token)
    }

    private updateAll() {
        // Extract cached references
        const glossaryList: string[] = []

        lw.cacher.getIncludedTeX().forEach(cachedFile => {
            const cachedGlossaries = lw.cacher.get(cachedFile)?.elements.glossary
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

    parse(cache: Cache) {
        if (cache.ast !== undefined) {
            cache.elements.glossary = this.parseAst(cache.ast, cache.filePath)
        } else {
            cache.elements.glossary = this.parseContent(cache.content, cache.filePath)
        }
    }

    private parseAst(node: Ast.Node, filePath: string): GlossarySuggestion[] {
        let glos: GlossarySuggestion[] = []
        let entry: GlossaryEntry = { label: '', description: '' }
        let type: GlossaryType | undefined

        if (node.type === 'macro' && ['newglossaryentry', 'provideglossaryentry'].includes(node.content)) {
            type = GlossaryType.glossary
            let description = argContentToStr(node.args?.[1]?.content || [], true)
            const index = description.indexOf('description=')
            if (index >= 0) {
                description = description.slice(index + 12)
                if (description.charAt(0) === '{') {
                    description = getLongestBalancedString(description) ?? ''
                } else {
                    description = description.split(',')[0] ?? ''
                }
            } else {
                description = ''
            }
            entry = {
                label: argContentToStr(node.args?.[0]?.content || []),
                description
            }
        } else if (node.type === 'macro' && ['longnewglossaryentry', 'longprovideglossaryentry', 'newacronym', 'newabbreviation', 'newabbr'].includes(node.content)) {
            if (['longnewglossaryentry', 'longprovideglossaryentry'].includes(node.content)) {
                type = GlossaryType.glossary
            } else {
                type = GlossaryType.acronym
            }
            entry = {
                label: argContentToStr(node.args?.[1]?.content || []),
                description: argContentToStr(node.args?.[3]?.content || []),
            }
        }
        if (type !== undefined && entry.label && entry.description && node.position !== undefined) {
            glos.push({
                type,
                filePath,
                position: new vscode.Position(node.position.start.line - 1, node.position.start.column - 1),
                label: entry.label,
                detail: entry.description,
                kind: vscode.CompletionItemKind.Reference
            })
        }

        const parseContent = (content: Ast.Node[]) => {
            for (const subNode of content) {
                glos = [...glos, ...this.parseAst(subNode, filePath)]
            }
        }
        if (node.type === 'macro' && node.args) {
            for (const arg of node.args) {
                parseContent(arg.content)
            }
        } else if ('content' in node && typeof node.content !== 'string') {
            parseContent(node.content)
        }

        return glos
    }

    private parseContent(content: string, filePath: string): GlossarySuggestion[] {
        const glossaries: GlossarySuggestion[] = []
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
                const positionContent = content.substring(0, result.index).split('\n')
                if (glossaryList.includes(result[1])) {
                    continue
                }
                glossaries.push({
                    type: regexes[key].type,
                    filePath,
                    position: new vscode.Position(positionContent.length - 1, positionContent[positionContent.length - 1].length),
                    label: result[1],
                    detail: regexes[key].getDescription(result),
                    kind: vscode.CompletionItemKind.Reference
                })
            }
        }

        return glossaries
    }
}
