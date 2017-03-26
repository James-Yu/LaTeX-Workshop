'use strict'

import * as vscode from 'vscode'
import * as fs from 'fs'

import {Extension} from './../main'

export class Command {
    extension: Extension
    suggestions: vscode.CompletionItem[]
    provideRefreshTime: number

    constructor(extension: Extension) {
        this.extension = extension
    }

    provide() : vscode.CompletionItem[] {
        if (Date.now() - this.provideRefreshTime < 1000)
            return this.suggestions
        this.provideRefreshTime = Date.now()
        this.extension.manager.findAllDependentFiles()
        let suggestions = JSON.parse(JSON.stringify(this.defaults))
        this.extension.manager.texFiles.map(filePath => {
            let items = this.getCommandsTeX(filePath)
            Object.keys(items).map(key => {
                if (key in suggestions)
                    suggestions[key].count += items[key].count
                else
                    suggestions[key] = items[key]
            })
        })
        if (vscode.window.activeTextEditor) {
            let items = this.getCommandItems(vscode.window.activeTextEditor.document.getText())
            Object.keys(items).map(key => {
                if (!(key in suggestions))
                    suggestions[key] = items[key]
            })
        }
        this.suggestions = []
        Object.keys(suggestions).map(key => {
            let item = suggestions[key]
            let command = new vscode.CompletionItem(item.command,vscode.CompletionItemKind.Keyword)
            command.insertText = new vscode.SnippetString(item.snippet)
            this.suggestions.push(command)
        })
        return this.suggestions
    }

    getCommandsTeX(filePath: string) {
        if (!(fs.existsSync(filePath)))
            return {}
        return this.getCommandItems(fs.readFileSync(filePath, 'utf-8'))
    }
    
    getCommandItems(content: string) {
        var itemReg = /\\([a-zA-Z]+)({[^{}]*})?({[^{}]*})?({[^{}]*})?/g
        var items = {}
        while (true) {
            let result = itemReg.exec(content);
            if (result == null) {
                break
            }
            if (!(result[1] in items)) {
                items[result[1]] = {
                    command: result[1],
                    counts: 1,
                    chain: false,
                    snippet: result[1]
                }
                if (result[2]) {
                    items[result[1]].chain = true
                    items[result[1]].snippet += `{$\{1:arg}}`
                }
                if (result[3])
                    items[result[1]].snippet += `{$\{2:arg}}`
                if (result[4])
                    items[result[1]].snippet += `{$\{3:arg}}`
            } else
                items[result[1]].counts += 1
        }

        return items
    }

    defaults = {
        begin: {
            command: 'begin',
            counts: 1,
            chain: true,
            snippet: 'begin{$1}\n\t$2\n\\\\end{$1}'
        },
        cite: {
            command: 'cite',
            counts: 1,
            chain: true,
            snippet: 'cite{$1}'
        },
        ref: {
            command: 'ref',
            counts: 1,
            chain: true,
            snippet: 'ref{$1}'
        }
    }
}