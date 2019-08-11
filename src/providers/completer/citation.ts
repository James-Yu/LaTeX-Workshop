import * as vscode from 'vscode'
import * as fs from 'fs'
import {bibtexParser} from 'latex-utensils'

import {Extension} from '../../main'

export interface Suggestion extends vscode.CompletionItem {
    fields: {[key: string]: string},
    position: vscode.Position
}

export class Citation {
    extension: Extension

    private bibEntries: {[file: string]: Suggestion[]} = {}

    // suggestions: vscode.CompletionItem[]
    // citationInBib: { [id: string]: {citations: CitationRecord[], rootFiles: string[] }} = {}
    // citationData: { [id: string]: {item: {}, text: string, position: vscode.Position, file: string} } = {}
    // theBibliographyData: {[id: string]: {item: {citation: string, text: string, position: vscode.Position}, text: string, file: string, rootFile: string | undefined}} = {}
    // refreshTimer: number

    constructor(extension: Extension) {
        this.extension = extension
    }

    provide(args?: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}): vscode.CompletionItem[] {
        let suggestions: Suggestion[] = []
        // From bib files
        Object.keys(this.bibEntries).forEach(file => {
            suggestions = suggestions.concat(this.bibEntries[file])
        })

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        // First, we deal with citation items from bib files
        const items: CitationRecord[] = []
        Object.keys(this.citationInBib).forEach(bibPath => {
            if (this.citationInBib[bibPath].rootFiles.length === 0 ||
                rootFile !== undefined && this.citationInBib[bibPath].rootFiles.indexOf(rootFile) > -1) {
                this.citationInBib[bibPath].citations.forEach(item => items.push(item))
            }
        })

        this.suggestions = items.map(item => {
            const citation = new vscode.CompletionItem(item.key, vscode.CompletionItemKind.Reference)
            citation.detail = item.title
            switch (configuration.get('intellisense.citation.label') as string) {
                case 'bibtex key':
                default:
                    citation.label = item.key
                    break
                case 'title':
                    if (item.title) {
                        citation.label = item.title as string
                        citation.detail = undefined
                    } else {
                        citation.label = item.key
                    }
                    break
                case 'authors':
                    if (item.author) {
                        citation.label = item.author as string
                        citation.detail = undefined
                    } else {
                        citation.label = item.key
                    }
                    break
            }

            citation.filterText = `${item.key} ${item.author} ${item.title} ${item.journal}`
            citation.insertText = item.key
            citation.documentation = Object.keys(item)
                .filter(key => (key !== 'key'))
                .map(key => `${key}: ${item[key]}`)
                .join('\n')
            if (args) {
                citation.range = args.document.getWordRangeAtPosition(args.position, /[-a-zA-Z0-9_:.]+/)
            }
            return citation
        })

        // Second, we deal with the items from thebibliography
        // const suggestions = {}
        Object.keys(this.theBibliographyData).forEach(key => {
            if (this.theBibliographyData[key].rootFile !== rootFile) {
               return
            }
            suggestions[key] = this.theBibliographyData[key].item
        })
        if (vscode.window.activeTextEditor) {
            const thebibliographyItems = this.getTheBibliographyItems(vscode.window.activeTextEditor.document.getText())
            Object.keys(thebibliographyItems).forEach(key => {
                if (!(key in suggestions)) {
                    suggestions[key] = thebibliographyItems[key]
                }
            })
        }
        Object.keys(suggestions).forEach(key => {
            const item = suggestions[key]
            const citation = new vscode.CompletionItem(item.citation, vscode.CompletionItemKind.Reference)
            citation.detail = item.text
            if (args) {
                citation.range = args.document.getWordRangeAtPosition(args.position, /[-a-zA-Z0-9_:.]+/)
            }
            this.suggestions.push(citation)
        })
        return this.suggestions
    }

    browser(args?: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}) {
        this.provide(args)
        const items: CitationRecord[] = []
        Object.keys(this.citationInBib).forEach(bibPath => {
            this.citationInBib[bibPath].citations.forEach(item => items.push(item))
        })
        const pickItems: vscode.QuickPickItem[] = items.map(item => {
            return {
                label: item.title ? item.title as string : '',
                description: `${item.key}`,
                detail: `Authors: ${item.author ? item.author : 'Unknown'}, publication: ${item.journal ? item.journal : (item.journaltitle ? item.journaltitle : (item.publisher ? item.publisher : 'Unknown'))}`
            }
        })
        vscode.window.showQuickPick(pickItems, {
            placeHolder: 'Press ENTER to insert citation key at cursor',
            matchOnDetail: true,
            matchOnDescription: true
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

    parseBibFile(file: string) {
        this.extension.logger.addLogMessage(`Parsing .bib entries from ${file}`)
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (fs.statSync(file).size >= (configuration.get('intellisense.citation.maxfilesizeMB') as number) * 1024 * 1024) {
            this.extension.logger.addLogMessage(`${file} is too large, ignoring it.`)
            if (file in this.bibEntries) {
                delete this.bibEntries[file]
            }
            return
        }
        this.bibEntries[file] = []
        bibtexParser.parse(fs.readFileSync(file).toString()).content
            .filter(entry => bibtexParser.isEntry(entry))
            .forEach((entry: bibtexParser.Entry) => {
                if (entry.internalKey === undefined) {
                    return
                }
                const item: Suggestion = {
                    label: entry.internalKey,
                    kind: vscode.CompletionItemKind.Reference,
                    detail: '',
                    fields: {}
                }
                entry.content.forEach(field => {
                    const value = Array.isArray(field.value.content) ?
                        field.value.content.join(' ') : field.value.content
                    item.fields[field.name] = value
                    item.detail += `${field.name.charAt(0).toUpperCase() + field.name.slice(1)}: ${value}\n`
                })
                this.bibEntries[file].push(item)
            })
        this.extension.logger.addLogMessage(`Parsed ${this.bibEntries[file].length} bib entries from ${file}.`)
    }

    removeEntriesInFile(file: string) {
        this.extension.logger.addLogMessage(`Remove parsed bib entries for ${file}`)
        delete this.bibEntries[file]
    }

    getTheBibliographyTeX(filePath: string) {
        const bibitems = this.getTheBibliographyItems(fs.readFileSync(filePath, 'utf-8'))
        Object.keys(this.theBibliographyData).forEach((key) => {
            if (this.theBibliographyData[key].file === filePath) {
                delete this.theBibliographyData[key]
            }
        })
        Object.keys(bibitems).forEach((key) => {
            this.theBibliographyData[key] = {
                item: bibitems[key],
                text: bibitems[key].text,
                file: filePath,
                rootFile: this.extension.manager.rootFile
            }
        })
    }

    getTheBibliographyItems(content: string): Suggestion[] {
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
                    label: result[1],
                    kind: vscode.CompletionItemKind.Reference,
                    detail: `${postContent}\n...`,
                    fields: {},
                    position: new vscode.Position(positionContent.length - 1, positionContent[positionContent.length - 1].length)
                })
            }
        }
        return items
    }
}
