import * as vscode from 'vscode'

import {Extension} from '../../main'

export class Environment {
    extension: Extension
    suggestions: vscode.CompletionItem[] = []
    provideRefreshTime: number

    constructor(extension: Extension) {
        this.extension = extension
    }

    initialize(defaultEnvs: {[key: string]: {text: string}}) {
        Object.keys(defaultEnvs).forEach(key => {
            const item = defaultEnvs[key]
            const environment = new vscode.CompletionItem(item.text, vscode.CompletionItemKind.Module)
            this.suggestions.push(environment)
        })
    }

    provide() : vscode.CompletionItem[] {
        return this.suggestions
    }
}
