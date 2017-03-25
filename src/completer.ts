'use strict'

import * as vscode from 'vscode'

import {Extension} from './main'
import {Citation} from './providers/citation'

export class Completer implements vscode.CompletionItemProvider {
    extension: Extension
    citation: Citation
    reference: Citation
    environment: Citation
    command: Citation

    constructor(extension: Extension) {
        this.extension = extension
        this.citation = new Citation(extension)
        this.reference = new Citation(extension)
        this.environment = new Citation(extension)
        this.command = new Citation(extension)
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        Thenable<vscode.CompletionItem[]> {
        return new Promise((resolve, reject) => {
            let line = document.lineAt(position.line).text.substr(0, position.character)
            for (let type of ['citation', 'reference', 'environment', 'command']) {
                let suggestions = this.completion(type, line)
                if (suggestions.length > 0)
                    resolve(suggestions)
            }
            resolve([])
        })
    }

    completion(type: string, line: string) : vscode.CompletionItem[] {
        let reg, provider
        switch (type) {
            case 'citation':
                reg = /(?:\\[a-zA-Z]*cite[a-zA-Z]*(?:\[[^\[\]]*\])?){([^}]*)$/
                provider = this.citation
                break;
            case 'reference':
                reg = /(?:\\[a-zA-Z]*ref[a-zA-Z]*(?:\[[^\[\]]*\])?){([^}]*)$/
                provider = this.reference
                break;
            case 'environment':
                reg = /(?:\\(?:begin|end)(?:\[[^\[\]]*\])?){([^}]*)$/
                provider = this.environment
                break;
            case 'command':
                reg = /\\([a-zA-Z]*)$/
                provider = this.command
                break;
        }
        let result = line.match(reg)
        let suggestions = []
        if (result) {
            suggestions = provider.provide()
        }
        return suggestions
    }
}