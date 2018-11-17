import * as vscode from 'vscode'

import {Extension} from '../../main'

export class Environment {
    extension: Extension
    suggestions: vscode.CompletionItem[] = []
    provideRefreshTime: number

    constructor(extension: Extension) {
        this.extension = extension
    }

    initialize(defaultEnvs: string[]) {
        defaultEnvs.forEach(env => {
            const environment = new vscode.CompletionItem(env, vscode.CompletionItemKind.Module)
            this.suggestions.push(environment)
        })
    }

    provide() : vscode.CompletionItem[] {
        return this.suggestions
    }
}
