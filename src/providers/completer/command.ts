import * as vscode from 'vscode'
import * as fs from 'fs-extra'
import {latexParser} from 'latex-utensils'

import type {Extension} from '../../main'
import {Environment, EnvSnippetType} from './environment'
import type {IProvider} from './interface'
import {CommandFinder, isTriggerSuggestNeeded, resolveCmdEnvFile} from './commandlib/commandfinder'
import {SurroundCommand} from './commandlib/surround'

interface CmdItemEntry {
    command: string, // frame
    snippet: string,
    package?: string,
    label?: string, // \\begin{frame} ... \\end{frame}
    detail?: string,
    documentation?: string,
    postAction?: string
}

function isCmdItemEntry(obj: any): obj is CmdItemEntry {
    return (typeof obj.command === 'string') && (typeof obj.snippet === 'string')
}

export interface Suggestion extends vscode.CompletionItem {
    package: string
}


export class Command implements IProvider {
    private readonly extension: Extension
    private readonly environment: Environment
    private readonly commandFinder: CommandFinder
    private readonly surroundCommand: SurroundCommand

    private readonly defaultCmds: Suggestion[] = []
    private readonly defaultSymbols: Suggestion[] = []
    private packageCmds: {[pkg: string]: Suggestion[]} = {}

    constructor(extension: Extension, environment: Environment) {
        this.extension = extension
        this.environment = environment
        this.commandFinder = new CommandFinder()
        this.surroundCommand = new SurroundCommand()
    }

    initialize(defaultCmds: {[key: string]: CmdItemEntry}) {
        const snippetReplacements = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.commandsJSON.replace') as {[key: string]: string}

        // Initialize default commands and `latex-mathsymbols`
        Object.keys(defaultCmds).forEach(key => {
            if (key in snippetReplacements) {
                const action = snippetReplacements[key]
                if (action === '') {
                    return
                }
                defaultCmds[key].snippet = action
            }
            this.defaultCmds.push(this.entryCmdToCompletion(key, defaultCmds[key]))
        })

        // Initialize default env begin-end pairs
        this.environment.getDefaultEnvs(EnvSnippetType.AsCommand).forEach(cmd => {
            this.defaultCmds.push(cmd)
        })
    }

    get definedCmds() {
        return this.commandFinder.definedCmds
    }

    provideFrom(_type: string, result: RegExpMatchArray, args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}) {
        const suggestions = this.provide(args.document.languageId, args.document, args.position)
        // Commands ending with (, { or [ are not filtered properly by vscode intellisense. So we do it by hand.
        if (result[0].match(/[({[]$/)) {
            const exactSuggestion = suggestions.filter(entry => entry.label === result[0])
            if (exactSuggestion.length > 0) {
                return exactSuggestion
            }
        }
        return suggestions
    }

    private provide(languageId: string, document?: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useOptionalArgsEntries = configuration.get('intellisense.optionalArgsEntries.enabled')
        let range: vscode.Range | undefined = undefined
        if (document && position) {
            const startPos = document.lineAt(position).text.lastIndexOf('\\', position.character - 1)
            if (startPos >= 0) {
                range = new vscode.Range(position.line, startPos + 1, position.line, position.character)
            }
        }
        const suggestions: Suggestion[] = []
        const cmdList: string[] = [] // This holds defined commands without the backslash
        // Insert default commands
        this.defaultCmds.forEach(cmd => {
            if (!useOptionalArgsEntries && this.getCmdName(cmd).includes('[')) {
                return
            }
            cmd.range = range
            suggestions.push(cmd)
            cmdList.push(this.getCmdName(cmd, true))
        })

        // Insert unimathsymbols
        if (configuration.get('intellisense.unimathsymbols.enabled')) {
            if (this.defaultSymbols.length === 0) {
                const symbols = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/unimathsymbols.json`).toString())
                Object.keys(symbols).forEach(key => {
                    this.defaultSymbols.push(this.entryCmdToCompletion(key, symbols[key]))
                })
            }
            this.defaultSymbols.forEach(symbol => {
                suggestions.push(symbol)
                cmdList.push(this.getCmdName(symbol, true))
            })
        }

        // Insert commands from packages
        if ((configuration.get('intellisense.package.enabled'))) {
            const extraPackages = this.extension.completer.command.getExtraPkgs(languageId)
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
                        cmd.range = range
                        suggestions.push(cmd)
                        cmdList.push(this.getCmdName(cmd, true))
                    }
                })
            }
        })

        return suggestions
    }

    /**
     * Surrounds `content` with a command picked in QuickPick.
     *
     * @param content A string to be surrounded. If not provided, then we loop over all the selections and surround each of them.
     */
    surround() {
        if (!vscode.window.activeTextEditor) {
            return
        }
        const editor = vscode.window.activeTextEditor
        const cmdItems = this.provide(editor.document.languageId)
        this.surroundCommand.surround(cmdItems)
    }

    /**
     * Updates the Manager cache for commands used in `file` with `nodes`.
     * If `nodes` is `undefined`, `content` is parsed with regular expressions,
     * and the result is used to update the cache.
     * @param file The path of a LaTeX file.
     * @param nodes AST of a LaTeX file.
     * @param content The content of a LaTeX file.
     */
    update(file: string, nodes?: latexParser.Node[], content?: string) {
        // Remove newcommand cmds, because they will be re-insert in the next step
        Object.keys(this.definedCmds).forEach(cmd => {
            if (this.definedCmds[cmd].file === file) {
                delete this.definedCmds[cmd]
            }
        })
        if (nodes !== undefined) {
            this.extension.manager.cachedContent[file].element.command = this.commandFinder.getCmdFromNodeArray(file, nodes)
        } else if (content !== undefined) {
            this.extension.manager.cachedContent[file].element.command = this.commandFinder.getCmdFromContent(file, content)
        }
    }

    /**
     * Returns the name of `item`. The backward slahsh, `\`, is removed.
     *
     * @param item A completion item.
     * @param removeArgs If `true`, returns a name without arguments.
     */
    getCmdName(item: Suggestion, removeArgs = false): string {
        const label = item.label.startsWith('\\') ? item.label.slice(1) : item.label
        const name = item.filterText ? item.filterText : label
        if (removeArgs) {
            const i = name.search(/[[{]/)
            return i > -1 ? name.substr(0, i): name
        }
        return name
    }

    getExtraPkgs(languageId: string): string[] {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const extraPackages = Object.assign(configuration.get('intellisense.package.extra') as string[])
        if (languageId === 'latex-expl3') {
            extraPackages.push('expl3')
        } else if (languageId === 'latex') {
            extraPackages.push('latex-document')
        }
        return extraPackages
    }

    /**
     * Updates the Manager cache for packages used in `file` with `nodes`.
     * If `nodes` is `undefined`, `content` is parsed with regular expressions,
     * and the result is used to update the cache.
     *
     * @param file The path of a LaTeX file.
     * @param nodes AST of a LaTeX file.
     * @param content The content of a LaTeX file.
     */
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

    private updatePkgWithNodeArray(file: string, nodes: latexParser.Node[]) {
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


    private entryCmdToCompletion(itemKey: string, item: CmdItemEntry): Suggestion {
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
                item.snippet = item.snippet.replace(/\$\{(\d+):[^$}]*\}/g, '$${$1}')
            }
            // Wrap the selected text when there is a single placeholder
            if (! (item.snippet.match(/\$\{?2/) || (item.snippet.match(/\$\{?0/) && item.snippet.match(/\$\{?1/)))) {
                item.snippet = item.snippet.replace(/\$1|\$\{1\}/, '$${1:$${TM_SELECTED_TEXT}}').replace(/\$\{1:([^$}]+)\}/, '$${1:$${TM_SELECTED_TEXT:$1}}')
            }
            suggestion.insertText = new vscode.SnippetString(item.snippet)
        } else {
            suggestion.insertText = item.command
        }
        suggestion.filterText = itemKey
        suggestion.detail = item.detail
        suggestion.documentation = item.documentation ? item.documentation : '`' + item.command + '`'
        suggestion.sortText = item.command.replace(/^[a-zA-Z]/, c => {
            const n = c.match(/[a-z]/) ? c.toUpperCase().charCodeAt(0): c.toLowerCase().charCodeAt(0)
            return n !== undefined ? n.toString(16): c
        })
        if (item.postAction) {
            suggestion.command = { title: 'Post-Action', command: item.postAction }
        } else if (isTriggerSuggestNeeded(item.command)) {
            // Automatically trigger completion if the command is for citation, filename, reference or glossary
            suggestion.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
        }
        return suggestion
    }

    private provideCmdInPkg(pkg: string, suggestions: vscode.CompletionItem[], cmdList: string[]) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useOptionalArgsEntries = configuration.get('intellisense.optionalArgsEntries.enabled')
        // Load command in pkg
        if (!(pkg in this.packageCmds)) {
            const filePath: string | undefined = resolveCmdEnvFile(`${pkg}_cmd.json`, `${this.extension.extensionRoot}/data/packages/`)
            this.packageCmds[pkg] = []
            if (filePath !== undefined) {
                try {
                    const cmds: {[key: string]: CmdItemEntry} = JSON.parse(fs.readFileSync(filePath).toString())
                    Object.keys(cmds).forEach(key => {
                        if (isCmdItemEntry(cmds[key])) {
                            this.packageCmds[pkg].push(this.entryCmdToCompletion(key, cmds[key]))
                        } else {
                            this.extension.logger.addLogMessage(`Cannot parse intellisense file: ${filePath}`)
                            this.extension.logger.addLogMessage(`Missing field in entry: "${key}": ${JSON.stringify(cmds[key])}`)
                        }
                    })
                } catch (e) {
                    this.extension.logger.addLogMessage(`Cannot parse intellisense file: ${filePath}`)
                }
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
