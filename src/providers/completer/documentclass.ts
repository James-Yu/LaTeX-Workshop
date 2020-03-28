import * as vscode from 'vscode'
import * as fs from 'fs-extra'

import {Extension} from '../../main'

export class DocumentClass {
    extension: Extension
    suggestions: vscode.CompletionItem[] = []

    constructor(extension: Extension) {
        this.extension = extension
    }

    initialize(classes: {[key: string]: {command: string, detail: string, documentation: string}}) {
        Object.keys(classes).forEach(key => {
            const item = classes[key]
            const cl = new vscode.CompletionItem(item.command, vscode.CompletionItemKind.Module)
            cl.detail = item.detail
            cl.documentation = item.documentation
            this.suggestions.push(cl)
        })
    }

    provide(): vscode.CompletionItem[] {
        if (this.suggestions.length === 0) {
            const allClasses = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/classnames.json`).toString())
            this.initialize(allClasses)
        }
        return this.suggestions
    }
}
