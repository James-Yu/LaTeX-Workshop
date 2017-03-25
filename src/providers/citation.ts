'use strict'

import * as vscode from 'vscode'
import * as fs from 'fs'

import {Extension} from './../main'

export class Citation {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    provide() : vscode.CompletionItem[] {
        this.extension.manager.findAllDependentFiles()
        let items = []
        for (let bib of this.extension.manager.bibFiles)
            items = items.concat(this.getBibItems(bib))
        let suggestions = []
        for (let item of items) {
            let citation = new vscode.CompletionItem(item.key,vscode.CompletionItemKind.Reference)
            citation.detail = item.title
            citation.filterText = `${item.author} ${item.title} ${item.journal}`
            citation.insertText = item.key
            citation.documentation = Object.keys(item)
                .filter(k => (k !== 'key' && k !== 'title'))
                .sort()
                .map(k => `${k}: ${item[k]}`)
                .join('\n');
            suggestions.push(citation)
        }
        return suggestions
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
            if (prev_result && prev_result[1].toLowerCase() !== 'comment') {
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