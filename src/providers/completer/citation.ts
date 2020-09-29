import * as vscode from 'vscode'
import * as fs from 'fs'
import {bibtexParser} from 'latex-utensils'

import {Extension} from '../../main'
import {IProvider} from './interface'

export interface Suggestion extends vscode.CompletionItem {
    key: string,
    fields: {[key: string]: string},
    file: string,
    position: vscode.Position
}

export class Citation implements IProvider {
    private readonly extension: Extension
    /**
     * Bib entries in each bib `file`.
     */
    private readonly bibEntries: {[file: string]: Suggestion[]} = {}

    constructor(extension: Extension) {
        this.extension = extension
    }

    provideFrom(_type: string, _result: RegExpMatchArray, args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}) {
        return this.provide(args)
    }

    private provide(args?: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}): vscode.CompletionItem[] {
        // Compile the suggestion array to vscode completion array
        const label = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.citation.label') as string
        let range: vscode.Range | undefined = undefined
        if (args) {
            const line = args.document.lineAt(args.position).text
            const curlyStart = line.lastIndexOf('{', args.position.character)
            const commaStart = line.lastIndexOf(',', args.position.character)
            const startPos = Math.max(curlyStart, commaStart)
            if (startPos >= 0) {
                range = new vscode.Range(args.position.line, startPos + 1, args.position.line, args.position.character)
            }
        }
        return this.updateAll(this.getIncludedBibs(this.extension.manager.rootFile)).map(item => {
            // Compile the completion item label
            switch(label) {
                case 'bibtex key':
                default:
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
            item.filterText = `${item.key} ${item.fields.author} ${item.fields.title} ${item.fields.journal}`
            item.insertText = item.key
            item.range = range
            return item
        })
    }

    browser(_args?: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}) {
        vscode.window.showQuickPick(this.updateAll(this.getIncludedBibs(this.extension.manager.rootFile)).map(item => {
            return {
                label: item.fields.title ? item.fields.title : '',
                description: `${item.key}`,
                detail: `Authors: ${item.fields.author ? item.fields.author : 'Unknown'}, publication: ${item.fields.journal ? item.fields.journal : (item.fields.journaltitle ? item.fields.journaltitle : (item.fields.publisher ? item.fields.publisher : 'Unknown'))}`
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
                editor.edit(edit => edit.replace(new vscode.Range(start, editor.selection.start), selected.description || ''))
                      .then(() => editor.selection = new vscode.Selection(editor.selection.end, editor.selection.end))
            }
        })
    }

    getEntryDict(): {[key: string]: Suggestion} {
        const suggestions = this.updateAll()
        const entries: {[key: string]: Suggestion} = {}
        suggestions.forEach(entry => entries[entry.key] = entry)
        return entries
    }

    /**
     * Returns the array of the paths of `.bib` files referenced from `file`.
     *
     * @param file The path of a LaTeX file. If `undefined`, the keys of `bibEntries` are used.
     * @param visitedTeX Internal use only.
     */
    private getIncludedBibs(file?: string, visitedTeX: string[] = []) {
        if (file === undefined) {
            // Only happens when rootFile is undefined
            return Object.keys(this.bibEntries)
        }
        if (!(file in this.extension.manager.cachedContent)) {
            return []
        }
        let bibs = this.extension.manager.cachedContent[file].bibs
        visitedTeX.push(file)
        for (const child of this.extension.manager.cachedContent[file].children) {
            if (visitedTeX.includes(child.file)) {
                // Already included
                continue
            }
            bibs = Array.from(new Set(bibs.concat(this.getIncludedBibs(child.file, visitedTeX))))
        }
        return bibs
    }

    /**
     * Returns aggregated bib entries from `.bib` files and bibitems defined on LaTeX files included in the root file.
     *
     * @param bibFiles The array of the paths of `.bib` files. If `undefined`, the keys of `bibEntries` are used.
     */
    private updateAll(bibFiles?: string[]): Suggestion[] {
        let suggestions: Suggestion[] = []
        // Update the dirty content in active text editor, get bibitems
        // *** This is done after stop typing for 5 seconds. Defined in `onDidChangeTextDocument` ***
        // if (vscode.window.activeTextEditor) {
        //     const file = vscode.window.activeTextEditor.document.uri.fsPath
        //     const cache = this.extension.manager.cachedContent[file]
        //     if (cache !== undefined) {
        //         const bibitems = this.parseContent(vscode.window.activeTextEditor.document.getText(), file)
        //         cache.element.bibitem = bibitems
        //     }
        // }
        // From bib files
        if (bibFiles === undefined) {
            bibFiles = Object.keys(this.bibEntries)
        }
        bibFiles.forEach(file => {
            suggestions = suggestions.concat(this.bibEntries[file])
        })
        // From caches
        this.extension.manager.getIncludedTeX().forEach(cachedFile => {
            const cachedBibs = this.extension.manager.cachedContent[cachedFile].element.bibitem
            if (cachedBibs === undefined) {
                return
            }
            suggestions = suggestions.concat(cachedBibs.map(bib => {
                return {...bib,
                    key: bib.label,
                    detail: bib.detail ? bib.detail : '',
                    file: cachedFile,
                    fields: {}
                }
            }))
        })
        return suggestions
    }

    /**
     * Parses `.bib` file. The results are stored in this instance.
     *
     * @param file The path of `.bib` file.
     */
    async parseBibFile(file: string) {
        this.extension.logger.addLogMessage(`Parsing .bib entries from ${file}`)
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (fs.statSync(file).size >= (configuration.get('intellisense.citation.maxfilesizeMB') as number) * 1024 * 1024) {
            this.extension.logger.addLogMessage(`Bib file is too large, ignoring it: ${file}`)
            if (file in this.bibEntries) {
                delete this.bibEntries[file]
            }
            return
        }
        this.bibEntries[file] = []
        const fields: string[] = (configuration.get('intellisense.citation.format') as string[]).map(f => { return f.toLowerCase() })
        const bibtex = fs.readFileSync(file).toString()
        const ast = await this.extension.pegParser.parseBibtex(bibtex).catch((e) => {
            if (bibtexParser.isSyntaxError(e)) {
                const line = e.location.start.line
                this.extension.logger.addLogMessage(`Error parsing BibTeX: line ${line} in ${file}.`)
            }
            throw e
        })
        ast.content
            .filter(bibtexParser.isEntry)
            .forEach((entry: bibtexParser.Entry) => {
                if (entry.internalKey === undefined) {
                    return
                }
                const item: Suggestion = {
                    key: entry.internalKey,
                    label: entry.internalKey,
                    file,
                    position: new vscode.Position(entry.location.start.line - 1, entry.location.start.column - 1),
                    kind: vscode.CompletionItemKind.Reference,
                    fields: {}
                }
                let doc: string = ''
                entry.content.forEach(field => {
                    const value = Array.isArray(field.value.content) ?
                        field.value.content.join(' ') : this.deParenthesis(field.value.content)
                    item.fields[field.name] = value
                    if (fields.includes(field.name.toLowerCase())) {
                        doc += `${field.name.charAt(0).toUpperCase() + field.name.slice(1)}: ${value}\n`
                    }
                })
                // We need two spaces to ensure md newline
                item.documentation = new vscode.MarkdownString( '\n' + doc.replace(/\n/g, '  \n') + '\n\n' )
                this.bibEntries[file].push(item)
            })
        this.extension.logger.addLogMessage(`Parsed ${this.bibEntries[file].length} bib entries from ${file}.`)
    }

    removeEntriesInFile(file: string) {
        this.extension.logger.addLogMessage(`Remove parsed bib entries for ${file}`)
        delete this.bibEntries[file]
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
        this.extension.manager.cachedContent[file].element.bibitem =
            this.parseContent(file, content)
    }

    private parseContent(file: string, content: string): Suggestion[] {
        const itemReg = /^(?!%).*\\bibitem(?:\[[^[\]{}]*\])?{([^}]*)}/gm
        const items: Suggestion[] = []
        while (true) {
            const result = itemReg.exec(content)
            if (result === null) {
                break
            }
            if (!(result[1] in items)) {
                const postContent = content.substring(result.index + result[0].length, content.indexOf('\n', result.index)).trim()
                const positionContent = content.substring(0, result.index).split('\n')
                items.push({
                    key: result[1],
                    label: result[1],
                    file,
                    kind: vscode.CompletionItemKind.Reference,
                    detail: `${postContent}\n...`,
                    fields: {},
                    position: new vscode.Position(positionContent.length - 1, positionContent[positionContent.length - 1].length)
                })
            }
        }
        return items
    }

    private deParenthesis(str: string) {
        // Remove wrapping { }
        // Extract the content of \url{}
        return str.replace(/\\url{([^\\{}]+)}/g, '$1').replace(/{+([^\\{}]+)}+/g, '$1')
    }
}
