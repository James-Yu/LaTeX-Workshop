import * as vscode from 'vscode'
import type * as Ast from '@unified-latex/unified-latex-types'
import { bibtexParser } from 'latex-utensils'
import { lw } from '../../lw'
import { GlossaryType } from '../../types'
import type { CompletionProvider, FileCache, GlossaryItem } from '../../types'
import { argContentToStr } from '../../utils/parser'
import { getLongestBalancedString } from '../../utils/utils'
import { bibTools } from './citation'

const logger = lw.log('Intelli', 'Glossary')
export const provider: CompletionProvider = { from }
export const glossary = {
    parse,
    getItem,
    parseBibFile
}

const data = {
    // The keys are the labels of the glossary items.
    glossaries: new Map<string, GlossaryItem>(),
    acronyms: new Map<string, GlossaryItem>(),
    // The keys are the paths of the `.bib` files.
    bibEntries: new Map<string, GlossaryItem[]>()
}

lw.watcher.bib.onCreate(uri => parseBibFile(uri.fsPath))
lw.watcher.bib.onChange(uri => parseBibFile(uri.fsPath))
lw.watcher.bib.onDelete(uri => removeEntriesInFile(uri.fsPath))

function from(result: RegExpMatchArray): vscode.CompletionItem[] {
    updateAll(getIncludedBibs(lw.root.file.path))
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
    updateAll(getIncludedBibs(lw.root.file.path))
    return data.glossaries.get(token) || data.acronyms.get(token)
}

/**
 * Returns the array of the paths of glossary `.bib` files referenced from `file`.
 *
 * @param file The path of a LaTeX file.
 * @param visitedTeX Internal use only.
 */
function getIncludedBibs(file?: string, visitedTeX: string[] = []): string[] {
    if (file === undefined) {
        return []
    }
    const cache = lw.cache.get(file)
    if (cache === undefined) {
        return []
    }
    let bibs = Array.from(cache.glossarybibfiles)
    visitedTeX.push(file)
    for (const child of cache.children) {
        if (visitedTeX.includes(child.filePath)) {
            // Already included
            continue
        }
        bibs = Array.from(new Set(bibs.concat(getIncludedBibs(child.filePath, visitedTeX))))
    }
    return bibs
}

/**
 * Returns aggregated glossary entries from `.bib` files and glossary items defined on LaTeX files included in the root file.
 *
 * @param bibFiles The array of the paths of `.bib` files. If `undefined`, the keys of `bibEntries` are used.
 */
function updateAll(bibFiles: string[]) {
    // Extract cached references
    const glossaryList: string[] = []

    // From bib files
    bibFiles.forEach(file => {
        const entries = data.bibEntries.get(file)
        entries?.forEach(entry => {
            if (entry.type === GlossaryType.glossary) {
                data.glossaries.set(entry.label, entry)
            } else {
                data.acronyms.set(entry.label, entry)
            }
            glossaryList.push(entry.label)
        })
    })

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

    // Remove references that have been deleted
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

/**
 * Parse a glossary `.bib` file. The results are stored in this instance.
 *
 * @param fileName The path of `.bib` file.
 */
async function parseBibFile(fileName: string) {
    logger.log(`Parsing glossary .bib entries from ${fileName}`)
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(fileName))
    if ((await lw.external.stat(vscode.Uri.file(fileName))).size >= (configuration.get('bibtex.maxFileSize') as number) * 1024 * 1024) {
        logger.log(`Bib file is too large, ignoring it: ${fileName}`)
        data.bibEntries.delete(fileName)
        return
    }
    const newEntry: GlossaryItem[] = []
    const bibtex = await lw.file.read(fileName)
    logger.log(`Parse BibTeX AST from ${fileName} .`)
    const ast = await lw.parser.parse.bib(vscode.Uri.file(fileName), bibtex ?? '')
    if (ast === undefined) {
        logger.log(`Parsed 0 bib entries from ${fileName}.`)
        lw.event.fire(lw.event.FileParsed, fileName)
        return
    }
    const abbreviations = bibTools.parseAbbrevations(ast)
    ast.content
        .filter(bibtexParser.isEntry)
        .forEach((entry: bibtexParser.Entry) => {
            if (entry.internalKey === undefined) {
                return
            }
            let type: GlossaryType
            if ( ['entry'].includes(entry.entryType) ) {
                type = GlossaryType.glossary
            } else {
                type = GlossaryType.acronym
            }
            const name = bibTools.expandField(abbreviations, entry.content.find(field => field.name === 'name')?.value)
            const description = bibTools.expandField(abbreviations, entry.content.find(field => field.name === 'description')?.value)
            const item: GlossaryItem = {
                type,
                label: entry.internalKey,
                filePath: fileName,
                position: new vscode.Position(entry.location.start.line - 1, entry.location.start.column - 1),
                kind: vscode.CompletionItemKind.Reference,
                detail: name + ': ' + description
            }
            newEntry.push(item)
        })
    data.bibEntries.set(fileName, newEntry)
    logger.log(`Parsed ${newEntry.length} glossary bib entries from ${fileName} .`)
    void lw.outline.reconstruct()
    lw.event.fire(lw.event.FileParsed, fileName)
}

function removeEntriesInFile(file: string) {
    logger.log(`Remove parsed bib entries for ${file}`)
    data.bibEntries.delete(file)
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
    let label: string = ''
    let description: string = ''
    let type: GlossaryType | undefined

    if (node.type === 'macro' && ['newglossaryentry', 'provideglossaryentry'].includes(node.content)) {
        type = GlossaryType.glossary
        description = argContentToStr(node.args?.[1]?.content || [], true)
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
        label = argContentToStr(node.args?.[0]?.content || [])
    } else if (node.type === 'macro' && ['longnewglossaryentry', 'longprovideglossaryentry', 'newacronym', 'newabbreviation', 'newabbr'].includes(node.content)) {
        if (['longnewglossaryentry', 'longprovideglossaryentry'].includes(node.content)) {
            type = GlossaryType.glossary
        } else {
            type = GlossaryType.acronym
        }
        label = argContentToStr(node.args?.[1]?.content || [])
        description = argContentToStr(node.args?.[3]?.content || [])
    }
    if (type !== undefined && label && description && node.position !== undefined) {
        glos.push({
            type,
            filePath,
            position: new vscode.Position(node.position.start.line - 1, node.position.start.column - 1),
            label,
            detail: description,
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
