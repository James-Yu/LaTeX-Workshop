import * as vscode from 'vscode'
import * as fs from 'fs'
import { latexParser } from 'latex-utensils'
import * as lw from '../../lw'
import type { ICompletionItem, IProviderArgs } from '../completion'
import type { IProvider } from '../completion'
import { CommandSignatureDuplicationDetector } from './commandlib/commandfinder'
import { CmdEnvSuggestion, splitSignatureString, filterNonLetterSuggestions, filterArgumentHint } from './completerutils'

import { getLogger } from '../../components/logger'

const logger = getLogger('Intelli', 'Environment')

export type EnvType = {
    /** Name of the environment, what comes inside \begin{...} */
    name: string,
    /** To be inserted after \begin{..} */
    snippet?: string,
    /** The option of package below that activates this env */
    option?: string,
    /** Possible options of this env */
    keyvals?: string[],
    /** The index of keyval list in package .json file. Should not be used */
    keyvalindex?: number,
    /** The index of argument which have the keyvals */
    keyvalpos?: number,
    /** The package providing the environment */
    package?: string,
    detail?: string
}

function isEnv(obj: any): obj is EnvType {
    return (typeof obj.name === 'string')
}

export enum EnvSnippetType { AsName, AsCommand, ForBegin, }

export class Environment implements IProvider {
    private defaultEnvsAsName: CmdEnvSuggestion[] = []
    private defaultEnvsAsCommand: CmdEnvSuggestion[] = []
    private defaultEnvsForBegin: CmdEnvSuggestion[] = []
    private readonly packageEnvs = new Map<string, EnvType[]>()
    private readonly packageEnvsAsName = new Map<string, CmdEnvSuggestion[]>()
    private readonly packageEnvsAsCommand = new Map<string, CmdEnvSuggestion[]>()
    private readonly packageEnvsForBegin= new Map<string, CmdEnvSuggestion[]>()

    initialize() {
        const envs = JSON.parse(fs.readFileSync(`${lw.extensionRoot}/data/environments.json`, {encoding: 'utf8'})) as {[key: string]: EnvType}
        Object.entries(envs).forEach(([key, env]) => {
            env.name = env.name || key
            env.snippet = env.snippet || ''
            env.detail = key
        })
        this.defaultEnvsAsCommand = []
        this.defaultEnvsForBegin = []
        this.defaultEnvsAsName = []
        Object.entries(envs).forEach(([key, env]) => {
            this.defaultEnvsAsCommand.push(this.entryEnvToCompletion(key, env, EnvSnippetType.AsCommand))
            this.defaultEnvsForBegin.push(this.entryEnvToCompletion(key, env, EnvSnippetType.ForBegin))
            this.defaultEnvsAsName.push(this.entryEnvToCompletion(key, env, EnvSnippetType.AsName))
        })

        return this
    }

    /**
     * This function is called by Command.initialize with type=EnvSnippetType.AsCommand
     * to build a `\envname` command for every default environment.
     */
    getDefaultEnvs(type: EnvSnippetType): CmdEnvSuggestion[] {
        switch (type) {
            case EnvSnippetType.AsName:
                return this.defaultEnvsAsName
                break
            case EnvSnippetType.AsCommand:
                return this.defaultEnvsAsCommand
                break
            case EnvSnippetType.ForBegin:
                return this.defaultEnvsForBegin
                break
            default:
                return []
        }
    }

    getPackageEnvs(type?: EnvSnippetType): Map<string, CmdEnvSuggestion[]> {
        switch (type) {
            case EnvSnippetType.AsName:
                return this.packageEnvsAsName
            case EnvSnippetType.AsCommand:
                return this.packageEnvsAsCommand
            case EnvSnippetType.ForBegin:
                return this.packageEnvsForBegin
            default:
                return new Map<string, CmdEnvSuggestion[]>()
        }
    }

    provideFrom(result: RegExpMatchArray, args: IProviderArgs) {
        const suggestions = this.provide(args.langId, args.line, args.position)
        // Commands starting with a non letter character are not filtered properly because of wordPattern definition.
       return filterNonLetterSuggestions(suggestions, result[1], args.position)
    }

    private provide(langId: string, line: string, position: vscode.Position): ICompletionItem[] {
        let snippetType: EnvSnippetType = EnvSnippetType.ForBegin
        if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.selections.length > 1 || line.slice(position.character).match(/[a-zA-Z*]*}/)) {
            snippetType = EnvSnippetType.AsName
        }

        // Extract cached envs and add to default ones
        const suggestions: CmdEnvSuggestion[] = Array.from(this.getDefaultEnvs(snippetType))
        const envList: string[] = this.getDefaultEnvs(snippetType).map(env => env.label)

        // Insert package environments
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('intellisense.package.enabled')) {
            const packages = lw.completer.package.getPackagesIncluded(langId)
            Object.entries(packages).forEach(([packageName, options]) => {
                this.getEnvFromPkg(packageName, snippetType).forEach(env => {
                    if (env.option && options && !options.includes(env.option)) {
                        return
                    }
                    if (!envList.includes(env.label)) {
                        suggestions.push(env)
                        envList.push(env.label)
                    }
                })
            })
        }

        // Insert environments defined in tex
        lw.cacher.getIncludedTeX().forEach(cachedFile => {
            const cachedEnvs = lw.cacher.get(cachedFile)?.elements.environment
            if (cachedEnvs !== undefined) {
                cachedEnvs.forEach(env => {
                    if (! envList.includes(env.label)) {
                        if (snippetType === EnvSnippetType.ForBegin) {
                            env.insertText = new vscode.SnippetString(`${env.label}}\n\t$0\n\\end{${env.label}}`)
                        } else {
                            env.insertText = env.label
                        }
                        suggestions.push(env)
                        envList.push(env.label)
                    }
                })
            }
        })

        filterArgumentHint(suggestions)

        return suggestions
    }

    /**
     * Environments can be inserted using `\envname`.
     * This function is called by Command.provide to compute these commands for every package in use.
     */
    provideEnvsAsCommandInPkg(packageName: string, options: string[], suggestions: vscode.CompletionItem[], cmdDuplicationDetector: CommandSignatureDuplicationDetector) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useOptionalArgsEntries = configuration.get('intellisense.optionalArgsEntries.enabled')

        if (! configuration.get('intellisense.package.env.enabled')) {
            return
        }

        // Load environments from the package if not already done
        const entry = this.getEnvFromPkg(packageName, EnvSnippetType.AsCommand)
        // No environment defined in package
        if (!entry || entry.length === 0) {
            return
        }

        // Insert env snippets
        entry.forEach(env => {
            if (!useOptionalArgsEntries && env.hasOptionalArgs()) {
                return
            }
            if (!cmdDuplicationDetector.has(env)) {
                if (env.option && options && !options.includes(env.option)) {
                    return
                }
                suggestions.push(env)
                cmdDuplicationDetector.add(env)
            }
        })
    }

    /**
     * Updates the Manager cache for environments used in `file` with `nodes`.
     * If `nodes` is `undefined`, `content` is parsed with regular expressions,
     * and the result is used to update the cache.
     * @param file The path of a LaTeX file.
     * @param nodes AST of a LaTeX file.
     * @param content The content of a LaTeX file.
     */
    update(file: string, nodes?: latexParser.Node[], lines?: string[], content?: string) {
        // First, we must update the package list
        lw.completer.package.updateUsepackage(file, nodes, content)

        const cache = lw.cacher.get(file)
        if (cache === undefined) {
            return
        }
        if (nodes !== undefined && lines !== undefined) {
            cache.elements.environment = this.getEnvFromNodeArray(nodes, lines)
        } else if (content !== undefined) {
            cache.elements.environment = this.getEnvFromContent(content)
        }
    }

    // This function will return all environments in a node array, including sub-nodes
    private getEnvFromNodeArray(nodes: latexParser.Node[], lines: string[]): CmdEnvSuggestion[] {
        let envs: CmdEnvSuggestion[] = []
        for (let index = 0; index < nodes.length; ++index) {
            envs = envs.concat(this.getEnvFromNode(nodes[index], lines))
        }
        return envs
    }

    private getEnvFromNode(node: latexParser.Node, lines: string[]): CmdEnvSuggestion[] {
        let envs: CmdEnvSuggestion[] = []
        // Here we only check `isEnvironment` which excludes `align*` and `verbatim`.
        // Nonetheless, they have already been included in `defaultEnvs`.
        if (latexParser.isEnvironment(node)) {
            const env = new CmdEnvSuggestion(`${node.name}`, '', [], -1, { name: node.name, args: '' }, vscode.CompletionItemKind.Module)
            env.documentation = '`' + node.name + '`'
            env.filterText = node.name
            envs.push(env)
        }
        if (latexParser.hasContentArray(node)) {
            envs = envs.concat(this.getEnvFromNodeArray(node.content, lines))
        }
        return envs
    }

    getEnvFromPkg(packageName: string, type: EnvSnippetType): CmdEnvSuggestion[] {
        const packageEnvs = this.getPackageEnvs(type)
        const entry = packageEnvs.get(packageName)
        if (entry !== undefined) {
            return entry
        }

        lw.completer.loadPackageData(packageName)
        // No package command defined
        const pkgEnvs = this.packageEnvs.get(packageName)
        if (!pkgEnvs || pkgEnvs.length === 0) {
            return []
        }

        const newEntry: CmdEnvSuggestion[] = []
        pkgEnvs.forEach(env => {
            // \array{} : detail=array{}, name=array.
            newEntry.push(this.entryEnvToCompletion(env.detail || env.name, env, type))
        })
        packageEnvs.set(packageName, newEntry)
        return newEntry
    }

    private getEnvFromContent(content: string): CmdEnvSuggestion[] {
        const envReg = /\\begin\s?{([^{}]*)}/g
        const envs: CmdEnvSuggestion[] = []
        const envList: string[] = []
        while (true) {
            const result = envReg.exec(content)
            if (result === null) {
                break
            }
            if (envList.includes(result[1])) {
                continue
            }
            const env = new CmdEnvSuggestion(`${result[1]}`, '', [], -1, { name: result[1], args: '' }, vscode.CompletionItemKind.Module)
            env.documentation = '`' + result[1] + '`'
            env.filterText = result[1]

            envs.push(env)
            envList.push(result[1])
        }
        return envs
    }

    setPackageEnvs(packageName: string, envs: {[key: string]: EnvType}) {
        const environments: EnvType[] = []
        Object.entries(envs).forEach(([key, env]) => {
            env.package = packageName
            if (isEnv(env)) {
                environments.push(env)
            } else {
                logger.log(`Cannot parse intellisense file for ${packageName}`)
                logger.log(`Missing field in entry: "${key}": ${JSON.stringify(env)}`)
                delete envs[key]
            }
        })
        this.packageEnvs.set(packageName, environments)
    }

    private entryEnvToCompletion(itemKey: string, item: EnvType, type: EnvSnippetType): CmdEnvSuggestion {
        const label = item.detail ? item.detail : item.name
        const suggestion = new CmdEnvSuggestion(
            item.name,
            item.package || 'latex',
            item.keyvals && typeof(item.keyvals) !== 'number' ? item.keyvals : [],
            item.keyvalpos === undefined ? -1 : item.keyvalpos,
            splitSignatureString(itemKey),
            vscode.CompletionItemKind.Module,
            item.option)
        suggestion.detail = `\\begin{${item.name}}${item.snippet?.replace(/\$\{\d+:([^$}]*)\}/g, '$1')}\n...\n\\end{${item.name}}`
        suggestion.documentation = `Environment ${item.name} .`
        if (item.package) {
            suggestion.documentation += ` From package: ${item.package}.`
        }
        suggestion.sortText = label.replace(/^[a-zA-Z]/, c => {
            const n = c.match(/[a-z]/) ? c.toUpperCase().charCodeAt(0): c.toLowerCase().charCodeAt(0)
            return n !== undefined ? n.toString(16): c
        })

        if (type === EnvSnippetType.AsName) {
            return suggestion
        } else {
            if (type === EnvSnippetType.AsCommand) {
                suggestion.kind = vscode.CompletionItemKind.Snippet
            }
            const configuration = vscode.workspace.getConfiguration('latex-workshop')
            const useTabStops = configuration.get('intellisense.useTabStops.enabled')
            const prefix = (type === EnvSnippetType.ForBegin) ? '' : 'begin{'
            let snippet: string = item.snippet ? item.snippet : ''
            if (item.snippet) {
                if (useTabStops) {
                    snippet = item.snippet.replace(/\$\{(\d+):[^}]*\}/g, '$${$1}')
                }
            }
            if (snippet.match(/\$\{?0\}?/)) {
                snippet = snippet.replace(/\$\{?0\}?/, '$${0:$${TM_SELECTED_TEXT}}')
                snippet += '\n'
            } else {
                snippet += '\n\t${0:${TM_SELECTED_TEXT}}\n'
            }
            if (item.detail) {
                suggestion.label = item.detail
            }
            suggestion.filterText = itemKey
            suggestion.insertText = new vscode.SnippetString(`${prefix}${item.name}}${snippet}\\end{${item.name}}`)
            return suggestion
        }
    }

}
