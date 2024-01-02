import * as vscode from 'vscode'
import * as fs from 'fs'
import type * as Ast from '@unified-latex/unified-latex-types'
import { lw } from '../../lw'
import { EnvSnippetType } from '../../types'
import type { CompletionArgs, CompletionItem, CompletionProvider, Environment, FileCache } from '../../types'
import { CmdEnvSuggestion, splitSignatureString, filterNonLetterSuggestions, filterArgumentHint } from './completerutils'

const logger = lw.log('Intelli', 'Environment')

export const provider: CompletionProvider = { from }
export const environment = {
    parse,
    getDefaultEnvs,
    setPackageEnvs,
    getEnvFromPkg,
    provideEnvsAsMacroInPkg
}

const data = {
    defaultEnvsAsName: [] as CmdEnvSuggestion[],
    defaultEnvsAsMacro: [] as CmdEnvSuggestion[],
    defaultEnvsForBegin: [] as CmdEnvSuggestion[],
    packageEnvs: new Map<string, Environment[]>(),
    packageEnvsAsName: new Map<string, CmdEnvSuggestion[]>(),
    packageEnvsAsMacro: new Map<string, CmdEnvSuggestion[]>(),
    packageEnvsForBegin: new Map<string, CmdEnvSuggestion[]>()
}

lw.onConfigChange('intellisense.package.exclude', initialize)
initialize()
function initialize() {
    const excludeDefault = (vscode.workspace.getConfiguration('latex-workshop').get('intellisense.package.exclude') as string[]).includes('lw-default')
    const envs = excludeDefault ? {} : JSON.parse(fs.readFileSync(`${lw.extensionRoot}/data/environments.json`, {encoding: 'utf8'})) as {[key: string]: Environment}
    Object.entries(envs).forEach(([key, env]) => {
        env.name = env.name || key
        env.snippet = env.snippet || ''
        env.detail = key
    })
    data.defaultEnvsAsMacro = []
    data.defaultEnvsForBegin = []
    data.defaultEnvsAsName = []
    Object.entries(envs).forEach(([key, env]) => {
        data.defaultEnvsAsMacro.push(entryEnvToCompletion(key, env, EnvSnippetType.AsMacro))
        data.defaultEnvsForBegin.push(entryEnvToCompletion(key, env, EnvSnippetType.ForBegin))
        data.defaultEnvsAsName.push(entryEnvToCompletion(key, env, EnvSnippetType.AsName))
    })

    return data
}

function isEnv(obj: any): obj is Environment {
    return (typeof obj.name === 'string')
}


/**
 * This function is called by Macro.initialize with type=EnvSnippetType.AsMacro
 * to build a `\envname` macro for every default environment.
 */
function getDefaultEnvs(type: EnvSnippetType): CmdEnvSuggestion[] {
    switch (type) {
        case EnvSnippetType.AsName:
            return data.defaultEnvsAsName
            break
        case EnvSnippetType.AsMacro:
            return data.defaultEnvsAsMacro
            break
        case EnvSnippetType.ForBegin:
            return data.defaultEnvsForBegin
            break
        default:
            return []
    }
}

function getPackageEnvs(type?: EnvSnippetType): Map<string, CmdEnvSuggestion[]> {
    switch (type) {
        case EnvSnippetType.AsName:
            return data.packageEnvsAsName
        case EnvSnippetType.AsMacro:
            return data.packageEnvsAsMacro
        case EnvSnippetType.ForBegin:
            return data.packageEnvsForBegin
        default:
            return new Map<string, CmdEnvSuggestion[]>()
    }
}

function from(result: RegExpMatchArray, args: CompletionArgs) {
    const suggestions = provide(args.langId, args.line, args.position)
    // Macros starting with a non letter character are not filtered properly because of wordPattern definition.
    return filterNonLetterSuggestions(suggestions, result[1], args.position)
}

function provide(langId: string, line: string, position: vscode.Position): CompletionItem[] {
    let snippetType: EnvSnippetType = EnvSnippetType.ForBegin
    if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.selections.length > 1 || line.slice(position.character).match(/[a-zA-Z*]*}/)) {
        snippetType = EnvSnippetType.AsName
    }

    // Extract cached envs and add to default ones
    const suggestions: CmdEnvSuggestion[] = Array.from(getDefaultEnvs(snippetType))
    const envList: string[] = getDefaultEnvs(snippetType).map(env => env.label)

    // Insert package environments
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    if (configuration.get('intellisense.package.enabled')) {
        const packages = lw.completion.usepackage.getAll(langId)
        Object.entries(packages).forEach(([packageName, options]) => {
            getEnvFromPkg(packageName, snippetType).forEach(env => {
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
    lw.cache.getIncludedTeX().forEach(cachedFile => {
        const cachedEnvs = lw.cache.get(cachedFile)?.elements.environment
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
 * This function is called by Macro.provide to compute these macros for every package in use.
 */
function provideEnvsAsMacroInPkg(packageName: string, options: string[], suggestions: CmdEnvSuggestion[], defined?: Set<string>) {
    defined = defined ?? new Set<string>()
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const useOptionalArgsEntries = configuration.get('intellisense.optionalArgsEntries.enabled')

    if (! configuration.get('intellisense.package.env.enabled')) {
        return
    }

    // Load environments from the package if not already done
    const entry = getEnvFromPkg(packageName, EnvSnippetType.AsMacro)
    // No environment defined in package
    if (!entry || entry.length === 0) {
        return
    }

    // Insert env snippets
    for (const env of entry) {
        if (!useOptionalArgsEntries && env.hasOptionalArgs()) {
            return
        }
        if (!defined.has(env.signatureAsString())) {
            if (env.option && options && !options.includes(env.option)) {
                return
            }
            suggestions.push(env)
            defined.add(env.signatureAsString())
        }
    }
}

function parse(cache: FileCache) {
    if (cache.ast !== undefined) {
        cache.elements.environment = parseAst(cache.ast)
    } else {
        cache.elements.environment = parseContent(cache.contentTrimmed)
    }
}

function parseAst(node: Ast.Node): CmdEnvSuggestion[] {
    let envs: CmdEnvSuggestion[] = []
    if (node.type === 'environment' || node.type === 'mathenv') {
        const content = (typeof node.env === 'string') ? node.env : (node.env as unknown as {content: string}).content
        const env = new CmdEnvSuggestion(`${content}`, '', [], -1, { name: content, args: '' }, vscode.CompletionItemKind.Module)
        env.documentation = '`' + content + '`'
        env.filterText = content
        envs.push(env)
    }

    const parseNodeContent = (content: Ast.Node[]) => {
        for (const subNode of content) {
            envs = [...envs, ...parseAst(subNode)]
        }
    }
    if (node.type === 'macro' && node.args) {
        for (const arg of node.args) {
            parseNodeContent(arg.content)
        }
    } else if ('content' in node && typeof node.content !== 'string') {
        parseNodeContent(node.content)
    }

    return envs
}

function parseContent(content: string): CmdEnvSuggestion[] {
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

function getEnvFromPkg(packageName: string, type: EnvSnippetType): CmdEnvSuggestion[] {
    const packageEnvs = getPackageEnvs(type)
    const entry = packageEnvs.get(packageName)
    if (entry !== undefined) {
        return entry
    }

    lw.completion.usepackage.load(packageName)
    // No package macro defined
    const pkgEnvs = data.packageEnvs.get(packageName)
    if (!pkgEnvs || pkgEnvs.length === 0) {
        return []
    }

    const newEntry: CmdEnvSuggestion[] = []
    pkgEnvs.forEach(env => {
        // \array{} : detail=array{}, name=array.
        newEntry.push(entryEnvToCompletion(env.detail || env.name, env, type))
    })
    packageEnvs.set(packageName, newEntry)
    return newEntry
}

function setPackageEnvs(packageName: string, envs: {[key: string]: Environment}) {
    const environments: Environment[] = []
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
    data.packageEnvs.set(packageName, environments)
}

function entryEnvToCompletion(itemKey: string, item: Environment, type: EnvSnippetType): CmdEnvSuggestion {
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
        if (type === EnvSnippetType.AsMacro) {
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
