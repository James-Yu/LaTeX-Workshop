import * as vscode from 'vscode'
import * as fs from 'fs-extra'
import {latexParser} from 'latex-utensils'

import {Extension} from '../../main'
import {Environment, EnvSnippetType} from './environment'

interface CmdItemEntry {
    command: string, // frame
    snippet: string,
    package?: string,
    label?: string, // \\begin{frame} ... \\end{frame}
    detail?: string,
    documentation?: string,
    postAction?: string
}

export interface Suggestion extends vscode.CompletionItem {
    package: string
}

export class Command {
    extension: Extension
    private environment: Environment

    packages: string[] = []
    bracketCmds: {[key: string]: Suggestion} = {}
    definedCmds: {[key: string]: {file: string, location: vscode.Location}} = {}
    private defaultCmds: Suggestion[] = []
    private defaultSymbols: Suggestion[] = []
    private packageCmds: {[pkg: string]: Suggestion[]} = {}

    constructor(extension: Extension, environment: Environment) {
        this.extension = extension
        this.environment = environment
    }

    initialize(defaultCmds: {[key: string]: CmdItemEntry}) {
        const snippetReplacements = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.commandsJSON.replace') as {[key: string]: string}

        // Initialize default commands and `latex-mathsymbols`
        Object.keys(defaultCmds).forEach(key => {
            if (key in snippetReplacements) {
                const action = snippetReplacements[key]
                if (action !== '') {
                    defaultCmds[key].snippet = action
                    this.defaultCmds.push(this.entryCmdToCompletion(defaultCmds[key]))
                }
            } else {
                this.defaultCmds.push(this.entryCmdToCompletion(defaultCmds[key]))
            }
        })

        // Initialize default env begin-end pairs
        this.environment.getDefaultEnvs(EnvSnippetType.AsCommand).forEach(cmd => {
            this.defaultCmds.push(cmd)
        })

        // Handle special commands with brackets
        const bracketCmds = ['(', '[', '{', 'left(', 'left[', 'left\\{']
        this.defaultCmds.filter(cmd => bracketCmds.includes(this.getCmdName(cmd))).forEach(cmd => {
            this.bracketCmds[cmd.label.slice(1)] = cmd
        })
    }

    provide(languageId: string): vscode.CompletionItem[] {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useOptionalArgsEntries = configuration.get('intellisense.optionalArgsEntries.enabled')

        const suggestions: Suggestion[] = []
        const cmdList: string[] = [] // This holds defined commands without the backslash
        // Insert default commands
        this.defaultCmds.forEach(cmd => {
            if (!useOptionalArgsEntries && this.getCmdName(cmd).includes('[')) {
                return
            }
            suggestions.push(cmd)
            cmdList.push(this.getCmdName(cmd, true))
        })

        // Insert unimathsymbols
        if (configuration.get('intellisense.unimathsymbols.enabled')) {
            if (this.defaultSymbols.length === 0) {
                const symbols = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/unimathsymbols.json`).toString())
                Object.keys(symbols).forEach(key => {
                    this.defaultSymbols.push(this.entryCmdToCompletion(symbols[key]))
                })
            }
            this.defaultSymbols.forEach(symbol => {
                suggestions.push(symbol)
                cmdList.push(this.getCmdName(symbol, true))
            })
        }

        if (languageId === 'latex-expl3') {
            this.provideCmdInPkg('expl3', suggestions, cmdList)
        }
        // Insert commands from packages
        if ((configuration.get('intellisense.package.enabled'))) {
            const extraPackages = configuration.get('intellisense.package.extra') as string[]
            if (extraPackages) {
                extraPackages.forEach(pkg => {
                    this.provideCmdInPkg(pkg, suggestions, cmdList)
                    this.environment.provideEnvsAsCommandInPkg(pkg, suggestions, cmdList)
                })
            }
            this.extension.manager.getIncludedTeX().forEach(tex => {
                const pkgs = this.extension.manager.cachedContent[tex].element.package
                if (pkgs !== undefined) {
                    pkgs.forEach(pkg => {
                        this.provideCmdInPkg(pkg, suggestions, cmdList)
                        this.environment.provideEnvsAsCommandInPkg(pkg, suggestions, cmdList)
                    })
                }
            })
        }

        // Start working on commands in tex
        this.extension.manager.getIncludedTeX().forEach(tex => {
            const cmds = this.extension.manager.cachedContent[tex].element.command
            if (cmds !== undefined) {
                cmds.forEach(cmd => {
                    if (!cmdList.includes(this.getCmdName(cmd, true))) {
                        suggestions.push(cmd)
                        cmdList.push(this.getCmdName(cmd, true))
                    }
                })
            }
        })

        return suggestions
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
        this.provide(editor.document.languageId).forEach(item => {
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

    update(file: string, nodes?: latexParser.Node[], content?: string) {
        // Remove newcommand cmds, because they will be re-insert in the next step
        Object.keys(this.definedCmds).forEach(cmd => {
            if (this.definedCmds[cmd].file === file) {
                delete this.definedCmds[cmd]
            }
        })
        if (nodes !== undefined) {
            this.extension.manager.cachedContent[file].element.command = this.getCmdFromNodeArray(file, nodes)
        } else if (content !== undefined) {
            this.extension.manager.cachedContent[file].element.command = this.getCmdFromContent(file, content)
        }
    }

    getCmdName(item: Suggestion, removeArgs = false): string {
        const label = item.label.startsWith('\\') ? item.label.slice(1) : item.label
        const name = item.filterText ? item.filterText : label
        if (removeArgs) {
            const i = name.search(/[[{]/)
            return i > -1 ? name.substr(0, i): name
        }
        return name
    }

    private getCmdFromNodeArray(file: string, nodes: latexParser.Node[], cmdList: string[] = []): Suggestion[] {
        let cmds: Suggestion[] = []
        nodes.forEach(node => {
            cmds = cmds.concat(this.getCmdFromNode(file, node, cmdList))
        })
        return cmds
    }

    updatePkg(file: string, nodes?: latexParser.Node[], content?: string) {
        if (nodes !== undefined) {
            this.updatePkgWithNodeArray(file, nodes)
        } else if (content !== undefined) {
            const pkgReg = /\\usepackage(?:\[[^[\]{}]*\])?{(.*)}/g
            const pkgs: string[] = []

            if (this.extension.manager.cachedContent[file].element.package === undefined) {
                this.extension.manager.cachedContent[file].element.package = []
            }

            while (true) {
                const result = pkgReg.exec(content)
                if (result === null) {
                    break
                }
                result[1].split(',').forEach(pkg => {
                    pkg = pkg.trim()
                    if (pkgs.includes(pkg)) {
                        return
                    }
                    const filePkgs = this.extension.manager.cachedContent[file].element.package
                    if (filePkgs) {
                        filePkgs.push(pkg)
                    } else {
                        this.extension.manager.cachedContent[file].element.package = [pkg]
                    }
                })
            }
        }
    }

    updatePkgWithNodeArray(file: string, nodes: latexParser.Node[]) {
        nodes.forEach(node => {
            if ( latexParser.isCommand(node) && (node.name === 'usepackage' || node.name === 'documentclass') ) {
                node.args.forEach(arg => {
                    if (latexParser.isOptionalArg(arg)) {
                        return
                    }
                    for (const c of arg.content) {
                        if (!latexParser.isTextString(c)) {
                            continue
                        }
                        c.content.split(',').forEach(pkg => {
                            pkg = pkg.trim()
                            if (pkg === '') {
                                return
                            }
                            if (node.name === 'documentclass') {
                                pkg = 'class-' + pkg
                            }
                            const pkgs = this.extension.manager.cachedContent[file].element.package
                            if (pkgs) {
                                pkgs.push(pkg)
                            } else {
                                this.extension.manager.cachedContent[file].element.package = [pkg]
                            }
                        })
                    }
                })
            } else {
                if (latexParser.hasContentArray(node)) {
                    this.updatePkgWithNodeArray(file, node.content)
                }
            }
        })
    }

    private getCmdFromNode(file: string, node: latexParser.Node, cmdList: string[] = []): Suggestion[] {
        const cmds: Suggestion[] = []
        if (latexParser.isDefCommand(node)) {
           const name = node.token.slice(1)
            if (!cmdList.includes(name)) {
                const cmd: Suggestion = {
                    label: `\\${name}`,
                    kind: vscode.CompletionItemKind.Function,
                    documentation: '`' + name + '`',
                    insertText: new vscode.SnippetString(name + this.getArgsFromNode(node)),
                    filterText: name,
                    package: ''
                }
                cmds.push(cmd)
                cmdList.push(name)
            }
        } else if (latexParser.isCommand(node)) {
            if (!cmdList.includes(node.name)) {
                const cmd: Suggestion = {
                    label: `\\${node.name}`,
                    kind: vscode.CompletionItemKind.Function,
                    documentation: '`' + node.name + '`',
                    insertText: new vscode.SnippetString(node.name + this.getArgsFromNode(node)),
                    filterText: node.name,
                    package: ''
                }
                if (node.name.match(/([a-zA-Z]*(cite|ref)[a-zA-Z]*)|bibentry|begin/)) {
                    cmd.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
                }
                cmds.push(cmd)
                cmdList.push(node.name)
            }
            if (['newcommand', 'renewcommand', 'providecommand', 'DeclarePairedDelimiter', 'DeclarePairedDelimiterX', 'DeclarePairedDelimiterXPP'].includes(node.name) &&
                Array.isArray(node.args) && node.args.length > 0) {
                const label = (node.args[0].content[0] as latexParser.Command).name
                let args = ''
                if (latexParser.isOptionalArg(node.args[1])) {
                    const numArgs = parseInt((node.args[1].content[0] as latexParser.TextString).content)
                    for (let i = 1; i <= numArgs; ++i) {
                        args += '{${' + i + '}}'
                    }
                }
                if (!cmdList.includes(label)) {
                    const cmd: Suggestion = {
                        label: `\\${label}`,
                        kind: vscode.CompletionItemKind.Function,
                        documentation: '`' + label + '`',
                        insertText: new vscode.SnippetString(label + args),
                        filterText: label,
                        package: 'user-defined'
                    }
                    cmds.push(cmd)
                    this.definedCmds[label] = {
                        file,
                        location: new vscode.Location(
                            vscode.Uri.file(file),
                            new vscode.Position(node.location.start.line - 1, node.location.start.column))
                    }
                    cmdList.push(label)
                }
            }
        }
        if (latexParser.hasContentArray(node)) {
            return cmds.concat(this.getCmdFromNodeArray(file, node.content, cmdList))
        }
        return cmds
    }

    private getArgsFromNode(node: latexParser.Node): string {
        let args = ''
        if (!('args' in node)) {
            return args
        }
        let index = 0
        if (latexParser.isCommand(node)) {
            node.args.forEach(arg => {
                ++index
                if (latexParser.isOptionalArg(arg)) {
                    args += '[${' + index + '}]'
                } else {
                    args += '{${' + index + '}}'
                }
            })
            return args
        }
        if (latexParser.isDefCommand(node)) {
            node.args.forEach(arg => {
                ++index
                if (latexParser.isCommandParameter(arg)) {
                    args += '{${' + index + '}}'
                }
            })
            return args
        }
        return args
    }

    private getCmdFromContent(file: string, content: string): Suggestion[] {
        const cmdReg = /\\([a-zA-Z@_]+(?::[a-zA-Z]*)?)({[^{}]*})?({[^{}]*})?({[^{}]*})?/g
        const cmds: Suggestion[] = []
        const cmdList: string[] = []
        let explSyntaxOn: boolean = false
        while (true) {
            const result = cmdReg.exec(content)
            if (result === null) {
                break
            }
            if (result[1] === 'ExplSyntaxOn') {
                explSyntaxOn = true
                continue
            } else if (result[1] === 'ExplSyntaxOff') {
                explSyntaxOn = false
                continue
            }


            if (!explSyntaxOn) {
                const len = result[1].search(/[_:]/)
                if (len > -1) {
                    result[1] = result[1].slice(0, len)
                }
            }
            if (cmdList.includes(result[1])) {
                continue
            }
            const cmd: Suggestion = {
                label: `\\${result[1]}`,
                kind: vscode.CompletionItemKind.Function,
                documentation: '`' + result[1] + '`',
                insertText: new vscode.SnippetString(this.getArgsFromRegResult(result)),
                filterText: result[1],
                package: ''
            }
            if (result[1].match(/([a-zA-Z]*(cite|ref)[a-zA-Z]*)|bibentry|begin/)) {
                cmd.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
            }
            cmds.push(cmd)
            cmdList.push(result[1])
        }

        const newCommandReg = /\\(?:(?:(?:re|provide)?(?:new)?command)|(?:DeclarePairedDelimiter(?:X|XPP)?))(?:{)?\\(\w+)/g
        while (true) {
            const result = newCommandReg.exec(content)
            if (result === null) {
                break
            }
            if (cmdList.includes(result[1])) {
                continue
            }

            const cmd: Suggestion = {
                label: `\\${result[1]}`,
                kind: vscode.CompletionItemKind.Function,
                documentation: '`' + result[1] + '`',
                insertText: result[1],
                filterText: result[1],
                package: 'user-defined'
            }
            cmds.push(cmd)
            cmdList.push(result[1])

            this.definedCmds[result[1]] = {
                file,
                location: new vscode.Location(
                    vscode.Uri.file(file),
                    new vscode.Position(content.substr(0, result.index).split('\n').length - 1, 0))
            }
        }

        return cmds
    }

    private getArgsFromRegResult(result: RegExpExecArray): string {
        let text = result[1]

        if (result[2]) {
            text += '{${1}}'
        }
        if (result[3]) {
            text += '{${2}}'
        }
        if (result[4]) {
            text += '{${3}}'
        }
        return text
    }

    private entryCmdToCompletion(item: CmdItemEntry): Suggestion {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useTabStops = configuration.get('intellisense.useTabStops.enabled')
        const backslash = item.command.startsWith(' ') ? '' : '\\'
        const label = item.label ? `${item.label}` : `${backslash}${item.command}`
        const suggestion: Suggestion = {
            label,
            kind: vscode.CompletionItemKind.Function,
            package: 'latex'
        }

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
            this.packageCmds[pkg] = []
            if (fs.existsSync(filePath)) {
                const cmds = JSON.parse(fs.readFileSync(filePath).toString())
                Object.keys(cmds).forEach(key => {
                    this.packageCmds[pkg].push(this.entryCmdToCompletion(cmds[key]))
                })
            }
        }

        // No package command defined
        if (!(pkg in this.packageCmds) || this.packageCmds[pkg].length === 0) {
            return
        }

        // Insert commands
        this.packageCmds[pkg].forEach(cmd => {
            if (!useOptionalArgsEntries && this.getCmdName(cmd).includes('[')) {
                return
            }
            if (!cmdList.includes(this.getCmdName(cmd))) {
                suggestions.push(cmd)
                cmdList.push(this.getCmdName(cmd))
            }
        })
    }
}
