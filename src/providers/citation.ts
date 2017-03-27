'use strict'

import * as vscode from 'vscode'
import * as fs from 'fs'

import {Extension} from './../main'

const bibEntries = ['article', 'book', 'booklet', 'conference', 'inbook',
                    'incollection', 'inproceedings', 'manual', 'mastersthesis',
                    'misc', 'phdthesis', 'proceedings', 'techreport',
                    'unpublished']

export class Citation {
    extension: Extension
    suggestions: vscode.CompletionItem[]
    provideRefreshTime: number

    constructor(extension: Extension) {
        this.extension = extension
    }

    provide() : vscode.CompletionItem[] {
        if (Date.now() - this.provideRefreshTime < 1000) {
            return this.suggestions
        }
        this.provideRefreshTime = Date.now()
        this.extension.manager.findAllDependentFiles()
        let items = []
        this.extension.manager.bibFiles.forEach(
            bib => this.getBibItems(bib).forEach(i => items.push(i)))
        this.suggestions = items.map(item => {
            let citation = new vscode.CompletionItem(item.key, vscode.CompletionItemKind.Reference)
            citation.detail = item.title
            citation.filterText = `${item.author} ${item.title} ${item.journal}`
            citation.insertText = item.key
            citation.documentation = Object.keys(item)
                .filter(key => (key !== 'key' && key !== 'title'))
                .sort()
                .map(key => `${key}: ${item[key]}`)
                .join('\n');
            return citation
        })
        return this.suggestions
    }

    getBibItems(bib: string) {
        let items = []
        if (!fs.existsSync(bib))
            return items
        let content = fs.readFileSync(bib, 'utf-8').replace(/[\r\n]/g, ' ')
        let itemReg = /@(\w+){/g
        let result = itemReg.exec(content)
        let prev_result = undefined
        while (result || prev_result) {
            if (prev_result && bibEntries.indexOf(prev_result[1].toLowerCase()) > -1) {
                let item = content.substring(prev_result.index, result ? result.index : undefined).trim()
                items.push(this.splitBibItem(item))
            }
            prev_result = result
            if (result)
                result = itemReg.exec(content)
        }
        return items
    }

    splitBibItem(item: string) {
        let unclosed = 0
        let lastSplit = -1
        let segments = []

        for (let i = 0; i < item.length; i++) {
            let char = item[i]
            if (char === '{' && item[i - 1] !== '\\') {
                unclosed++
            } else if (char === '}' && item[i - 1] !== '\\') {
                unclosed--
            } else if (char === ',' && unclosed === 1) {
                segments.push(item.substring(lastSplit + 1, i).trim())
                lastSplit = i
            }
        }

        segments.push(item.substring(lastSplit + 1).trim())
        let bibItem = {key: undefined}
        bibItem.key = segments.shift()
        bibItem.key = bibItem.key.substring(bibItem.key.indexOf('{') + 1)

        let last = segments[segments.length - 1]
        last = last.substring(0, last.lastIndexOf('}'))

        segments[segments.length - 1] = last

        for (let i = 0; i < segments.length; i++) {
            let segment = segments[i]
            let eqSign = segment.indexOf('=')
            let key = segment.substring(0, eqSign).trim()
            let value = segment.substring(eqSign + 1).trim()
            if (value[0] === '{' && value[value.length - 1] === '}') {
                value = value.substring(1, value.length - 1)
            }
            value = value.replace(/(\\.)|({)/g, '$1').replace(/(\\.)|(})/g, '$1')
            bibItem[key.toLowerCase()] = value
        }
        return bibItem
    }
}