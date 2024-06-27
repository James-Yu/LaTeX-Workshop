import * as vscode from 'vscode'
import * as fs from 'fs'
import { lw } from '../lw'
import { getBibtexFormatConfig } from '../lint/bibtex-formatter/utils'
import { getLongestBalancedString } from '../utils/utils'

const logger = lw.log('Intelli', 'Bib')

type DataBibtexJsonType = typeof import('../../data/bibtex-entries.json')
type DataBibtexOptionalJsonType = typeof import('../../data/bibtex-optional-entries.json')

export class BibProvider implements vscode.CompletionItemProvider {
    private scope: vscode.ConfigurationScope | undefined = undefined
    private readonly entryItems: vscode.CompletionItem[] = []
    private readonly optFieldItems = Object.create(null) as { [key: string]: vscode.CompletionItem[] }
    private bibtexFormatConfig: ReturnType<typeof getBibtexFormatConfig>

    constructor() {
        if (vscode.window.activeTextEditor) {
            this.scope = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)
        } else {
            this.scope = vscode.workspace.workspaceFolders?.[0]
        }
        this.bibtexFormatConfig = getBibtexFormatConfig(this.scope)
        this.initialize()
        lw.onConfigChange(['bibtex-format', 'bibtex-entries', 'bibtex-fields', 'intellisense'], () => {
            this.bibtexFormatConfig = getBibtexFormatConfig(this.scope)
            this.initialize()
        }, this.scope)
        vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor | undefined) => {
            if (e && lw.file.hasBibLangId(e.document.languageId)) {
                const wsFolder = vscode.workspace.getWorkspaceFolder(e.document.uri)
                if (wsFolder !== this.scope) {
                    this.scope = wsFolder
                    this.bibtexFormatConfig = getBibtexFormatConfig(this.scope)
                    this.initialize()
                }
            }
        })
    }

    private initialize() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', this.scope)
        const citationBackend = configuration.get('intellisense.citation.backend')
        let entriesFile: string = ''
        let optEntriesFile: string = ''
        let entriesReplacements: {[key: string]: string[]} = {}
        switch (citationBackend) {
            case 'bibtex':
                entriesFile = `${lw.extensionRoot}/data/bibtex-entries.json`
                optEntriesFile = `${lw.extensionRoot}/data/bibtex-optional-entries.json`
                entriesReplacements = configuration.get('intellisense.bibtexJSON.replace') as {[key: string]: string[]}
                break
            case 'biblatex':
                entriesFile = `${lw.extensionRoot}/data/biblatex-entries.json`
                optEntriesFile = `${lw.extensionRoot}/data/biblatex-optional-entries.json`
                entriesReplacements = configuration.get('intellisense.biblatexJSON.replace') as {[key: string]: string[]}
                break
            default:
                logger.log(`Unknown citation backend: ${citationBackend}`)
                return
        }
        try {
            this.loadDefaultItems(entriesFile, optEntriesFile, entriesReplacements)
        } catch (err) {
            logger.log(`Error reading data: ${err}.`)
        }
    }

    private loadDefaultItems(entriesFile: string, optEntriesFile: string, entriesReplacements: {[key: string]: string[]}) {
        const entries: { [key: string]: string[] } = JSON.parse(fs.readFileSync(entriesFile, {encoding: 'utf8'})) as DataBibtexJsonType
        const optFields: { [key: string]: string[] } = JSON.parse(fs.readFileSync(optEntriesFile, {encoding: 'utf8'})) as DataBibtexOptionalJsonType

        // const maxLengths: {[key: string]: number} = this.computeMaxLengths(entries, optFields)
        const entriesList: string[] = []
        this.entryItems.length = 0
        Object.keys(entries).forEach(entry => {
            if (entry in entriesList) {
                return
            }
            if (entry in entriesReplacements) {
                this.entryItems.push(this.entryToCompletion(entry, entriesReplacements[entry], this.bibtexFormatConfig))
            } else {
                this.entryItems.push(this.entryToCompletion(entry, entries[entry], this.bibtexFormatConfig))
            }
            entriesList.push(entry)
        })
        Object.entries(optFields).forEach(([field, item]) => {
            this.optFieldItems[field] = this.fieldsToCompletion(item, this.bibtexFormatConfig)
        })
    }

    // private computeMaxLengths(entries: {[key: string]: string[]}, optFields: {[key: string]: string[]}): {[key: string]: number} {
    //     const maxLengths = Object.create(null) as { [key: string]: number }
    //     Object.keys(entries).forEach(key => {
    //         let maxFieldLength = 0
    //         entries[key].forEach(field => {
    //             maxFieldLength = Math.max(maxFieldLength, field.length)
    //         })
    //         if (key in optFields) {
    //             optFields[key].forEach(field => {
    //                 maxFieldLength = Math.max(maxFieldLength, field.length)
    //             })
    //         }
    //         maxLengths[key] = maxFieldLength
    //     })
    //     return maxLengths
    // }

    private entryToCompletion(itemName: string, itemFields: string[], config: ReturnType<typeof getBibtexFormatConfig>): vscode.CompletionItem {
        const suggestion: vscode.CompletionItem = new vscode.CompletionItem(itemName, vscode.CompletionItemKind.Snippet)
        suggestion.detail = itemName
        suggestion.documentation = `Add a @${itemName} entry`
        let count: number = 1

        // The following code is copied from BibtexUtils.bibtexFormat
        // Find the longest field name in entry
        let s: string = itemName + '{${0:key}'
        itemFields.forEach(field => {
            s += ',\n' + config.tab + (config.case === 'lowercase' ? field.toLowerCase() : field.toUpperCase())
            s += ' = '
            s += config.left + `$${count}` + config.right
            count++
        })
        s += '\n}'
        suggestion.insertText = new vscode.SnippetString(s)
        return suggestion
    }

    private fieldsToCompletion(fields: string[], config: ReturnType<typeof getBibtexFormatConfig>): vscode.CompletionItem[] {
        const suggestions: vscode.CompletionItem[] = []
        fields.forEach(field => {
            const suggestion: vscode.CompletionItem = new vscode.CompletionItem(field, vscode.CompletionItemKind.Snippet)
            suggestion.detail = field
            suggestion.documentation = `Add ${field} = ${config.left}${config.right}`
            suggestion.insertText = new vscode.SnippetString(`${field} = ${config.left}$1${config.right},`)
            suggestions.push(suggestion)
        })
        return suggestions
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] | undefined {
        const currentLine = document.lineAt(position.line).text
        if (currentLine.match(/@[a-zA-Z]*$/)) {
            // Complete an entry name
            return this.entryItems
        } else if (currentLine.match(/^\s*[a-zA-Z]*$/)) {
            let offset = 0
            while (offset < 100) {
                const prevLine = position.line - offset > 0 ? document.lineAt(position.line - offset - 1).text : ''
                if (prevLine.match(/(?:@[a-zA-Z]{)|(?:["}0-9],\s*$)/)) {
                    // Add optional fields
                    const optFields = this.provideOptFields(document, position)
                    return optFields
                }
                offset += 1
            }
            return
        }
        const result = currentLine.substring(0, position.character).match(/^\s*([a-zA-Z]*)\s*=\s*([{|"]?)$/)
        // If not found, or right before the starting { / "
        if (!result || result[2] === '' && ['{', '"'].includes(currentLine.substring(position.character)[0])) {
            return
        }
        // Exclude the current editing field from searched
        const lines = document.getText().split('\n')
        lines[position.line] = lines[position.line].replace(RegExp(`${result[1]}\\s*=\\s*`, 'g'), '')
        return findFieldValues(result[1], lines.join('\n'))
            .reduce((unique, value) => {
                if (!unique.includes(value)) {
                    unique.push(value)
                }
                return unique
            }, [] as string[])
            .map(entry => new vscode.CompletionItem(entry, vscode.CompletionItemKind.Text))
    }

    private provideOptFields(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const pattern = /^\s*@([a-zA-Z]+)\{(?:[^,]*,)?\s$/m
        const content = document.getText(new vscode.Range(new vscode.Position(0, 0), position))
        const reversedContent = content.replace(/(\r\n)|\r/g, '\n').split('\n').reverse().join('\n')
        const match = reversedContent.match(pattern)
        if (match) {
            const entryType = match[1].toLowerCase()
            if (entryType in this.optFieldItems) {
                return this.optFieldItems[entryType]
            }
        }
        return []
    }
}

function findFieldValues(field: string, text: string) {
    const re = RegExp(`(${field}\\s*=\\s*)`, 'g')
    const candidates: string[] = []
    while (true) {
        const match = re.exec(text)
        if (!match) {
            break
        }
        const startPos = match.index + match[1].length
        if (text[startPos] === '{') {
            const candidate = getLongestBalancedString(text.slice(startPos))
            if (candidate !== undefined) {
                candidates.push(candidate)
            }
        } else if (text[startPos] === '"') {
            const quoteRe = /(?<!\\)"/g
            const quoteMatch = quoteRe.exec(text.slice(startPos + 1))
            if (quoteMatch) {
                candidates.push(text.slice(startPos + 1, startPos + quoteMatch.index + 1))
            }
        } else {
            const commaRe = /,/g
            const commaMatch = commaRe.exec(text.slice(startPos + 1))
            if (commaMatch) {
                candidates.push(text.slice(startPos, startPos + commaMatch.index + 1))
            }
        }
    }
    return candidates
}
