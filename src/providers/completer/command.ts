import * as vscode from 'vscode'
import * as fs from 'fs-extra'

import {Extension} from '../../main'

export class CommandCompletionItem extends vscode.CompletionItem {
    packageName: string | undefined = undefined

    constructor(label: string, kind?: vscode.CompletionItemKind | undefined) {
        super(label, kind)
    }
}

export class Command {
    extension: Extension
    selection: string = ''
    shouldClearSelection: boolean = true
    suggestions: CommandCompletionItem[] = []
    commandInTeX: { [id: string]: {[id: string]: AutocompleteEntry} } = {}
    refreshTimer: number
    allCommands: {[key: string]: CommandCompletionItem} = {}
    defaultCommands: {[key: string]: CommandCompletionItem} = {}
    defaultSymbols: {[key: string]: CommandCompletionItem} = {}
    newcommandData: {[id: string]: {position: vscode.Position, file: string}} = {}
    specialBrackets: {[key: string]: vscode.CompletionItem}
    usedPackages: string[] = []
    packageCmds: {[pkg: string]: {[key: string]: CommandCompletionItem}} = {}

    constructor(extension: Extension) {
        this.extension = extension
    }

    initialize(defaultCommands: {[key: string]: AutocompleteEntry}, defaultEnvs: string[]) {
        Object.keys(defaultCommands).forEach(key => {
            const item = defaultCommands[key]
            this.defaultCommands[key] = this.entryToCompletionItem(item)
        })
        const envSnippet: { [id: string]: { command: string, snippet: string}} = {}
        defaultEnvs.forEach(env => {
            envSnippet[env] = {
                command: env,
                snippet: `begin{${env}}\n\t$0\n\\\\end{${env}}`
            }
            if (['enumerate', 'itemize'].indexOf(env) > -1) {
                envSnippet[env]['snippet'] = `begin{${env}}\n\t\\item $0\n\\\\end{${env}}`
            }
        })
        Object.keys(envSnippet).forEach(key => {
            const item = envSnippet[key]
            const command = new CommandCompletionItem(`\\begin{${item.command}} ... \\end{${item.command}}`, vscode.CompletionItemKind.Snippet)
            command.filterText = item.command
            command.insertText = new vscode.SnippetString(item.snippet)
            this.defaultCommands[key] = command
        })
        const bracketCommands = {'latexinlinemath': '(', 'latexdisplaymath': '[', 'curlybrackets': '{', 'lrparen': 'left(', 'lrbrack': 'left[', 'lrcurly': 'left\\{'}
        this.specialBrackets = Object.keys(this.defaultCommands)
            .filter(key => bracketCommands.hasOwnProperty(key))
            .reduce((obj, key) => {
                obj[bracketCommands[key]] = this.defaultCommands[key]
                return obj
            }, {})
    }

    provide() : vscode.CompletionItem[] {
        if (Date.now() - this.refreshTimer < 1000) {
            return this.suggestions
        }
        this.refreshTimer = Date.now()
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useOptionalArgsEntries = configuration.get('intellisense.optionalArgsEntries.enabled')
        let suggestions = {}
        Object.keys(this.defaultCommands).forEach(key => {
            if (!useOptionalArgsEntries && key.indexOf('[') > -1) {
                return
            }
            suggestions[key] = this.defaultCommands[key]
        })
        if (configuration.get('intellisense.unimathsymbols.enabled')) {
            if (Object.keys(this.defaultSymbols).length === 0) {
                this.loadSymbols()
            }
            suggestions = Object.assign(suggestions, this.defaultSymbols)
        }
        this.usedPackages.forEach(pkg => this.insertPkgCmds(pkg, suggestions))
        this.allCommands = suggestions
        const suggestionsAsciiKeys: string[] = []
        Object.keys(suggestions).forEach(key => {
            const i = key.search(/[\[\{]/)
            const k = i > -1 ? key.substr(0, i) : key
            if (suggestionsAsciiKeys.indexOf(k) === -1) {
                suggestionsAsciiKeys.push(k)
            }
        })
        Object.keys(this.extension.manager.texFileTree).forEach(filePath => {
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

    /**
     * @param content a string to be surrounded. If not provided, then we
     * loop over all the selections and surround each of them
     */
    surround(content?: string) {
        if (!vscode.window.activeTextEditor) {
            return
        }
        const editor = vscode.window.activeTextEditor
        const candidate: string[] = []
        this.provide().forEach(item => {
            if (item.insertText === undefined) {
                return
            }
            if (item.label === '\\begin') { // Causing a lot of trouble
                return
            }
            const command = (typeof item.insertText !== 'string') ? item.insertText.value : item.insertText
            if (command.match(/(.*)(\${\d.*?})/)) {
                candidate.push(command.replace(/\n/g, '').replace(/\t/g, '').replace('\\\\', '\\'))
            }
        })
        vscode.window.showQuickPick(candidate, {
            placeHolder: 'Press ENTER to surround previous selection with selected command',
            matchOnDetail: true,
            matchOnDescription: true
        }).then(selected => {
            if (selected === undefined) {
                return
            }
            editor.edit( editBuilder => {
                let selectedCommand = selected
                let selectedContent = content
                for (const selection of editor.selections) {
                    if (!content) {
                        selectedContent = editor.document.getText(selection)
                        selectedCommand = '\\' + selected
                    }
                    editBuilder.replace(new vscode.Range(selection.start, selection.end),
                        selectedCommand.replace(/(.*)(\${\d.*?})/, `$1${selectedContent}`) // Replace text
                            .replace(/\${\d:?(.*?)}/g, '$1') // Remove snippet placeholders
                            .replace('\\\\', '\\') // Unescape backslashes, e.g., begin{${1:env}}\n\t$2\n\\\\end{${1:env}}
                            .replace(/\$\d/, '')) // Remove $2 etc
                }
            })
        })
        return
    }

    loadSymbols() {
        const symbols = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/unimathsymbols.json`).toString())
        Object.keys(symbols).forEach(key => {
            const item = symbols[key]
            this.defaultSymbols[key] = this.entryToCompletionItem(item)
        })
    }

    entryToCompletionItem(item: AutocompleteEntry) : CommandCompletionItem {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useTabStops = configuration.get('intellisense.useTabStops.enabled')
        const backslash = item.command[0] === ' ' ? '' : '\\'
        const command = new CommandCompletionItem(`${backslash}${item.command}`, vscode.CompletionItemKind.Function)
        if (item.snippet) {
            if (useTabStops) {
                item.snippet = item.snippet.replace(/\$\{(\d+):[^\}]*\}/g, '$$$1')
            }
            command.insertText = new vscode.SnippetString(item.snippet)
        } else {
            command.insertText = item.command
        }
        command.detail = item.detail
        command.documentation = item.documentation ? item.documentation : '`' + item.command + '`'
        command.packageName = item.package
        command.sortText = item.command.replace(/^[a-zA-Z]/, c => {
            const n = c.match(/[a-z]/) ? c.toUpperCase().charCodeAt(0) : c.toLowerCase().charCodeAt(0)
            return n !== undefined ? n.toString(16) : c
        })
        if (item.postAction) {
            command.command = { title: 'Post-Action', command: item.postAction }
        } else if (/[a-zA-Z]*([Cc]ite|ref)[a-zA-Z]*/.exec(item.command)) {
            // Automatically trigger completion if the command is for citation or reference
            command.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
        }
        return command
    }

    insertPkgCmds(pkg: string, suggestions) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (!(configuration.get('intellisense.package.enabled'))) {
            return
        }
        const useOptionalArgsEntries = configuration.get('intellisense.optionalArgsEntries.enabled')
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
                this.packageCmds[pkg] = {}
                const cmds = JSON.parse(fs.readFileSync(filePath).toString())
                Object.keys(cmds).forEach(cmd => {
                    if (cmd in suggestions) {
                        return
                    }
                    this.packageCmds[pkg][cmd] = this.entryToCompletionItem(cmds[cmd])
                })
            }
        }
        if (pkg in this.packageCmds) {
            Object.keys(this.packageCmds[pkg]).forEach(cmd => {
                if (!useOptionalArgsEntries && cmd.indexOf('[') > -1) {
                    return
                }
                suggestions[cmd] = this.packageCmds[pkg][cmd]
            })
        }
    }

    getPackage(filePath: string) {
        const content = fs.readFileSync(filePath, 'utf-8')
        const regex = /\\usepackage(?:\[[^\[\]\{\}]*\])?{(.*)}/g
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

    getCommandItems(content: string, filePath: string) : { [id: string]: AutocompleteEntry } {
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
                // Automatically trigger intellisense if the command matches citation, reference or ennvironment completion
                if (result[1].match(/([a-zA-Z]*(cite|ref)[a-zA-Z]*)|(begin)/)) {
                    items[result[1]].postAction = 'editor.action.triggerSuggest'
                }
            }
            if (result[3]) {
                items[result[1]].snippet += `{$\{2}}`
            }
            if (result[4]) {
                items[result[1]].snippet += `{$\{3}}`
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
    command: string
    snippet?: string
    detail?: string
    description?: string
    documentation?: string
    sortText?: string
    postAction?: string
    package?: string
}
