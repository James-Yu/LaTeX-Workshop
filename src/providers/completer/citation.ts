import * as vscode from 'vscode'
import * as fs from 'fs'
import {bibtexParser} from 'latex-utensils'
import * as lw from '../../lw'
import * as eventbus from '../../components/eventbus'
import {trimMultiLineString} from '../../utils/utils'
import {computeFilteringRange} from './completerutils'
import type { IProvider, ICompletionItem, IProviderArgs } from '../completion'
import { getLogger } from '../../components/logger'
import { parser } from '../../components/parser'

const logger = getLogger('Intelli', 'Citation')

class Fields extends Map<string, string> {

    get author() {
        return this.get('author')
    }

    get journal() {
        return this.get('journal')
    }

    get journaltitle() {
        return this.get('journaltitle')
    }

    get title() {
        return this.get('title')
    }

    get publisher() {
        return this.get('publisher')
    }

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

export interface CiteSuggestion extends ICompletionItem {
    key: string,
    fields: Fields,
    file: string,
    position: vscode.Position
}

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

export class Citation implements IProvider {
    /**
     * Bib entries in each bib `file`.
     */
    private readonly bibEntries = new Map<string, CiteSuggestion[]>()

    constructor() {
        lw.cacher.bib.onCreate(filePath => this.parseBibFile(filePath))
        lw.cacher.bib.onChange(filePath => this.parseBibFile(filePath))
        lw.cacher.bib.onDelete(filePath => this.removeEntriesInFile(filePath))
    }

    provideFrom(_result: RegExpMatchArray, args: IProviderArgs) {
        return this.provide(args.uri, args.line, args.position)
    }

    private provide(uri: vscode.Uri, line: string, position: vscode.Position): ICompletionItem[] {
        // Compile the suggestion array to vscode completion array
        const configuration = vscode.workspace.getConfiguration('latex-workshop', uri)
        const label = configuration.get('intellisense.citation.label') as string
        const fields = readCitationFormat(configuration)
        const range: vscode.Range | undefined = computeFilteringRange(line, position)
        return this.updateAll(this.getIncludedBibs(lw.manager.rootFile)).map(item => {
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
            item.filterText = item.key + ' ' + item.fields.join(fields, false)
            item.insertText = item.key
            item.range = range
            // We need two spaces to ensure md newline
            item.documentation = new vscode.MarkdownString( '\n' + item.fields.join(fields, true, '  \n') + '\n\n')
            return item
        })
    }

    browser(args?: IProviderArgs) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', args?.uri)
        const label = configuration.get('intellisense.citation.label') as string
        const fields = readCitationFormat(configuration, label)
        void vscode.window.showQuickPick(this.updateAll(this.getIncludedBibs(lw.manager.rootFile)).map(item => {
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
                void editor.edit(edit => edit.replace(new vscode.Range(start, editor.selection.start), selected.description || ''))
                           .then(() => editor.selection = new vscode.Selection(editor.selection.end, editor.selection.end))
            }
        })
    }

    getEntry(key: string): CiteSuggestion | undefined {
        const suggestions = this.updateAll()
        const entry = suggestions.find((elm) => elm.key === key)
        return entry
    }

    getEntryWithDocumentation(key: string, configurationScope: vscode.ConfigurationScope | undefined): CiteSuggestion | undefined {
        const entry = this.getEntry(key)
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
    private getIncludedBibs(file?: string, visitedTeX: string[] = []): string[] {
        if (file === undefined) {
            // Only happens when rootFile is undefined
            return Array.from(this.bibEntries.keys())
        }
        const cache = lw.cacher.get(file)
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
            bibs = Array.from(new Set(bibs.concat(this.getIncludedBibs(child.filePath, visitedTeX))))
        }
        return bibs
    }

    /**
     * Returns aggregated bib entries from `.bib` files and bibitems defined on LaTeX files included in the root file.
     *
     * @param bibFiles The array of the paths of `.bib` files. If `undefined`, the keys of `bibEntries` are used.
     */
    private updateAll(bibFiles?: string[]): CiteSuggestion[] {
        let suggestions: CiteSuggestion[] = []
        // From bib files
        if (bibFiles === undefined) {
            bibFiles = Array.from(this.bibEntries.keys())
        }
        bibFiles.forEach(file => {
            const entry = this.bibEntries.get(file)
            if (entry) {
                suggestions = suggestions.concat(entry)
            }
        })
        // From caches
        lw.cacher.getIncludedTeX().forEach(cachedFile => {
            const cachedBibs = lw.cacher.get(cachedFile)?.elements.bibitem
            if (cachedBibs === undefined) {
                return
            }
            suggestions = suggestions.concat(cachedBibs.map(bib => {
                return {...bib,
                    key: bib.label,
                    detail: bib.detail ? bib.detail : '',
                    file: cachedFile,
                    fields: new Fields()
                }
            }))
        })
        return suggestions
    }

    /**
     * Parses `.bib` file. The results are stored in this instance.
     *
     * @param fileName The path of `.bib` file.
     */
    async parseBibFile(fileName: string) {
        logger.log(`Parsing .bib entries from ${fileName}`)
        const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(fileName))
        if (fs.statSync(fileName).size >= (configuration.get('bibtex.maxFileSize') as number) * 1024 * 1024) {
            logger.log(`Bib file is too large, ignoring it: ${fileName}`)
            this.bibEntries.delete(fileName)
            return
        }
        const newEntry: CiteSuggestion[] = []
        const bibtex = fs.readFileSync(fileName).toString()
        logger.log(`Parse BibTeX AST from ${fileName} .`)
        const ast = await parser.parseBibtex(bibtex)
        ast?.content
            .filter(bibtexParser.isEntry)
            .forEach((entry: bibtexParser.Entry) => {
                if (entry.internalKey === undefined) {
                    return
                }
                const item: CiteSuggestion = {
                    key: entry.internalKey,
                    label: entry.internalKey,
                    file: fileName,
                    position: new vscode.Position(entry.location.start.line - 1, entry.location.start.column - 1),
                    kind: vscode.CompletionItemKind.Reference,
                    fields: new Fields()
                }
                entry.content.forEach(field => {
                    const value = Array.isArray(field.value.content) ?
                        field.value.content.join(' ') : this.deParenthesis(field.value.content)
                    item.fields.set(field.name, value)
                })
                newEntry.push(item)
            })
        this.bibEntries.set(fileName, newEntry)
        logger.log(`Parsed ${newEntry.length} bib entries from ${fileName} .`)
        void lw.structureViewer.computeTreeStructure()
        lw.eventBus.fire(eventbus.FileParsed, fileName)
    }

    removeEntriesInFile(file: string) {
        logger.log(`Remove parsed bib entries for ${file}`)
        this.bibEntries.delete(file)
    }

    /**
     * Updates the Manager cache for bibitems defined in `file`.
     * `content` is parsed with regular expressions,
     * and the result is used to update the cache.
     *
     * @param file The path of a LaTeX file.
     * @param content The content of a LaTeX file.
     */
    update(file: string, content: string) {
        const cache = lw.cacher.get(file)
        if (cache !== undefined) {
            cache.elements.bibitem = this.parseContent(file, content)
        }
    }

    private parseContent(file: string, content: string): CiteSuggestion[] {
        const itemReg = /^(?!%).*\\bibitem(?:\[[^[\]{}]*\])?{([^}]*)}/gm
        const items: CiteSuggestion[] = []
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

    private deParenthesis(str: string): string {
        // Remove wrapping { }
        // Extract the content of \url{}
        return str.replace(/\\url{([^\\{}]+)}/g, '$1').replace(/{+([^\\{}]+)}+/g, '$1')
    }
}
