import * as vscode from 'vscode'
import * as fs from 'fs'
import { bibtexParser } from 'latex-utensils'
import { lw } from '../../lw'
import type { CitationField, CitationItem, CompletionArgs, CompletionItem, CompletionProvider } from '../../types'
import type { FileCache } from '../../types'

import { trimMultiLineString } from '../../utils/utils'
import { computeFilteringRange } from './completerutils'

const logger = lw.log('Intelli', 'Citation')

export const provider: CompletionProvider = { from }
export const citation = {
    parse,
    browser,
    getItem,
    parseBibFile
}

const data = {
    bibEntries: new Map<string, CitationItem[]>()
}

lw.watcher.bib.onCreate(filePath => parseBibFile(filePath))
lw.watcher.bib.onChange(filePath => parseBibFile(filePath))
lw.watcher.bib.onDelete(filePath => removeEntriesInFile(filePath))

/**
 * Read the value `intellisense.citation.format`
 * @param configuration workspace configuration
 * @param excludedField A field to exclude from the list of citation fields. Primary usage is to not include `citation.label` twice.
 */
function readCitationFormat(configuration: vscode.WorkspaceConfiguration, excludedField?: string): string[] {
    const fields = (configuration.get('intellisense.citation.format') as string[]).map(f => { return f.toLowerCase() })
    if (excludedField) {
        return fields.filter(f => f !== excludedField.toLowerCase())
    }
    return fields
}

export const bibTools = {
    expandField,
    deParenthesis,
    parseAbbrevations
}

function expandField(abbreviations: {[key: string]: string}, value: bibtexParser.FieldValue): string {
    if (value.kind === 'concat') {
        const args = value.content as bibtexParser.FieldValue[]
        return args.map(arg => expandField(abbreviations, arg)).join(' ')
    }
    if (bibtexParser.isAbbreviationValue(value)) {
        if (value.content in abbreviations) {
            return abbreviations[value.content]
        }
        return ''
    }
    return value.content
}

function deParenthesis(str: string): string {
    // Remove wrapping { }
    // Extract the content of \url{}
    return str.replace(/\\url{([^\\{}]+)}/g, '$1').replace(/{+([^\\{}]+)}+/g, '$1')
}

function parseAbbrevations(ast: bibtexParser.BibtexAst) {
    const abbreviations: {[key: string]: string} = {}
    ast.content.filter(bibtexParser.isStringEntry).forEach((entry: bibtexParser.StringEntry) => {
        // @string{string1 = "Proceedings of the "}
        // @string{string2 = string1 # "Foo"}
        if (typeof entry.value.content === 'string') {
            abbreviations[entry.abbreviation] = entry.value.content
        } else {
            abbreviations[entry.abbreviation] =
                (entry.value.content as (bibtexParser.AbbreviationValue | bibtexParser.TextStringValue)[]).map(subEntry => {
                    if (bibtexParser.isAbbreviationValue(subEntry)) {
                        return abbreviations[subEntry.content] ?? `undefined @string "${subEntry.content}"`
                    } else {
                        return subEntry.content
                    }
                }).join('')
        }
    })

    return abbreviations
}


function from(_result: RegExpMatchArray, args: CompletionArgs) {
    return provide(args.uri, args.line, args.position)
}

function provide(uri: vscode.Uri, line: string, position: vscode.Position): CompletionItem[] {
    // Compile the suggestion array to vscode completion array
    const configuration = vscode.workspace.getConfiguration('latex-workshop', uri)
    const label = configuration.get('intellisense.citation.label') as string
    const fields = readCitationFormat(configuration)
    const range: vscode.Range | undefined = computeFilteringRange(line, position)
    return updateAll(getIncludedBibs(lw.root.file.path)).map(item => {
        // Compile the completion item label
        switch(label) {
            case 'bibtex key':
            default:
                item.label = item.key
                break
            case 'title':
                if (item.fields.title) {
                    item.label = item.fields.title
                }
                break
            case 'authors':
                if (item.fields.author) {
                    item.label = item.fields.author
                }
                break
        }
        item.filterText = item.key + ' ' + item.fields.title + ' ' + item.fields.join(fields.filter(field => field !== 'title'), false)
        item.insertText = item.key
        item.range = range
        // We need two spaces to ensure md newline
        item.documentation = new vscode.MarkdownString( '\n' + item.fields.join(fields, true, '  \n') + '\n\n')
        return item
    })
}

function browser(args?: CompletionArgs) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', args?.uri)
    const label = configuration.get('intellisense.citation.label') as string
    const fields = readCitationFormat(configuration, label)
    void vscode.window.showQuickPick(updateAll(getIncludedBibs(lw.root.file.path)).map(item => {
        return {
            label: item.fields.title ? trimMultiLineString(item.fields.title) : '',
            description: item.key,
            detail: item.fields.join(fields, true, ', ')
        }
    }), {
        placeHolder: 'Press ENTER to insert citation key at cursor',
        matchOnDetail: true,
        matchOnDescription: true,
        ignoreFocusOut: true
    }).then(selected => {
        if (!selected) {
            return
        }
        if (vscode.window.activeTextEditor) {
            const editor = vscode.window.activeTextEditor
            const content = editor.document.getText(new vscode.Range(new vscode.Position(0, 0), editor.selection.start))
            let start = editor.selection.start
            if (content.lastIndexOf('\\cite') > content.lastIndexOf('}')) {
                const curlyStart = content.lastIndexOf('{') + 1
                const commaStart = content.lastIndexOf(',') + 1
                start = editor.document.positionAt(curlyStart > commaStart ? curlyStart : commaStart)
            }
            void editor.edit(edit => edit.replace(new vscode.Range(start, editor.selection.end), selected.description || ''))
                        .then(() => editor.selection = new vscode.Selection(editor.selection.end, editor.selection.end))
        }
    })
}

function getRawItem(key: string): CitationItem | undefined {
    const suggestions = updateAll()
    const entry = suggestions.find((elm) => elm.key === key)
    return entry
}

function getItem(key: string, configurationScope?: vscode.ConfigurationScope): CitationItem | undefined {
    const entry = getRawItem(key)
    if (entry && !(entry.detail || entry.documentation)) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', configurationScope)
        const fields = readCitationFormat(configuration)
        // We need two spaces to ensure md newline
        entry.documentation = new vscode.MarkdownString( '\n' + entry.fields.join(fields, true, '  \n') + '\n\n')
    }
    return entry
}

/**
 * Returns the array of the paths of `.bib` files referenced from `file`.
 *
 * @param file The path of a LaTeX file. If `undefined`, the keys of `bibEntries` are used.
 * @param visitedTeX Internal use only.
 */
function getIncludedBibs(file?: string, visitedTeX: string[] = []): string[] {
    if (file === undefined) {
        // Only happens when rootFile is undefined
        return Array.from(data.bibEntries.keys())
    }
    const cache = lw.cache.get(file)
    if (cache === undefined) {
        return []
    }
    let bibs = Array.from(cache.bibfiles)
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
 * Returns aggregated bib entries from `.bib` files and bibitems defined on LaTeX files included in the root file.
 *
 * @param bibFiles The array of the paths of `.bib` files. If `undefined`, the keys of `bibEntries` are used.
 */
function updateAll(bibFiles?: string[]): CitationItem[] {
    let suggestions: CitationItem[] = []
    // From bib files
    if (bibFiles === undefined) {
        bibFiles = Array.from(data.bibEntries.keys())
    }
    bibFiles.forEach(file => {
        const entry = data.bibEntries.get(file)
        if (entry) {
            suggestions = suggestions.concat(entry)
        }
    })
    // From caches
    lw.cache.getIncludedTeX().forEach(cachedFile => {
        const cachedBibs = lw.cache.get(cachedFile)?.elements.bibitem
        if (cachedBibs === undefined) {
            return
        }
        suggestions = suggestions.concat(cachedBibs)
    })
    return suggestions
}

/**
 * Parses `.bib` file. The results are stored in this instance.
 *
 * @param fileName The path of `.bib` file.
 */
async function parseBibFile(fileName: string) {
    logger.log(`Parsing .bib entries from ${fileName}`)
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(fileName))
    if (fs.statSync(fileName).size >= (configuration.get('bibtex.maxFileSize') as number) * 1024 * 1024) {
        logger.log(`Bib file is too large, ignoring it: ${fileName}`)
        data.bibEntries.delete(fileName)
        return
    }
    const newEntry: CitationItem[] = []
    const bibtex = fs.readFileSync(fileName).toString()
    logger.log(`Parse BibTeX AST from ${fileName} .`)
    const ast = await lw.parser.parse.bib(bibtex)
    if (ast === undefined) {
        logger.log(`Parsed 0 bib entries from ${fileName}.`)
        lw.event.fire(lw.event.FileParsed, fileName)
        return
    }
    const abbreviations = parseAbbrevations(ast)
    ast.content
        .filter(bibtexParser.isEntry)
        .forEach((entry: bibtexParser.Entry) => {
            if (entry.internalKey === undefined) {
                return
            }
            const item: CitationItem = {
                key: entry.internalKey,
                label: entry.internalKey,
                file: fileName,
                position: new vscode.Position(entry.location.start.line - 1, entry.location.start.column - 1),
                kind: vscode.CompletionItemKind.Reference,
                fields: new Fields()
            }
            entry.content.forEach(field => {
                const value = deParenthesis(expandField(abbreviations, field.value))
                item.fields.set(field.name, value)
            })
            newEntry.push(item)
        })
    data.bibEntries.set(fileName, newEntry)
    logger.log(`Parsed ${newEntry.length} bib entries from ${fileName} .`)
    void lw.outline.reconstruct()
    lw.event.fire(lw.event.FileParsed, fileName)
}

function removeEntriesInFile(file: string) {
    logger.log(`Remove parsed bib entries for ${file}`)
    data.bibEntries.delete(file)
}

/**
 * Updates the Manager cache for bibitems with Cache.
 * Cache `content` is parsed with regular expressions,
 * and the result is used to update the cache bibitem element.
 */
function parse(cache: FileCache) {
    cache.elements.bibitem = parseContent(cache.filePath, cache.content)
}

function parseContent(file: string, content: string): CitationItem[] {
    const itemReg = /^(?!%).*\\bibitem(?:\[[^[\]{}]*\])?{([^}]*)}/gm
    const items: CitationItem[] = []
    while (true) {
        const result = itemReg.exec(content)
        if (result === null) {
            break
        }
        const postContent = content.substring(result.index + result[0].length, content.indexOf('\n', result.index)).trim()
        const positionContent = content.substring(0, result.index).split('\n')
        items.push({
            key: result[1],
            label: result[1],
            file,
            kind: vscode.CompletionItemKind.Reference,
            detail: `${postContent}\n...`,
            fields: new Fields(),
            position: new vscode.Position(positionContent.length - 1, positionContent[positionContent.length - 1].length)
        })
    }
    return items
}

class Fields extends Map<string, string> implements CitationField {
    get author() { return this.get('author') }
    get journal() { return this.get('journal') }
    get journaltitle() { return this.get('journaltitle') }
    get title() { return this.get('title') }
    get publisher() { return this.get('publisher') }

    /**
     * Concatenate the values of the fields listed in `selectedFields`
     * @param selectedFields an array of field names
     * @param prefixWithKeys if true, every field is prefixed by 'Fieldname: '
     * @param joinString the string to use for joining the fields
     * @returns a string
     */
    join(selectedFields: string[], prefixWithKeys: boolean, joinString: string = ' '): string {
        const s: string[] = []
        for (const key of this.keys()) {
            if (selectedFields.includes(key)) {
                const value = this.get(key) as string
                if (prefixWithKeys) {
                    s.push(key.charAt(0).toUpperCase() + key.slice(1) + ': ' + value)
                } else {
                    s.push(value)
                }
            }
        }
        return s.join(joinString)
    }
}
