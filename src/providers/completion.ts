import * as vscode from 'vscode'
import * as fs from 'fs'

import {Extension} from '../main'
import {Citation} from './completer/citation'
import {Command} from './completer/command'
import {Environment} from './completer/environment'
import {Reference} from './completer/reference'

export class Completer implements vscode.CompletionItemProvider {
    extension: Extension
    citation: Citation
    command: Command
    environment: Environment
    reference: Reference

    constructor(extension: Extension) {
        this.extension = extension
        this.citation = new Citation(extension)
        this.command = new Command(extension)
        this.environment = new Environment(extension)
        this.reference = new Reference(extension)
        fs.readFile(`${this.extension.extensionRoot}/data/environments.json`, (err1, defaultEnvs) => {
            if (err1) {
                this.extension.logger.addLogMessage(`Error reading default environments: ${err1.message}`)
                return
            }
            this.extension.logger.addLogMessage(`Default environments loaded`)
            fs.readFile(`${this.extension.extensionRoot}/data/commands.json`, (err2, defaultCommands) => {
                if (err2) {
                    this.extension.logger.addLogMessage(`Error reading default commands: ${err2.message}`)
                    return
                }
                this.extension.logger.addLogMessage(`Default commands loaded`)
                fs.readFile(`${this.extension.extensionRoot}/data/unimathsymbols.json`, (err3, defaultSymbols) => {
                    if (err2) {
                        this.extension.logger.addLogMessage(`Error reading default unimathsymbols: ${err3.message}`)
                        return
                    }
                    this.extension.logger.addLogMessage(`Default unimathsymbols loaded`)
                    const env = JSON.parse(defaultEnvs.toString())
                    this.command.initialize(JSON.parse(defaultCommands.toString()), JSON.parse(defaultSymbols.toString()), env)
                    this.environment.initialize(env)
                })
            })
        })
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken) : Promise<vscode.CompletionItem[]> {
        return new Promise((resolve, _reject) => {
            const line = document.lineAt(position.line).text.substr(0, position.character)
            for (const type of ['citation', 'reference', 'environment', 'command']) {
                const suggestions = this.completion(type, line)
                if (suggestions.length > 0) {
                    if (type === 'citation') {
                        const configuration = vscode.workspace.getConfiguration('latex-workshop')
                        if (configuration.get('intellisense.citation.type') as string === 'browser') {
                            resolve()
                            setTimeout(() => this.citation.browser(), 10)
                            return
                        }
                    }
                    resolve(suggestions)
                    return
                }
            }
            resolve()
        })
    }

    completion(type: string, line: string) : vscode.CompletionItem[] {
        let reg
        let provider
        switch (type) {
            case 'citation':
                reg = /(?:\\[a-zA-Z]*cite[a-zA-Z]*(?:\[[^\[\]]*\])*){([^}]*)$/
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
