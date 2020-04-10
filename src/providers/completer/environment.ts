import * as vscode from 'vscode'
import * as fs from 'fs-extra'
import {latexParser} from 'latex-utensils'

import {Extension} from '../../main'

export interface EnvItemEntry {
    name: string, // Name of the environment, what comes inside \begin{...}
    snippet?: string, // To be inserted after \begin{..}
    package?: string, // The package providing the environment
    detail?: string
}

export enum EnvSnippetType { AsName, AsCommand, ForBegin, }

export interface Suggestion extends vscode.CompletionItem {
    package: string
}

export class Environment {
    extension: Extension
    private defaultEnvsAsName: Suggestion[] = []
    private defaultEnvsAsCommand: Suggestion[] = []
    private defaultEnvsForBegin: Suggestion[] = []
    private packageEnvs: {[pkg: string]: Suggestion[]} = {}
    private packageEnvSnippets: {[pkg: string]: Suggestion[]} = {}

    constructor(extension: Extension) {
        this.extension = extension
    }

    initialize(envs: {[key: string]: EnvItemEntry}) {
        this.defaultEnvsAsCommand = []
        this.defaultEnvsForBegin = []
        this.defaultEnvsAsName = []
        const endCompletion: Suggestion = {
            label: 'Complete with \\end',
            sortText: ' ',
            insertText: new vscode.SnippetString('$1}\n\t$0\n\\end{$1}'),
            command: { title: 'Post-Action', command: 'editor.action.triggerSuggest' },
            kind: vscode.CompletionItemKind.Function,
            package: ''
        }
        this.defaultEnvsForBegin.push(endCompletion)
        Object.keys(envs).forEach(env => {
           this.defaultEnvsAsCommand.push(this.entryEnvToCompletion(envs[env], 'begin{'))
           this.defaultEnvsForBegin.push(this.entryEnvToCompletion(envs[env]))
           this.defaultEnvsAsName.push(this.entryEnvToCompletionName(envs[env]))
        })
    }

    getDefaultEnvs(type: EnvSnippetType): Suggestion[] {
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

    provide(): vscode.CompletionItem[] {
        if (vscode.window.activeTextEditor === undefined) {
            return []
        }
        let snippetType: EnvSnippetType = EnvSnippetType.ForBegin
        if (vscode.window.activeTextEditor.selections.length > 1) {
            snippetType = EnvSnippetType.AsName
        }
        // Extract cached envs and add to default ones
        const suggestions: vscode.CompletionItem[] = Array.from(this.getDefaultEnvs(snippetType))
        const envList: string[] = this.getDefaultEnvs(snippetType).map(env => env.label)
        this.extension.manager.getIncludedTeX().forEach(cachedFile => {
            const cachedEnvs = this.extension.manager.cachedContent[cachedFile].element.environment
            if (cachedEnvs !== undefined) {
                cachedEnvs.forEach(env => {
                    if (! envList.includes(env.label)) {
                        suggestions.push(env)
                        envList.push(env.label)
                    }
                })
            }
        })
        // If no insert package-defined environments
        if (!(vscode.workspace.getConfiguration('latex-workshop').get('intellisense.package.enabled'))) {
            return suggestions
        }
        // Insert package environments
        this.extension.manager.getIncludedTeX().forEach(tex => {
            const pkgs = this.extension.manager.cachedContent[tex].element.package
            if (pkgs !== undefined) {
                pkgs.forEach(pkg => {
                    this.getEnvFromPkg(pkg).forEach(env => {
                        if (!envList.includes(env.label)) {
                            // env.kind = vscode.CompletionItemKind.Snippet
                            suggestions.push(env)
                            envList.push(env.label)
                        }
                    })
                })
            }
        })
        return suggestions
    }

    provideEnvSnippetInPkg(pkg: string, suggestions: vscode.CompletionItem[], cmdList: string[]) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useOptionalArgsEntries = configuration.get('intellisense.optionalArgsEntries.enabled')

        if (! configuration.get('intellisense.package.env.enabled')) {
            return
        }

        // Load environments from the package if not already done
        if (!(pkg in this.packageEnvSnippets)) {
            this.packageEnvSnippets[pkg] = []
            const envs: {[key: string]: EnvItemEntry} = this.getEnvItemsFromPkg(pkg)
            Object.keys(envs).forEach(env => {
                this.packageEnvSnippets[pkg].push(this.entryEnvToCompletion(envs[env], 'begin{'))
            })
        }

        // No environment defined in package
        if (!(pkg in this.packageEnvSnippets) || this.packageEnvSnippets[pkg].length === 0) {
            return
        }

        // Insert env snippets
        this.packageEnvSnippets[pkg].forEach(env => {
            const envName = env.filterText ? env.filterText : env.label
            if (!useOptionalArgsEntries && envName.includes('[')) {
                return
            }
            if (!cmdList.includes(envName)) {
                suggestions.push(env)
                cmdList.push(envName)
            }
        })
    }


    update(file: string, nodes?: latexParser.Node[], lines?: string[], content?: string) {
        if (nodes !== undefined && lines !== undefined) {
            this.extension.manager.cachedContent[file].element.environment = this.getEnvFromNodeArray(nodes, lines)
        } else if (content !== undefined) {
            this.extension.manager.cachedContent[file].element.environment = this.getEnvFromContent(content)
        }
    }

    // This function will return all environments in a node array, including sub-nodes
    private getEnvFromNodeArray(nodes: latexParser.Node[], lines: string[]): Suggestion[] {
        let envs: Suggestion[] = []
        for (let index = 0; index < nodes.length; ++index) {
            envs = envs.concat(this.getEnvFromNode(nodes[index], lines))
        }
        return envs
    }

    private getEnvFromNode(node: latexParser.Node, lines: string[]): Suggestion[] {
        let envs: Suggestion[] = []
        // Here we only check `isEnvironment`which excludes `align*` and `verbatim`.
        // Nonetheless, they have already been included in `defaultEnvs`.
        if (latexParser.isEnvironment(node)) {
            const env: Suggestion = {
                label: `${node.name}`,
                kind: vscode.CompletionItemKind.Module,
                documentation: '`' + node.name + '`',
                filterText: node.name,
                package: ''
            }
            envs.push(env)
        }
        if (latexParser.hasContentArray(node)) {
            envs = envs.concat(this.getEnvFromNodeArray(node.content, lines))
        }
        return envs
    }

    private getEnvItemsFromPkg(pkg: string): {[key: string]: EnvItemEntry} {
        const filePath = `${this.extension.extensionRoot}/data/packages/${pkg}_env.json`
        if (!fs.existsSync(filePath)) {
            return {}
        }
        const envs: {[key: string]: EnvItemEntry} = JSON.parse(fs.readFileSync(filePath).toString())
        return envs
    }

    private getEnvFromPkg(pkg: string): Suggestion[] {
        if (pkg in this.packageEnvs) {
            return this.packageEnvs[pkg]
        }
        this.packageEnvs[pkg] = []
        const envs: {[key: string]: EnvItemEntry} = this.getEnvItemsFromPkg(pkg)
        Object.keys(envs).forEach(env => {
            this.packageEnvs[pkg].push(this.entryEnvToCompletion(envs[env]))
        })
        return this.packageEnvs[pkg]
    }

    private getEnvFromContent(content: string): Suggestion[] {
        const envReg = /\\begin\s?{([^{}]*)}/g
        const envs: Suggestion[] = []
        const envList: string[] = []
        while (true) {
            const result = envReg.exec(content)
            if (result === null) {
                break
            }
            if (envList.includes(result[1])) {
                continue
            }
            const env: Suggestion = {
                label: `${result[1]}`,
                kind: vscode.CompletionItemKind.Module,
                documentation: '`' + result[1] + '`',
                filterText: result[1],
                package: ''
            }

            envs.push(env)
            envList.push(result[1])
        }
        return envs
    }

    entryEnvToCompletion(item: EnvItemEntry, prefix: string = ''): Suggestion {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useTabStops = configuration.get('intellisense.useTabStops.enabled')
        const label = item.detail ? item.detail : item.name
        const suggestion: Suggestion = {
            label,
            kind: vscode.CompletionItemKind.Function,
            package: 'latex'
        }

        let snippet: string = item.snippet ? item.snippet : ''
        if (item.snippet) {
            if (useTabStops) {
                snippet = item.snippet.replace(/\$\{(\d+):[^}]*\}/g, '$${$1}')
            }
        }
        if (snippet.match(/\$\{?0\}?/)) {
            snippet += '\n'
        } else {
            snippet += '\n\t$0\n'
        }
        suggestion.insertText = new vscode.SnippetString(`${prefix}${item.name}}${snippet}\\end{${item.name}}`)
        suggestion.detail = `Insert environment ${item.name}.`
        suggestion.documentation = label
        if (item.package) {
            suggestion.documentation += '\n' + `Package: ${item.package}`
        }
        suggestion.sortText = label.replace(/^[a-zA-Z]/, c => {
            const n = c.match(/[a-z]/) ? c.toUpperCase().charCodeAt(0): c.toLowerCase().charCodeAt(0)
            return n !== undefined ? n.toString(16): c
        })
        return suggestion
    }

    entryEnvToCompletionName(item: EnvItemEntry): Suggestion {
        const label = item.name
        const suggestion: Suggestion = {
            label,
            kind: vscode.CompletionItemKind.Function,
            package: item.package ? item.package : ''
        }

        const art = ['a', 'e', 'i', 'o', 'u'].includes(`${item.name}`.charAt(0)) ? 'an' : 'a'
        suggestion.detail = `Insert ${art} ${item.name} environment.`
        suggestion.documentation = label
        if (item.package) {
            suggestion.documentation += '\n' + `Package: ${item.package}`
        }
        suggestion.sortText = label.replace(/^[a-zA-Z]/, c => {
            const n = c.match(/[a-z]/) ? c.toUpperCase().charCodeAt(0): c.toLowerCase().charCodeAt(0)
            return n !== undefined ? n.toString(16): c
        })
        return suggestion
    }


}
