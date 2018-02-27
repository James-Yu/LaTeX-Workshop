import * as vscode from 'vscode'

import {Extension} from '../../main'

export class Package {
    extension: Extension
    suggestions: vscode.CompletionItem[] = []
    provideRefreshTime: number

    constructor(extension: Extension) {
        this.extension = extension
    }

    initialize(defaultPackages: {[key: string]: {package: string}}) {
        Object.keys(defaultPackages).forEach(key => {
            const item = defaultPackages[key]
            const pack = new vscode.CompletionItem(item.package, vscode.CompletionItemKind.Module)
            this.suggestions.push(pack)
        })
    }

    provide() : vscode.CompletionItem[] {
        return this.suggestions
    }
}
