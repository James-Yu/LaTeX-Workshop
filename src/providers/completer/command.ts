import * as vscode from 'vscode'
import * as fs from 'fs-extra'

import {Extension} from '../../main'

export class CommandCompletionItem extends vscode.CompletionItem {
    packageName: string | undefined = undefined

    constructor(label: string, kind?: vscode.CompletionItemKind | undefined) {
        super(label, kind)
    }
}

interface DataItemEntry {
    command: string, // frame
    snippet: string,
    package?: string,
    label?: string, // \\begin{frame} ... \\end{frame}
    detail?: string,
    documentation?: string,
    postAction?: string
}

export class Command {
    extension: Extension
    // suggestions: CommandCompletionItem[] = []
    // commandInTeX: { [id: string]: {[id: string]: AutocompleteEntry} } = {}
    // refreshTimer: number
    // allCommands: {[key: string]: CommandCompletionItem} = {}
    // defaultCommands: {[key: string]: CommandCompletionItem} = {}
    // defaultSymbols: {[key: string]: CommandCompletionItem} = {}
    // newcommandData: {[id: string]: {position: vscode.Position, file: string}} = {}
    // usedPackages: string[] = []
    // packageCmds: {[pkg: string]: {[key: string]: CommandCompletionItem}} = {}

    packages: string[] = []
    bracketCmds: {[key: string]: vscode.CompletionItem} = {}
    private defaultCmds: vscode.CompletionItem[] = []
    private defaultSymbols: vscode.CompletionItem[] = []
    private packageCmds: {[pkg: string]: vscode.CompletionItem[]} = {}

    constructor(extension: Extension) {
        this.extension = extension
    }

    initialize(defaultCmds: {[key: string]: DataItemEntry}, defaultEnvs: string[]) {
        // Initialize default commands and `latex-mathsymbols`
        Object.keys(defaultCmds).forEach(key => {
            this.defaultCmds.push(this.entryToCompletion(defaultCmds[key]))
            // } else {
            //     if (!(item.package in this.packageCmds)) {
            //         this.packageCmds[item.package] = []
            //     }
            //     this.packageCmds[item.package].push(this.entryToCompletion(item))
            // }
        })

        // Initialize default env begin-end pairs, de-duplication
        Array.from(new Set(defaultEnvs)).forEach(env => {
            const suggestion = new CommandCompletionItem(env, vscode.CompletionItemKind.Snippet)
            // Use 'an' or 'a' depending on the first letter
            const art = ['a', 'e', 'i', 'o', 'u'].indexOf(`${env}`.charAt(0)) >= 0 ? 'an' : 'a'
            suggestion.detail = `Insert ${art} ${env} environment.`
            if (['enumerate', 'itemize'].indexOf(env) > -1) {
                suggestion.insertText = new vscode.SnippetString(`begin{${env}}\n\t\\item $0\n\\\\end{${env}}`)
            } else {
                suggestion.insertText = new vscode.SnippetString(`begin{${env}}\n\t$0\n\\\\end{${env}}`)
            }
            suggestion.filterText = env
            this.defaultCmds.push(suggestion)
        })

        // Handle special commands with brackets
        const bracketCmds = ['\\(', '\\[', '\\{', '\\left(', '\\left[', '\\left{']
        this.defaultCmds.filter(cmd => bracketCmds.indexOf(this.getCommand(cmd)) > -1).forEach(cmd => {
            this.bracketCmds[cmd.label] = cmd
        })
    }

    provide(): vscode.CompletionItem[] {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useOptionalArgsEntries = configuration.get('intellisense.optionalArgsEntries.enabled')

        const suggestions: vscode.CompletionItem[] = []
        const cmdList: string[] = []

        // Insert default commands
        this.defaultCmds.forEach(cmd => {
            if (!useOptionalArgsEntries && this.getCommand(cmd).indexOf('[') > -1) {
                return
            }
            suggestions.push(cmd)
            cmdList.push(this.getCommand(cmd))
        })

        // Insert unimathsymbols
        if (configuration.get('intellisense.unimathsymbols.enabled')) {
            if (this.defaultSymbols.length === 0) {
                const symbols = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/unimathsymbols.json`).toString())
                Object.keys(symbols).forEach(key => {
                    this.defaultSymbols.push(this.entryToCompletion(symbols[key]))
                })
            }
            this.defaultSymbols.forEach(symbol => {
                suggestions.push(symbol)
                cmdList.push(this.getCommand(symbol))
            })
        }

        // Insert commands from packages
        const extraPackages = configuration.get('intellisense.package.extra') as string[]
        if (extraPackages) {
            extraPackages.forEach(pkg => {
                if (this.usedPackages.indexOf(pkg) === -1) {
                    this.usedPackages.push(pkg)
                }
            })
        }
        this.usedPackages.forEach(pkg => this.insertPkgCmds(pkg, suggestions))
        this.allCommands = suggestions
        const suggestionsAsciiKeys: string[] = []
        Object.keys(suggestions).forEach(key => {
            const i = key.search(/[[{]/)
            const k = i > -1 ? key.substr(0, i): key
            if (suggestionsAsciiKeys.indexOf(k) === -1) {
                suggestionsAsciiKeys.push(k)
            }
        })
        this.extension.manager.getIncludedTeX().forEach(filePath => {
            if (filePath in this.commandInTeX) {
                Object.keys(this.commandInTeX[filePath]).forEach(key => {
                    if (suggestionsAsciiKeys.indexOf(key) > - 1) {
                        return
                    }
                    suggestions[key] = this.entryToCompletionItem(this.commandInTeX[filePath][key])
                    suggestionsAsciiKeys.push(key)
                })
            }
        })
        if (vscode.window.activeTextEditor) {
            const items = this.getCommandItems(vscode.window.activeTextEditor.document.getText(), vscode.window.activeTextEditor.document.fileName)
            Object.keys(items).forEach(key => {
                if (suggestionsAsciiKeys.indexOf(key) > - 1) {
                    return
                }
                suggestions[key] = this.entryToCompletionItem(items[key])
                suggestionsAsciiKeys.push(key)
            })
        }
        Object.keys(this.newcommandData).forEach(key => {
            if (suggestionsAsciiKeys.indexOf(key) > - 1) {
               return
            }
            const item = new vscode.CompletionItem(`\\${key}`, vscode.CompletionItemKind.Function)
            item.insertText = key
            suggestions[key] = item
            suggestionsAsciiKeys.push(key)
       })
        this.suggestions = Object.keys(suggestions).map(key => suggestions[key])
        return this.suggestions
    }

    private getCommand(item: vscode.CompletionItem): string {
        return item.filterText ? item.filterText : item.label.slice(1)
    }

    private entryToCompletion(item: DataItemEntry): vscode.CompletionItem {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useTabStops = configuration.get('intellisense.useTabStops.enabled')
        const backslash = item.command[0] === ' ' ? '' : '\\'
        const label = item.label ? `${item.label}` : `${backslash}${item.command}`
        const suggestion = new CommandCompletionItem(label, vscode.CompletionItemKind.Function)

        if (item.snippet) {
            if (useTabStops) {
                item.snippet = item.snippet.replace(/\$\{(\d+):[^}]*\}/g, '$${$1}')
            }
            suggestion.insertText = new vscode.SnippetString(item.snippet)
        } else {
            suggestion.insertText = item.command
        }
        if (item.label) {
            suggestion.filterText = item.command
        }
        suggestion.detail = item.detail
        suggestion.documentation = item.documentation ? item.documentation : '`' + item.command + '`'
        suggestion.sortText = item.command.replace(/^[a-zA-Z]/, c => {
            const n = c.match(/[a-z]/) ? c.toUpperCase().charCodeAt(0): c.toLowerCase().charCodeAt(0)
            return n !== undefined ? n.toString(16): c
        })
        if (item.postAction) {
            suggestion.command = { title: 'Post-Action', command: item.postAction }
        } else if (/[a-zA-Z]*([Cc]ite|ref|input)[a-zA-Z]*|(sub)?(import|includefrom|inputfrom)/.exec(item.command)) {
            // Automatically trigger completion if the command is for citation, filename or reference
            suggestion.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
        }
        return suggestion
    }

    private provideCmdInPkg(pkg: string, suggestions: vscode.CompletionItem[], cmdList: string[]) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (!(configuration.get('intellisense.package.enabled'))) {
            return
        }
        const useOptionalArgsEntries = configuration.get('intellisense.optionalArgsEntries.enabled')
        // Load command in pkg
        if (!(pkg in this.packageCmds)) {
            let filePath = `${this.extension.extensionRoot}/data/packages/${pkg}_cmd.json`
            if (!fs.existsSync(filePath)) {
                // Many package with names like toppackage-config.sty are just wrappers around
                // the general package toppacke.sty and do not define commands on their own.
                const indexDash = pkg.lastIndexOf('-')
                if (indexDash > - 1) {
                    const generalPkg = pkg.substring(0, indexDash)
                    filePath = `${this.extension.extensionRoot}/data/packages/${generalPkg}_cmd.json`
                }
            }
            if (fs.existsSync(filePath)) {
                const cmds = Object.keys(JSON.parse(fs.readFileSync(filePath).toString()))
                this.packageCmds[pkg] = cmds.map(key => this.entryToCompletion(cmds[key]))
            }
        }

        // No package command defined
        if (!(pkg in this.packageCmds)) {
            return
        }

        // Insert commands
        this.packageCmds[pkg].forEach(cmd => {
            if (!useOptionalArgsEntries && this.getCommand(cmd).indexOf('[') > -1) {
                return
            }
            if (cmdList.indexOf(this.getCommand(cmd)) < 0) {
                suggestions.push(cmd)
                cmdList.push(this.getCommand(cmd))
            }
        })
    }

    getPackage(filePath: string) {
        const content = fs.readFileSync(filePath, 'utf-8')
        const regex = /\\usepackage(?:\[[^[\]{}]*\])?{(.*)}/g
        let result
        do {
            result = regex.exec(content)
            if (result) {
                for (const pkg of result[1].split(',')) {
                    if (this.usedPackages.indexOf(pkg.trim()) > -1) {
                        continue
                    }
                    this.usedPackages.push(pkg.trim())
                }
            }
        } while (result)
    }

    getCommandsTeX(filePath: string) {
        this.commandInTeX[filePath] = this.getCommandItems(fs.readFileSync(filePath, 'utf-8'), filePath)
    }

    private getCommandItems(content: string, filePath: string): { [id: string]: AutocompleteEntry } {
        const itemReg = /\\([a-zA-Z]+)({[^{}]*})?({[^{}]*})?({[^{}]*})?/g
        const items = {}
        while (true) {
            const result = itemReg.exec(content)
            if (result === null) {
                break
            }
            items[result[1]] = {
                command: result[1]
            }
            if (result[2]) {
                items[result[1]].snippet = `${result[1]}{$\{1}}`
                // Automatically trigger intellisense if the command matches citation, reference or environment completion
                if (result[1].match(/([a-zA-Z]*(cite|ref)[a-zA-Z]*)|begin/)) {
                    items[result[1]].postAction = 'editor.action.triggerSuggest'
                }
            }
            if (result[3]) {
                items[result[1]].snippet += '{${2}}'
            }
            if (result[4]) {
                items[result[1]].snippet += '{${3}}'
            }
        }

        const newCommandReg = /\\(?:re|provide)?(?:new)?command(?:{)?\\(\w+)/g
        while (true) {
            const result = newCommandReg.exec(content)
            if (result === null) {
                break
            }
            if (result[1] in this.newcommandData) {
                continue
            }
            this.newcommandData[result[1]] = {
                position: new vscode.Position(content.substr(0, result.index).split('\n').length - 1, 0),
                file: filePath
            }
        }

        return items
    }
}

interface AutocompleteEntry {
    command: string,
    snippet?: string,
    detail?: string,
    label?: string,
    description?: string,
    documentation?: string,
    sortText?: string,
    postAction?: string,
    package?: string
}
