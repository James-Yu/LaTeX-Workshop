import * as vscode from 'vscode'
import type * as Ast from '@unified-latex/unified-latex-types'
import { lw } from '../../lw'
import { GlossaryType } from '../../types'
import type { CompletionProvider, FileCache, GlossaryItem } from '../../types'
import { argContentToStr } from '../../utils/parser'
import { getLongestBalancedString } from '../../utils/utils'

export const provider: CompletionProvider = { from }
export const glossary = {
    parse,
    getItem
}

const data = {
    glossaries: new Map<string, GlossaryItem>(),
    acronyms: new Map<string, GlossaryItem>()
}

interface GlossaryEntry {
    label: string | undefined,
    description: string | undefined
}

function from(result: RegExpMatchArray): vscode.CompletionItem[] {
    updateAll()
    let suggestions: Map<string, GlossaryItem>

    if (result[1] && result[1].match(/^ac/i)) {
        suggestions = data.acronyms
    } else {
        suggestions = new Map( [...data.acronyms, ...data.glossaries] )
    }

    // Compile the suggestion object to array
    const items = Array.from(suggestions.values())
    return items
}

function getItem(token: string): GlossaryItem | undefined {
    updateAll()
    return data.glossaries.get(token) || data.acronyms.get(token)
}

function updateAll() {
    // Extract cached references
    const glossaryList: string[] = []

    lw.cache.getIncludedTeX().forEach(cachedFile => {
        const cachedGlossaries = lw.cache.get(cachedFile)?.elements.glossary
        if (cachedGlossaries === undefined) {
            return
        }
        cachedGlossaries.forEach(ref => {
            if (ref.type === GlossaryType.glossary) {
                data.glossaries.set(ref.label, ref)
            } else {
                data.acronyms.set(ref.label, ref)
            }
            glossaryList.push(ref.label)
        })
    })

    // Remove references that has been deleted
    data.glossaries.forEach((_, key) => {
        if (!glossaryList.includes(key)) {
            data.glossaries.delete(key)
        }
    })
    data.acronyms.forEach((_, key) => {
        if (!glossaryList.includes(key)) {
            data.acronyms.delete(key)
        }
    })
}

function parse(cache: FileCache) {
    if (cache.ast !== undefined) {
        cache.elements.glossary = parseAst(cache.ast, cache.filePath)
    } else {
        cache.elements.glossary = parseContent(cache.content, cache.filePath)
    }
}

function parseAst(node: Ast.Node, filePath: string): GlossaryItem[] {
    let glos: GlossaryItem[] = []
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

    const parseContentNodes = (content: Ast.Node[]) => {
        for (const subNode of content) {
            glos = [...glos, ...parseAst(subNode, filePath)]
        }
    }
    if (node.type === 'macro' && node.args) {
        for (const arg of node.args) {
            parseContentNodes(arg.content)
        }
    } else if ('content' in node && typeof node.content !== 'string') {
        parseContentNodes(node.content)
    }

    return glos
}

function parseContent(content: string, filePath: string): GlossaryItem[] {
    const glossaries: GlossaryItem[] = []
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
