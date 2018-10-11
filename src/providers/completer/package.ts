import * as vscode from 'vscode'

import {Extension} from '../../main'

export class Package {
    extension: Extension
    suggestions: vscode.CompletionItem[] = []
    provideRefreshTime: number

    constructor(extension: Extension) {
        this.extension = extension
    }

    initialize(defaultPackages: {[key: string]: {command: string, detail: string, documentation: string}}) {
        Object.keys(defaultPackages).forEach(key => {
            const item = defaultPackages[key]
            const pack = new vscode.CompletionItem(item.command, vscode.CompletionItemKind.Module)
            pack.detail = item.detail
            pack.documentation = item.documentation
            this.suggestions.push(pack)
        })
    }

    provide() : vscode.CompletionItem[] {
        return this.suggestions
    }
}
