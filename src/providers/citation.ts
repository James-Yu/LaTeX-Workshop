import * as vscode from 'vscode'
import * as fs from 'fs'

import {Extension} from './../main'

const bibEntries = ['article', 'book', 'booklet', 'conference', 'inbook',
                    'incollection', 'inproceedings', 'manual', 'mastersthesis',
                    'misc', 'phdthesis', 'proceedings', 'techreport',
                    'unpublished']

interface CitationRecord {
    key: string
    [key: string]: string | undefined
}

export class Citation {
    extension: Extension
    suggestions: vscode.CompletionItem[]
    citationInBib: { [id: string]: CitationRecord[] } = {}
    refreshTimer: number

    constructor(extension: Extension) {
        this.extension = extension
    }

    provide() : vscode.CompletionItem[] {
        if (Date.now() - this.refreshTimer < 1000) {
            return this.suggestions
        }
        this.refreshTimer = Date.now()

        // Retrieve all Bib items for all known bib files in a flat list
        const items: CitationRecord[] = []
        Object.keys(this.citationInBib).forEach(bibPath => {
            this.citationInBib[bibPath].forEach(item => items.push(item))
        })

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
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
                .filter(key => (key !== 'key' && key !== 'title'))
                .sort()
                .map(key => `${key}: ${item[key]}`)
                .join('\n')
            return citation
        })
        return this.suggestions
    }

    browser() {
        this.provide()
        const items: CitationRecord[] = []
        Object.keys(this.citationInBib).forEach(bibPath => {
            this.citationInBib[bibPath].forEach(item => items.push(item))
        })
        const pickItems: vscode.QuickPickItem[] = items.map(item => {
            return {
                label: item.title as string,
                description: `${item.key}`,
                detail: `Authors: ${item.author ? item.author : 'Unknown'}, publication: ${item.journal ? item.journal : (item.publisher ? item.publisher : 'Unknown')}`
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
                editor.edit(edit => edit.insert(editor.selection.start, selected.description))
            }
        })
    }

    parseBibFile(bibPath: string) {
        this.extension.logger.addLogMessage(`Parsing .bib entries from ${bibPath}`)
        const items: CitationRecord[] = []
        const content = fs.readFileSync(bibPath, 'utf-8').replace(/[\r\n]/g, ' ')
        const itemReg = /@(\w+){/g
        let result = itemReg.exec(content)
        let prevResult: RegExpExecArray | null = null
        while (result || prevResult) {
            if (prevResult && bibEntries.indexOf(prevResult[1].toLowerCase()) > -1) {
                const itemString = content.substring(prevResult.index, result ? result.index : undefined).trim()
                const item = this.parseBibString(itemString)
                if (item !== undefined) {
                    items.push(item)
                } else {
                    // TODO we could consider adding a diagnostic for this case so the issue appears in the Problems list
                    this.extension.logger.addLogMessage(`Warning - following .bib entry in ${bibPath} has no cite key:\n${itemString}`)
                }
            }
            prevResult = result
            if (result) {
                result = itemReg.exec(content)
            }
        }
        this.extension.logger.addLogMessage(`Parsed ${items.length} .bib entries from ${bibPath}.`)
        this.citationInBib[bibPath] = items
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
        item = item.substr(bibDefinitionReg.lastIndex + 1)
        const bibItem: CitationRecord = { key: regResult[4] }
        const bibAttrReg = /([a-zA-Z0-9\!\$\&\*\+\-\.\/\:\;\<\>\?\[\]\^\_\`\|]+)\s*(\=)/g
        regResult = bibAttrReg.exec(item)
        while (regResult) {
            const attrKey = regResult[1]
            item = item.substr(bibAttrReg.lastIndex + 1)
            bibAttrReg.lastIndex = 0
            const quotePos = /\"/g.exec(item)
            const bracePos = /{/g.exec(item)
            let attrValue = ''
            if (bracePos && (!quotePos || quotePos.index > bracePos.index)) {
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
}
