import * as vscode from 'vscode'
import * as fs from 'fs'

import {Extension} from './main'
import {Citation} from './providers/citation'
import {Command} from './providers/command'
import {Environment} from './providers/environment'
import {Reference} from './providers/reference'

export class Completer implements vscode.CompletionItemProvider {
    extension: Extension
    citation: Citation
    command: Command
    environment: Environment
    reference: Reference

    constructor(extension: Extension) {
        this.extension = extension
        const defaultCommands = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/commands.json`).toString())
        const defaultSymbols = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/unimathsymbols.json`).toString())
        const defaultEnvs = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/environments.json`).toString())
        this.citation = new Citation(extension)
        this.command = new Command(extension, defaultCommands, defaultSymbols, defaultEnvs)
        this.environment = new Environment(extension, defaultEnvs)
        this.reference = new Reference(extension)
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken) : Promise<vscode.CompletionItem[]> {
        return new Promise((resolve, _reject) => {
            const line = document.lineAt(position.line).text.substr(0, position.character)
            for (const type of ['citation', 'reference', 'environment', 'command']) {
                const suggestions = this.completion(type, line)
                if (suggestions.length > 0) {
                    resolve(suggestions)
                }
            }
            resolve([])
        })
    }

    completion(type: string, line: string) : vscode.CompletionItem[] {
        let reg
        let provider
        switch (type) {
            case 'citation':
                reg = /(?:\\[a-zA-Z]*cite[a-zA-Z]*(?:\[[^\[\]]*\])?){([^}]*)$/
                provider = this.citation
                break
            case 'reference':
                reg = /(?:\\[a-zA-Z]*ref[a-zA-Z]*(?:\[[^\[\]]*\])?){([^}]*)$/
                provider = this.reference
                break
            case 'environment':
                reg = /(?:\\(?:begin|end)(?:\[[^\[\]]*\])?){([^}]*)$/
                provider = this.environment
                break
            case 'command':
                reg = /\\([a-zA-Z]*)$/
                provider = this.command
                break
            default:
                // This shouldn't be possible, so mark as error case in log.
                this.extension.logger.addLogMessage(`Error - trying to complete unknown type ${type}`)
                return []
        }
        const result = line.match(reg)
        let suggestions: vscode.CompletionItem[] = []
        if (result) {
            suggestions = provider.provide()
        }
        return suggestions
    }
}
