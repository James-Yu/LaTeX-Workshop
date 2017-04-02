import * as vscode from 'vscode'
import * as fs from 'fs'

import {Extension} from './../main'

export class Reference {
    extension: Extension
    suggestions: vscode.CompletionItem[]
    referenceInTeX: { [id: string]: {} } = {}
    refreshTimer: number

    constructor(extension: Extension) {
        this.extension = extension
    }

    provide() : vscode.CompletionItem[] {
        if (Date.now() - this.refreshTimer < 1000)		
            return this.suggestions
        this.refreshTimer = Date.now()
        let suggestions = {}
        Object.keys(this.extension.manager.texFileTree).forEach(filePath => {
            if (filePath in this.referenceInTeX) {
                Object.keys(this.referenceInTeX[filePath]).forEach(key => {
                    if (!(key in suggestions))
                        suggestions[key] = this.referenceInTeX[filePath][key]
                })
            }
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
        this.referenceInTeX[filePath] = this.getReferenceItems(fs.readFileSync(filePath, 'utf-8'))
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
