import * as vscode from 'vscode'
import * as fs from 'fs'
import {latexParser} from 'latex-utensils'

import type { Extension } from '../../main'
import type { IProvider, ICompletionItem } from '../completion'
import {CommandFinder, isTriggerSuggestNeeded} from './commandlib/commandfinder'
import {CmdEnvSuggestion, splitSignatureString, filterNonLetterSuggestions} from './completerutils'
import {CommandSignatureDuplicationDetector, CommandNameDuplicationDetector} from './commandlib/commandfinder'
import {SurroundCommand} from './commandlib/surround'

type DataUnimathSymbolsJsonType = typeof import('../../../data/unimathsymbols.json')

export type CmdType = {
    command: string,
    snippet?: string,
    option?: string,
    keyvals?: {key: string, snippet: string}[],
    detail?: string,
    documentation?: string,
    package?: string,
    label?: string,
    postAction?: string
}

export interface CmdSignature {
    readonly name: string, // name without leading `\`
    readonly args: string // {} for mandatory args and [] for optional args
}

function isCmdWithSnippet(obj: any): obj is CmdType {
    return (typeof obj.command === 'string') && (typeof obj.snippet === 'string')
}

export class Command implements IProvider {
    private readonly extension: Extension
    private readonly commandFinder: CommandFinder
    private readonly surroundCommand: SurroundCommand

    private readonly defaultCmds: CmdEnvSuggestion[] = []
    private readonly _defaultSymbols: CmdEnvSuggestion[] = []
    private readonly packageCmds = new Map<string, CmdEnvSuggestion[]>()

    constructor(extension: Extension) {
        this.extension = extension
        this.commandFinder = new CommandFinder(extension)
        this.surroundCommand = new SurroundCommand()
    }

    initialize(defaultCmds: {[key: string]: CmdType}, defaultEnvs: CmdEnvSuggestion[]) {
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
        defaultEnvs.forEach(cmd => {
            this.defaultCmds.push(cmd)
        })
    }

    get definedCmds() {
        return this.commandFinder.definedCmds
    }

    get defaultSymbols() {
        if (this._defaultSymbols.length === 0) {
            const symbols: { [key: string]: CmdType } = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/unimathsymbols.json`).toString()) as DataUnimathSymbolsJsonType
            Object.keys(symbols).forEach(key => {
                this._defaultSymbols.push(this.entryCmdToCompletion(key, symbols[key]))
            })
        }
        return this._defaultSymbols
    }

    getDefaultCmds(): CmdEnvSuggestion[] {
        return this.defaultCmds
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
        // Commands starting with a non letter character are not filtered properly because of wordPattern definition.
       return filterNonLetterSuggestions(suggestions, result[1], args.position)
    }

    private provide(languageId: string, document?: vscode.TextDocument, position?: vscode.Position): ICompletionItem[] {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useOptionalArgsEntries = configuration.get('intellisense.optionalArgsEntries.enabled')
        let range: vscode.Range | undefined = undefined
        if (document && position) {
            const startPos = document.lineAt(position).text.lastIndexOf('\\', position.character - 1)
            if (startPos >= 0) {
                range = new vscode.Range(position.line, startPos + 1, position.line, position.character)
            }
        }
        const suggestions: CmdEnvSuggestion[] = []
        const cmdDuplicationDetector = new CommandSignatureDuplicationDetector()
        // Insert default commands
        this.defaultCmds.forEach(cmd => {
            if (!useOptionalArgsEntries && cmd.hasOptionalArgs()) {
                return
            }
            cmd.range = range
            suggestions.push(cmd)
            cmdDuplicationDetector.add(cmd)
        })

        // Insert unimathsymbols
        if (configuration.get('intellisense.unimathsymbols.enabled')) {
            this.defaultSymbols.forEach(symbol => {
                suggestions.push(symbol)
                cmdDuplicationDetector.add(symbol)
            })
        }

        // Insert commands from packages
        if ((configuration.get('intellisense.package.enabled'))) {
            this.extension.completer.package.getPackagesIncluded(languageId).forEach(packageName => {
                this.provideCmdInPkg(packageName, suggestions, cmdDuplicationDetector)
                this.extension.completer.environment.provideEnvsAsCommandInPkg(packageName, suggestions, cmdDuplicationDetector)
            })
        }

        // Start working on commands in tex. To avoid over populating suggestions, we do not include
        // user defined commands, whose name matches a default command or one provided by a package
        const commandNameDuplicationDetector = new CommandNameDuplicationDetector(suggestions)
        this.extension.manager.getIncludedTeX().forEach(tex => {
            const cmds = this.extension.manager.getCachedContent(tex)?.element.command
            if (cmds !== undefined) {
                cmds.forEach(cmd => {
                    if (!commandNameDuplicationDetector.has(cmd)) {
                        cmd.range = range
                        suggestions.push(cmd)
                        commandNameDuplicationDetector.add(cmd)
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
        this.extension.manager.updateUsepackage(file, nodes, content)
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
            cache.element.command = this.commandFinder.getCmdFromNodeArray(file, nodes, new CommandNameDuplicationDetector())
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

    private entryCmdToCompletion(itemKey: string, item: CmdType): CmdEnvSuggestion {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useTabStops = configuration.get('intellisense.useTabStops.enabled')
        const backslash = item.command.startsWith(' ') ? '' : '\\'
        const label = item.label ? `${item.label}` : `${backslash}${item.command}`
        const suggestion = new CmdEnvSuggestion(label, 'latex', splitSignatureString(itemKey), vscode.CompletionItemKind.Function)

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

    setPackageCmds(packageName: string, cmds: {[key: string]: CmdType}) {
        const commands: CmdEnvSuggestion[] = []
        Object.keys(cmds).forEach(key => {
            cmds[key].package = packageName
            if (isCmdWithSnippet(cmds[key])) {
                commands.push(this.entryCmdToCompletion(key, cmds[key]))
            } else {
                this.extension.logger.addLogMessage(`Cannot parse intellisense file for ${packageName}.`)
                this.extension.logger.addLogMessage(`Missing field in entry: "${key}": ${JSON.stringify(cmds[key])}.`)
            }
        })
        this.packageCmds.set(packageName, commands)
    }

    provideCmdInPkg(pkg: string, suggestions: vscode.CompletionItem[], cmdDuplicationDetector: CommandSignatureDuplicationDetector) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useOptionalArgsEntries = configuration.get('intellisense.optionalArgsEntries.enabled')
        // Load command in pkg
        this.extension.completer.loadPackageData(pkg)

        // No package command defined
        const pkgCmds = this.packageCmds.get(pkg)
        if (!pkgCmds || pkgCmds.length === 0) {
            return
        }

        // Insert commands
        pkgCmds.forEach(cmd => {
            if (!useOptionalArgsEntries && cmd.hasOptionalArgs()) {
                return
            }
            if (!cmdDuplicationDetector.has(cmd)) {
                suggestions.push(cmd)
                cmdDuplicationDetector.add(cmd)
            }
        })
    }

}
