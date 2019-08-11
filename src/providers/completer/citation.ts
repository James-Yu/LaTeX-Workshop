import * as vscode from 'vscode'
import * as fs from 'fs'
import {bibtexParser} from 'latex-utensils'

import {Extension} from '../../main'

export interface Suggestion extends vscode.CompletionItem {
    attributes: {[key: string]: string}
}

export class Citation {
    extension: Extension

    private bibEntries: {[file: string]: Suggestion[]} = {}

    suggestions: vscode.CompletionItem[]
    citationInBib: { [id: string]: {citations: CitationRecord[], rootFiles: string[] }} = {}
    citationData: { [id: string]: {item: {}, text: string, position: vscode.Position, file: string} } = {}
    theBibliographyData: {[id: string]: {item: {citation: string, text: string, position: vscode.Position}, text: string, file: string, rootFile: string | undefined}} = {}
    refreshTimer: number

    constructor(extension: Extension) {
        this.extension = extension
    }

    reset() {
        this.suggestions = []
        this.theBibliographyData = {}
        this.refreshTimer = 0
    }

    provide(args?: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}): vscode.CompletionItem[] {
        if (Date.now() - this.refreshTimer < 1000) {
            return this.suggestions
        }
        this.refreshTimer = Date.now()

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const rootFile = this.extension.manager.rootFile
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
        const suggestions = {}
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
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (fs.statSync(file).size >= (configuration.get('intellisense.citation.maxfilesizeMB') as number) * 1024 * 1024) {
            this.extension.logger.addLogMessage(`${file} is too large, ignoring it.`)
            if (file in this.bibEntries) {
                delete this.bibEntries[file]
            }
            return
        }
        this.bibEntries[file] = bibtexParser.parse(fs.readFileSync(file).toString()).content
            .filter(entry => bibtexParser.isEntry(entry))
            .filter((entry: bibtexParser.Entry) => entry.internalKey !== undefined)
            .map((entry: bibtexParser.Entry) => {
            const item: Suggestion = {
                label: entry.internalKey,
                kind: vscode.CompletionItemKind.Reference,
                attributes: {}
            }
            // entry.content
            return item
        })

        this.extension.logger.addLogMessage(`Parsing .bib entries from ${bibPath}`)
        const items: CitationRecord[] = []
        const content = fs.readFileSync(bibPath, 'utf-8')
        const contentNoNewLine = content.replace(/[\r\n]/g, ' ')
        const itemReg = /@(\w+)\s*{/g
        let result = itemReg.exec(contentNoNewLine)
        let prevResult: RegExpExecArray | null = null
        let numLines = 1
        let prevPrevResultIndex = 0
        while (result || prevResult) {
            if (prevResult && bibEntries.indexOf(prevResult[1].toLowerCase()) > -1) {
                const itemString = contentNoNewLine.substring(prevResult.index, result ? result.index : undefined).trim()
                const item = this.parseBibString(itemString)
                if (item !== undefined) {
                    items.push(item)
                    numLines = numLines + content.substring(prevPrevResultIndex, prevResult.index).split('\n').length - 1
                    prevPrevResultIndex = prevResult.index
                    this.citationData[item.key] = {
                        item,
                        text: Object.keys(item)
                            .filter(key => (key !== 'key'))
                            .sort((a, b) => {
                                if (a.toLowerCase() === 'title') {
                                    return -1
                                }
                                if (b.toLowerCase() === 'title') {
                                    return 1
                                }
                                if (a.toLowerCase() === 'author') {
                                    return -1
                                }
                                if (b.toLowerCase() === 'author') {
                                    return 1
                                }
                                return 0
                            })
                            .map(key => `${key}: ${item[key]}`)
                            .join('\n\n'),
                        position: new vscode.Position(numLines - 1, 0),
                        file: bibPath
                    }
                } else {
                    // TODO we could consider adding a diagnostic for this case so the issue appears in the Problems list
                    this.extension.logger.addLogMessage(`Warning - following .bib entry in ${bibPath} has no cite key:\n${itemString}`)
                }
            }
            prevResult = result
            if (result) {
                result = itemReg.exec(contentNoNewLine)
            }
        }
        this.extension.logger.addLogMessage(`Parsed ${items.length} .bib entries from ${bibPath}.`)

        let rootFilesList: string[] = []
        if (bibPath in this.citationInBib) {
            rootFilesList = this.citationInBib[bibPath].rootFiles
        }
        if (texFile && rootFilesList.indexOf(texFile) === -1) {
            rootFilesList.push(texFile)
        }
        this.citationInBib[bibPath] = { citations: items, rootFiles: rootFilesList }
    }

    forgetParsedBibItems(bibPath: string) {
        this.extension.logger.addLogMessage(`Forgetting parsed bib entries for ${bibPath}`)
        delete this.citationInBib[bibPath]
    }

    parseBibString(item: string) {
        const bibDefinitionReg = /((@)[a-zA-Z]+)\s*(\{)\s*([^\s,]*)/g
        let regResult = bibDefinitionReg.exec(item)
        if (!regResult) {
            return undefined
        }
        item = item.substr(bibDefinitionReg.lastIndex)
        const bibItem: CitationRecord = { key: regResult[4] }
        const bibAttrReg = /([a-zA-Z0-9!$&*+\-./:;<>?[\]^_`|]+)\s*(=)/g
        regResult = bibAttrReg.exec(item)
        while (regResult) {
            const attrKey = regResult[1]
            item = item.substr(bibAttrReg.lastIndex)
            bibAttrReg.lastIndex = 0
            const commaPos = /,/g.exec(item)
            const quotePos = /"/g.exec(item)
            const bracePos = /{/g.exec(item)
            let attrValue = ''
            if (commaPos && ((!quotePos || (quotePos && (commaPos.index < quotePos.index)))
                && (!bracePos || (bracePos && (commaPos.index < bracePos.index))))) {
                // No deliminator
                attrValue = item.substring(0, commaPos.index).trim()
                item = item.substr(commaPos.index)
            } else if (bracePos && (!quotePos || quotePos.index > bracePos.index)) {
                // Use curly braces
                let nested = 0
                for (let i = bracePos.index; i < item.length; ++i) {
                    const char = item[i]
                    if (char === '{' && item[i - 1] !== '\\') {
                        nested++
                    } else if (char === '}' && item[i - 1] !== '\\') {
                        nested--
                    }
                    if (nested === 0) {
                        attrValue = item.substring(bracePos.index + 1, i)
                                        .replace(/(\\.)|({)/g, '$1').replace(/(\\.)|(})/g, '$1')
                        item = item.substr(i)
                        break
                    }
                }
            } else if (quotePos) {
                // Use double quotes
                for (let i = quotePos.index + 1; i < item.length; ++i) {
                    if (item[i] === '"') {
                        attrValue = item.substring(quotePos.index + 1, i)
                                        .replace(/(\\.)|({)/g, '$1').replace(/(\\.)|(})/g, '$1')
                        item = item.substr(i)
                        break
                    }
                }
            }
            bibItem[attrKey.toLowerCase()] = attrValue
            regResult = bibAttrReg.exec(item)
        }
        return bibItem
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

    getTheBibliographyItems(content: string) {
        const itemReg = /^(?!%).*\\bibitem(?:\[[^[\]{}]*\])?{([^}]*)}/gm
        const items: {[id: string]: {citation: string, text: string, position: vscode.Position}} = {}
        while (true) {
            const result = itemReg.exec(content)
            if (result === null) {
                break
            }
            if (!(result[1] in items)) {
                const postContent = content.substring(result.index + result[0].length, content.indexOf('\n', result.index)).trim()
                const positionContent = content.substring(0, result.index).split('\n')
                items[result[1]] = {
                    citation: result[1],
                    text: `${postContent}\n...`,
                    position: new vscode.Position(positionContent.length - 1, positionContent[positionContent.length - 1].length)
                }
            }
        }
        return items
    }
}
