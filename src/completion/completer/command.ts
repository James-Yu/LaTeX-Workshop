import * as vscode from 'vscode'
import * as fs from 'fs'
import type * as Ast from '@unified-latex/unified-latex-types'
import { lw, registerDisposable } from '../../lw'
import { FileCache } from '../../types'

import type { IProvider, ICompletionItem, PkgType, IProviderArgs } from '../latex'
import { CmdEnvSuggestion, splitSignatureString, filterNonLetterSuggestions, filterArgumentHint } from './completerutils'
import {SurroundCommand} from './commandlib/surround'
import { Environment, EnvSnippetType } from './environment'

import { getLogger } from '../../utils/logging/logger'

const logger = getLogger('Intelli', 'Command')

type DataUnimathSymbolsJsonType = typeof import('../../../data/unimathsymbols.json')

export type CmdType = {
    /** Name of the command without the leading \ and with argument signature */
    command?: string,
    /** Snippet to be inserted after the leading \ */
    snippet?: string,
    /** The option of package below that activates this cmd */
    option?: string,
    /** Possible options of this env */
    keyvals?: string[],
    /** The index of keyval list in package .json file. Should not be used */
    keyvalindex?: number,
    /** The index of argument which have the keyvals */
    keyvalpos?: number,
    detail?: string,
    documentation?: string,
    /** The package providing the environment */
    package?: string,
    /** The action to be executed after inserting the snippet */
    postAction?: string
}

export function isTriggerSuggestNeeded(name: string): boolean {
    const reg = /^(?:[a-z]*(cite|ref|input)[a-z]*|begin|bibitem|(sub)?(import|includefrom|inputfrom)|gls(?:pl|text|first|plural|firstplural|name|symbol|desc|user(?:i|ii|iii|iv|v|vi))?|Acr(?:long|full|short)?(?:pl)?|ac[slf]?p?)/i
    return reg.test(name)
}

function isCmdWithSnippet(obj: any): obj is CmdType {
    return (typeof obj.command === 'string') && (typeof obj.snippet === 'string')
}

export class Command implements IProvider {

    definedCmds = new Map<string, {filePath: string, location: vscode.Location}>()
    defaultCmds: CmdEnvSuggestion[] = []
    private readonly defaultSymbols: CmdEnvSuggestion[] = []
    private readonly packageCmds = new Map<string, CmdEnvSuggestion[]>()

    constructor() {
        const symbols: { [key: string]: CmdType } = JSON.parse(fs.readFileSync(`${lw.extensionRoot}/data/unimathsymbols.json`).toString()) as DataUnimathSymbolsJsonType
        Object.entries(symbols).forEach(([key, symbol]) => this.defaultSymbols.push(this.entryCmdToCompletion(key, symbol)))

        registerDisposable(vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
            if (!e.affectsConfiguration('latex-workshop.intellisense.command.user') &&
                !e.affectsConfiguration('latex-workshop.intellisense.package.exclude')) {
                return
            }
            this.initialize(lw.completer.environment)
        }))
    }

    initialize(environment: Environment) {
        const excludeDefault = (vscode.workspace.getConfiguration('latex-workshop').get('intellisense.package.exclude') as string[]).includes('lw-default')
        const cmds = excludeDefault ? {} : JSON.parse(fs.readFileSync(`${lw.extensionRoot}/data/commands.json`, {encoding: 'utf8'})) as {[key: string]: CmdType}
        const maths = excludeDefault ? {} : (JSON.parse(fs.readFileSync(`${lw.extensionRoot}/data/packages/tex.json`, {encoding: 'utf8'})) as PkgType).cmds
        Object.assign(maths, cmds)
        Object.entries(maths).forEach(([key, cmd]) => {
            cmd.command = key
            cmd.snippet = cmd.snippet || key
        })

        const defaultEnvs = environment.getDefaultEnvs(EnvSnippetType.AsCommand)

        const userCmds = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.command.user') as {[key: string]: string}
        Object.entries(userCmds).forEach(([key, snippet]) => {
            if (maths[key] && snippet !== '') {
                maths[key].snippet = snippet
            } else if (maths[key] && snippet === '') {
                delete maths[key]
            } else {
                maths[key] = { snippet }
            }
        })

        this.defaultCmds = []

        // Initialize default commands and the ones in `tex.json`
        Object.entries(maths).forEach(([key, cmd]) => this.defaultCmds.push(this.entryCmdToCompletion(key, cmd)))

        // Initialize default env begin-end pairs
        defaultEnvs.forEach(cmd => {
            this.defaultCmds.push(cmd)
        })
    }

    provideFrom(result: RegExpMatchArray, args: IProviderArgs) {
        const suggestions = this.provide(args.langId, args.line, args.position)
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

    private provide(langId: string, line?: string, position?: vscode.Position): ICompletionItem[] {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useOptionalArgsEntries = configuration.get('intellisense.optionalArgsEntries.enabled')
        let range: vscode.Range | undefined = undefined
        if (line && position) {
            const startPos = line.lastIndexOf('\\', position.character - 1)
            if (startPos >= 0) {
                range = new vscode.Range(position.line, startPos + 1, position.line, position.character)
            }
        }
        const suggestions: CmdEnvSuggestion[] = []
        let defined = new Set<string>()
        // Insert default commands
        this.defaultCmds.forEach(cmd => {
            if (!useOptionalArgsEntries && cmd.hasOptionalArgs()) {
                return
            }
            cmd.range = range
            suggestions.push(cmd)
            defined.add(cmd.signatureAsString())
        })

        // Insert unimathsymbols
        if (configuration.get('intellisense.unimathsymbols.enabled')) {
            this.defaultSymbols.forEach(symbol => {
                suggestions.push(symbol)
                defined.add(symbol.signatureAsString())
            })
        }

        // Insert commands from packages
        if ((configuration.get('intellisense.package.enabled'))) {
            const packages = lw.completer.package.getPackagesIncluded(langId)
            Object.entries(packages).forEach(([packageName, options]) => {
                this.provideCmdInPkg(packageName, options, suggestions)
                lw.completer.environment.provideEnvsAsCommandInPkg(packageName, options, suggestions, defined)
            })
        }

        // Start working on commands in tex. To avoid over populating suggestions, we do not include
        // user defined commands, whose name matches a default command or one provided by a package
        defined = new Set<string>(suggestions.map(s => s.signatureAsString()))
        lw.cache.getIncludedTeX().forEach(tex => {
            const cmds = lw.cache.get(tex)?.elements.command
            if (cmds !== undefined) {
                cmds.forEach(cmd => {
                    if (!defined.has(cmd.signatureAsString())) {
                        cmd.range = range
                        suggestions.push(cmd)
                        defined.add(cmd.signatureAsString())
                    }
                })
            }
        })

        filterArgumentHint(suggestions)

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
        SurroundCommand.surround(cmdItems)
    }

    parse(cache: FileCache) {
        // Remove newcommand cmds, because they will be re-insert in the next step
        this.definedCmds.forEach((entry,cmd) => {
            if (entry.filePath === cache.filePath) {
                this.definedCmds.delete(cmd)
            }
        })
        if (cache.ast !== undefined) {
            cache.elements.command = this.parseAst(cache.ast, cache.filePath)
        } else {
            cache.elements.command = this.parseContent(cache.content, cache.filePath)
        }
    }

    private parseAst(node: Ast.Node, filePath: string, defined?: Set<string>): CmdEnvSuggestion[] {
        defined = defined ?? new Set<string>()
        let cmds: CmdEnvSuggestion[] = []
        let found = false
        let name = ''
        let args = ''
        if (node.type === 'macro' &&
            ['renewcommand', 'newcommand'].includes(node.content) &&
            node.args?.[2]?.content?.[0]?.type === 'macro') {
            // \newcommand{\fix}[3][]{\chdeleted{#2}\chadded[comment={#1}]{#3}}
            // \newcommand\WARNING{\textcolor{red}{WARNING}}
            found = true
            name = node.args[2].content[0].content
            if (node.args?.[3].content?.[0]?.type === 'string' &&
                parseInt(node.args?.[3].content?.[0].content) > 0) {
                args = (node.args?.[4].openMark === '[' ? '[]' : '{}') + '{}'.repeat(parseInt(node.args?.[3].content?.[0].content) - 1)
            }
        } else if (node.type === 'macro' &&
            ['DeclarePairedDelimiter', 'DeclarePairedDelimiterX', 'DeclarePairedDelimiterXPP'].includes(node.content) &&
            node.args?.[0]?.content?.[0]?.type === 'macro') {
            // \DeclarePairedDelimiterX\braketzw[2]{\langle}{\rangle}{#1\,\delimsize\vert\,\mathopen{}#2}
            found = true
            name = node.args[0].content[0].content
            if (['DeclarePairedDelimiterX', 'DeclarePairedDelimiterXPP'].includes(node.content) &&
                node.args?.[1].content?.[0]?.type === 'string' &&
                parseInt(node.args?.[1].content?.[0].content) > 0) {
                args = (node.args?.[2].openMark === '[' ? '[]' : '{}') + '{}'.repeat(parseInt(node.args?.[1].content?.[0].content) - 1)
            }
        } else if (node.type === 'macro' &&
            ['providecommand', 'DeclareMathOperator', 'DeclareRobustCommand'].includes(node.content) &&
            node.args?.[1]?.content?.[0]?.type === 'macro') {
            found = true
            name = node.args[1].content[0].content
            if (node.args?.[2].content?.[0]?.type === 'string' &&
                parseInt(node.args?.[2].content?.[0].content) > 0) {
                args = (node.args?.[3].openMark === '[' ? '[]' : '{}') + '{}'.repeat(parseInt(node.args?.[2].content?.[0].content) - 1)
            }
        }

        if (found && !defined.has(`${name}${args}`)) {
            const cmd = new CmdEnvSuggestion(`\\${name}${args}`, 'user-defined', [], -1, {name, args}, vscode.CompletionItemKind.Function)
            cmd.documentation = '`' + name + '`'
            let argTabs = args
            let index = 0
            while (argTabs.includes('[]')) {
                argTabs = argTabs.replace('[]', '[${' + (index + 1) + '}]')
                index++
            }
            while (argTabs.includes('{}')) {
                argTabs = argTabs.replace('{}', '{${' + (index + 1) + '}}')
                index++
            }
            cmd.insertText = new vscode.SnippetString(name + argTabs)
            cmd.filterText = name
            if (isTriggerSuggestNeeded(name)) {
                cmd.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
            }
            cmds.push(cmd)
            this.definedCmds.set(cmd.signatureAsString(), {
                filePath,
                location: new vscode.Location(
                    vscode.Uri.file(filePath),
                    new vscode.Position(
                        (node.position?.start.line ?? 1) - 1,
                        (node.position?.start.column ?? 1) - 1))
            })
            defined.add(cmd.signatureAsString())
        }

        if ('content' in node && typeof node.content !== 'string') {
            for (const subNode of node.content) {
                cmds = [...cmds, ...this.parseAst(subNode, filePath, defined)]
            }
        }

        return cmds
    }

    private parseContent(content: string, filePath: string): CmdEnvSuggestion[] {
        const cmdInPkg: CmdEnvSuggestion[] = []
        const packages = lw.completer.package.getPackagesIncluded('latex-expl3')
        Object.entries(packages).forEach(([packageName, options]) => {
            this.provideCmdInPkg(packageName, options, cmdInPkg)
        })
        const cmdReg = /\\([a-zA-Z@_]+(?::[a-zA-Z]*)?\*?)({[^{}]*})?({[^{}]*})?({[^{}]*})?/g
        const cmds: CmdEnvSuggestion[] = []
        const defined = new Set<string>()
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
            const args = '{}'.repeat(result.length - 1)
            const cmd = new CmdEnvSuggestion(
                `\\${result[1]}${args}`,
                cmdInPkg.find(candidate => candidate.signatureAsString() === result[1] + args)?.package ?? '',
                [],
                -1,
                { name: result[1], args },
                vscode.CompletionItemKind.Function
            )
            cmd.documentation = '`' + result[1] + '`'
            cmd.insertText = new vscode.SnippetString(
                result[1] + (result[2] ? '{${1}}' : '') + (result[3] ? '{${2}}' : '') + (result[4] ? '{${3}}' : ''))
            cmd.filterText = result[1]
            if (isTriggerSuggestNeeded(result[1])) {
                cmd.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
            }
            if (!defined.has(cmd.signatureAsString())) {
                cmds.push(cmd)
                defined.add(cmd.signatureAsString())
            }
        }

        const newCommandReg = /\\(?:(?:(?:re|provide)?(?:new)?command)|(?:DeclarePairedDelimiter(?:X|XPP)?)|DeclareMathOperator)\*?{?\\(\w+)}?(?:\[([1-9])\])?/g
        while (true) {
            const result = newCommandReg.exec(content)
            if (result === null) {
                break
            }

            let tabStops = ''
            let args = ''
            if (result[2]) {
                const numArgs = parseInt(result[2])
                for (let i = 1; i <= numArgs; ++i) {
                    tabStops += '{${' + i + '}}'
                    args += '{}'
                }
            }

            const cmd = new CmdEnvSuggestion(`\\${result[1]}${args}`, 'user-defined', [], -1, {name: result[1], args}, vscode.CompletionItemKind.Function)
            cmd.documentation = '`' + result[1] + '`'
            cmd.insertText = new vscode.SnippetString(result[1] + tabStops)
            cmd.filterText = result[1]
            if (!defined.has(cmd.signatureAsString())) {
                cmds.push(cmd)
                defined.add(cmd.signatureAsString())
            }

            this.definedCmds.set(result[1], {
                filePath,
                location: new vscode.Location(
                    vscode.Uri.file(filePath),
                    new vscode.Position(content.substring(0, result.index).split('\n').length - 1, 0))
            })
        }

        return cmds
    }

    private entryCmdToCompletion(itemKey: string, item: CmdType): CmdEnvSuggestion {
        item.command = item.command || itemKey
        const backslash = item.command.startsWith(' ') ? '' : '\\'
        const suggestion = new CmdEnvSuggestion(
            `${backslash}${item.command}`,
            item.package || 'latex',
            item.keyvals && typeof(item.keyvals) !== 'number' ? item.keyvals : [],
            item.keyvalpos === undefined ? -1 : item.keyvalpos,
            splitSignatureString(itemKey),
            vscode.CompletionItemKind.Function,
            item.option)

        if (item.snippet) {
            // Wrap the selected text when there is a single placeholder
            if (! (item.snippet.match(/\$\{?2/) || (item.snippet.match(/\$\{?0/) && item.snippet.match(/\$\{?1/)))) {
                item.snippet = item.snippet.replace(/\$1|\$\{1\}/, '$${1:$${TM_SELECTED_TEXT}}').replace(/\$\{1:([^$}]+)\}/, '$${1:$${TM_SELECTED_TEXT:$1}}')
            }
            suggestion.insertText = new vscode.SnippetString(item.snippet)
        } else {
            suggestion.insertText = item.command
        }
        suggestion.filterText = itemKey
        suggestion.detail = item.detail || `\\${item.snippet?.replace(/\$\{\d+:([^$}]*)\}/g, '$1')}`
        suggestion.documentation = item.documentation ? item.documentation : `Command \\${item.command}.`
        if (item.package) {
            suggestion.documentation += ` From package: ${item.package}.`
        }
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
        Object.entries(cmds).forEach(([key, cmd]) => {
            cmd.package = packageName
            if (isCmdWithSnippet(cmd)) {
                commands.push(this.entryCmdToCompletion(key, cmd))
            } else {
                logger.log(`Cannot parse intellisense file for ${packageName}.`)
                logger.log(`Missing field in entry: "${key}": ${JSON.stringify(cmd)}.`)
            }
        })
        this.packageCmds.set(packageName, commands)
    }

    getPackageCmds(packageName: string) {
        return this.packageCmds.get(packageName) || []
    }

    provideCmdInPkg(packageName: string, options: string[], suggestions: CmdEnvSuggestion[]) {
        const defined = new Set<string>()
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useOptionalArgsEntries = configuration.get('intellisense.optionalArgsEntries.enabled')
        // Load command in pkg
        lw.completer.loadPackageData(packageName)

        // No package command defined
        const pkgCmds = this.packageCmds.get(packageName)
        if (!pkgCmds || pkgCmds.length === 0) {
            return
        }

        // Insert commands
        pkgCmds.forEach(cmd => {
            if (!useOptionalArgsEntries && cmd.hasOptionalArgs()) {
                return
            }
            if (!defined.has(cmd.signatureAsString())) {
                if (cmd.option && options && !options.includes(cmd.option)) {
                    return
                }
                suggestions.push(cmd)
                defined.add(cmd.signatureAsString())
            }
        })
    }

}
