import * as vscode from 'vscode'
import * as fs from 'fs'
import {latexParser} from 'latex-utensils'

import type {Extension} from '../../main'
import {Environment, EnvSnippetType} from './environment'
import type {IProvider, ILwCompletionItem} from './interface'
import {CommandFinder, isTriggerSuggestNeeded, resolveCmdEnvFile} from './commandlib/commandfinder'
import {SurroundCommand} from './commandlib/surround'

type DataUnimathSymbolsJsonType = typeof import('../../../data/unimathsymbols.json')

export interface CmdItemEntry {
    readonly command: string, // frame
    snippet?: string,
    readonly package?: string,
    readonly label?: string, // \\begin{frame} ... \\end{frame}
    readonly detail?: string,
    readonly documentation?: string,
    readonly postAction?: string
}

export interface CmdSignature {
    readonly name: string, // name without leading `\`
    readonly args: string // {} for mandatory args and [] for optional args
}

function isCmdItemEntry(obj: any): obj is CmdItemEntry {
    return (typeof obj.command === 'string') && (typeof obj.snippet === 'string')
}

/**
 * Return {name, args} from a signature string `name` + `args`
 */
export function splitSignatureString(signature: string): CmdSignature {
    const i = signature.search(/[[{]/)
    if (i > -1) {
        return {
            name: signature.substring(0, i),
            args: signature.substring(i, undefined)
        }
    } else {
        return {
            name: signature,
            args: ''
        }
    }
}

export class Suggestion extends vscode.CompletionItem implements ILwCompletionItem {
    label: string
    package: string
    signature: CmdSignature

    constructor(label: string, pkg: string, signature: CmdSignature, kind: vscode.CompletionItemKind) {
        super(label, kind)
        this.label = label
        this.package = pkg
        this.signature = signature
    }

    /**
     * Return the signature, ie the name + {} for mandatory arguments + [] for optional arguments.
     * The leading backward slash is not part of the signature
     */
    signatureAsString(): string {
        return this.signature.name + this.signature.args
    }

    /**
     * Return the name without the arguments
     * The leading backward slash is not part of the signature
     */
    name(): string {
        return this.signature.name
    }

    hasOptionalArgs(): boolean {
        return this.signature.args.includes('[')
    }
}


export class Command implements IProvider {
    private readonly extension: Extension
    private readonly environment: Environment
    private readonly commandFinder: CommandFinder
    private readonly surroundCommand: SurroundCommand

    private readonly defaultCmds: Suggestion[] = []
    private readonly defaultSymbols: Suggestion[] = []
    private readonly packageCmds = new Map<string, Suggestion[]>()

    constructor(extension: Extension, environment: Environment) {
        this.extension = extension
        this.environment = environment
        this.commandFinder = new CommandFinder(extension)
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

    provideFrom(result: RegExpMatchArray, args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}) {
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

    private provide(languageId: string, document?: vscode.TextDocument, position?: vscode.Position): ILwCompletionItem[] {
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
        const cmdSignatureList: Set<string> = new Set<string>() // This holds defined commands signatures
        // Insert default commands
        this.defaultCmds.forEach(cmd => {
            if (!useOptionalArgsEntries && cmd.hasOptionalArgs()) {
                return
            }
            cmd.range = range
            suggestions.push(cmd)
            cmdSignatureList.add(cmd.signatureAsString())
        })

        // Insert unimathsymbols
        if (configuration.get('intellisense.unimathsymbols.enabled')) {
            if (this.defaultSymbols.length === 0) {
                const symbols: { [key: string]: CmdItemEntry } = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/unimathsymbols.json`).toString()) as DataUnimathSymbolsJsonType
                Object.keys(symbols).forEach(key => {
                    this.defaultSymbols.push(this.entryCmdToCompletion(key, symbols[key]))
                })
            }
            this.defaultSymbols.forEach(symbol => {
                suggestions.push(symbol)
                cmdSignatureList.add(symbol.name())
            })
        }

        // Insert commands from packages
        if ((configuration.get('intellisense.package.enabled'))) {
            const extraPackages = this.extension.completer.command.getExtraPkgs(languageId)
            if (extraPackages) {
                extraPackages.forEach(pkg => {
                    this.provideCmdInPkg(pkg, suggestions, cmdSignatureList)
                    this.environment.provideEnvsAsCommandInPkg(pkg, suggestions, cmdSignatureList)
                })
            }
            this.extension.manager.getIncludedTeX().forEach(tex => {
                const pkgs = this.extension.manager.getCachedContent(tex)?.element.package
                if (pkgs !== undefined) {
                    pkgs.forEach(pkg => {
                        this.provideCmdInPkg(pkg, suggestions, cmdSignatureList)
                        this.environment.provideEnvsAsCommandInPkg(pkg, suggestions, cmdSignatureList)
                    })
                }
            })
        }

        // Start working on commands in tex. To avoid over populating suggestions, we do not include
        // user defined commands, whose name matches a default command or one provided by a package
        const cmdNameList = new Set<string>(suggestions.map(e => e.signature.name))
        this.extension.manager.getIncludedTeX().forEach(tex => {
            const cmds = this.extension.manager.getCachedContent(tex)?.element.command
            if (cmds !== undefined) {
                cmds.forEach(cmd => {
                    if (!cmdNameList.has(cmd.name())) {
                        cmd.range = range
                        suggestions.push(cmd)
                        cmdNameList.add(cmd.name())
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
        // First, we must update the package list
        this.updatePkg(file, nodes, content)
        // Remove newcommand cmds, because they will be re-insert in the next step
        this.definedCmds.forEach((entry,cmd) => {
            if (entry.file === file) {
                this.definedCmds.delete(cmd)
            }
        })
        const cache = this.extension.manager.getCachedContent(file)
        if (cache === undefined) {
            return
        }
        if (nodes !== undefined) {
            cache.element.command = this.commandFinder.getCmdFromNodeArray(file, nodes)
        } else if (content !== undefined) {
            cache.element.command = this.commandFinder.getCmdFromContent(file, content)
        }
    }

    getExtraPkgs(languageId: string): string[] {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const extraPackages = Array.from(configuration.get('intellisense.package.extra') as string[])
        if (languageId === 'latex-expl3') {
            extraPackages.push('latex-document')
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
    private updatePkg(file: string, nodes?: latexParser.Node[], content?: string) {
        if (nodes !== undefined) {
            this.updatePkgWithNodeArray(file, nodes)
        } else if (content !== undefined) {
            const pkgReg = /\\usepackage(?:\[[^[\]{}]*\])?{(.*)}/g

            while (true) {
                const result = pkgReg.exec(content)
                if (result === null) {
                    break
                }
                result[1].split(',').forEach(pkg => {
                    pkg = pkg.trim()
                    if (pkg === '') {
                        return
                    }
                    const cache = this.extension.manager.getCachedContent(file)
                    if (cache === undefined) {
                        return
                    }
                    let filePkgs = cache.element.package
                    if (!filePkgs) {
                        filePkgs = new Set<string>()
                        cache.element.package = filePkgs
                    }
                    filePkgs.add(pkg)
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
                            const cache = this.extension.manager.getCachedContent(file)
                            if (cache === undefined) {
                                return
                            }
                            let pkgs = cache.element.package
                            if (!pkgs) {
                                pkgs = new Set<string>()
                                cache.element.package = pkgs
                            }
                            pkgs.add(pkg)
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
        const suggestion = new Suggestion(label, 'latex', splitSignatureString(itemKey), vscode.CompletionItemKind.Function)

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

    provideCmdInPkg(pkg: string, suggestions: vscode.CompletionItem[], cmdSignatureList: Set<string>) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useOptionalArgsEntries = configuration.get('intellisense.optionalArgsEntries.enabled')
        // Load command in pkg
        if (!this.packageCmds.has(pkg)) {
            const filePath: string | undefined = resolveCmdEnvFile(`${pkg}_cmd.json`, `${this.extension.extensionRoot}/data/packages/`)
            const pkgEntry: Suggestion[] = []
            if (filePath !== undefined) {
                try {
                    const cmds = JSON.parse(fs.readFileSync(filePath).toString()) as {[key: string]: CmdItemEntry}
                    Object.keys(cmds).forEach(key => {
                        if (isCmdItemEntry(cmds[key])) {
                            pkgEntry.push(this.entryCmdToCompletion(key, cmds[key]))
                        } else {
                            this.extension.logger.addLogMessage(`Cannot parse intellisense file: ${filePath}`)
                            this.extension.logger.addLogMessage(`Missing field in entry: "${key}": ${JSON.stringify(cmds[key])}`)
                        }
                    })
                } catch (e) {
                    this.extension.logger.addLogMessage(`Cannot parse intellisense file: ${filePath}`)
                }
            }
            this.packageCmds.set(pkg, pkgEntry)
        }

        // No package command defined
        const pkgEntry = this.packageCmds.get(pkg)
        if (!pkgEntry || pkgEntry.length === 0) {
            return
        }

        // Insert commands
        pkgEntry.forEach(cmd => {
            if (!useOptionalArgsEntries && cmd.hasOptionalArgs()) {
                return
            }
            if (!cmdSignatureList.has(cmd.signatureAsString())) {
                suggestions.push(cmd)
                cmdSignatureList.add(cmd.signatureAsString())
            }
        })
    }

}
