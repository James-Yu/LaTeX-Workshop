'use strict'

import * as vscode from 'vscode'
import * as fs from 'fs'

import {Extension} from './../main'

export class Reference {
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
        let suggestions = {}
        this.extension.manager.texFiles.map(filePath => {
            let items = this.getReferencesTeX(filePath)
            Object.keys(items).map(key => {
                if (!(key in suggestions))
                    suggestions[key] = items[key]
            })
        })
        if (vscode.window.activeTextEditor) {
            let items = this.getReferenceItems(vscode.window.activeTextEditor.document.getText())
            Object.keys(items).map(key => {
                if (!(key in suggestions))
                    suggestions[key] = items[key]
            })
        }
        this.suggestions = []
        Object.keys(suggestions).map(key => {
            let item = suggestions[key]
            let command = new vscode.CompletionItem(item.reference,vscode.CompletionItemKind.Reference)
            this.suggestions.push(command)
        })
        return this.suggestions
    }

    getReferencesTeX(filePath: string) {
        if (!(fs.existsSync(filePath)))
            return {}
        return this.getReferenceItems(fs.readFileSync(filePath, 'utf-8'))
    }
    
    getReferenceItems(content: string) {
        var itemReg = /(?:\\label(?:\[[^\[\]\{\}]*\])?){([^}]*)}/g
        var items = {}
        while (true) {
            let result = itemReg.exec(content);
            if (result == null) {
                break
            }
            if (!(result[1] in items)) {
                items[result[1]] = {
                    reference: result[1]
                }
            }
        }
        return items
    }
}