import * as vscode from 'vscode'
import * as fs from 'fs'
import type * as Ast from '@unified-latex/unified-latex-types'
import { lw } from '../../lw'
import { EnvSnippetType } from '../../types'
import type {
    CompletionArgs,
    CompletionItem,
    CompletionProvider,
    EnvironmentInfo,
    EnvironmentRaw,
    FileCache,
} from '../../types'
import { CmdEnvSuggestion, filterNonLetterSuggestions, filterArgumentHint } from './completerutils'

export const provider: CompletionProvider = { from }
export const environment = {
    parse,
    getDefaultEnvs,
    setPackageEnvs,
    getEnvFromPkg,
    provideEnvsAsMacroInPkg,
}

const data = {
    defaultEnvsAsName: [] as CmdEnvSuggestion[],
    defaultEnvsAsMacro: [] as CmdEnvSuggestion[],
    defaultEnvsForBegin: [] as CmdEnvSuggestion[],
    packageEnvs: new Map<string, EnvironmentInfo[]>(),
    packageEnvsAsName: new Map<string, CmdEnvSuggestion[]>(),
    packageEnvsAsMacro: new Map<string, CmdEnvSuggestion[]>(),
    packageEnvsForBegin: new Map<string, CmdEnvSuggestion[]>(),
}

lw.onConfigChange('intellisense.package.exclude', initialize)
initialize()
function initialize() {
    const excludeDefault = (
        vscode.workspace.getConfiguration('latex-workshop').get('intellisense.package.exclude') as string[]
    ).includes('lw-default')
    const envs = excludeDefault
        ? []
        : (
              JSON.parse(
                  fs.readFileSync(`${lw.extensionRoot}/data/environments.json`, { encoding: 'utf8' })
              ) as EnvironmentRaw[]
          ).map((env) => envRawToInfo('latex', env))
    data.defaultEnvsAsMacro = []
    data.defaultEnvsForBegin = []
    data.defaultEnvsAsName = []
    envs.forEach((env) => {
        data.defaultEnvsAsMacro.push(entryEnvToCompletion(env, EnvSnippetType.AsMacro))
        data.defaultEnvsForBegin.push(entryEnvToCompletion(env, EnvSnippetType.ForBegin))
        data.defaultEnvsAsName.push(entryEnvToCompletion(env, EnvSnippetType.AsName))
    })

    return data
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
    let snippetType: EnvSnippetType = EnvSnippetType.AsName
    if (
        vscode.window.activeTextEditor &&
        vscode.window.activeTextEditor.selections.length === 1 &&
        line.indexOf('\\begin') > line.indexOf('\\end') &&
        line.slice(position.character).match(/[a-zA-Z*]*}/) === null
    ) {
        snippetType = EnvSnippetType.ForBegin
    }

    // Extract cached envs and add to default ones
    const suggestions: CmdEnvSuggestion[] = Array.from(getDefaultEnvs(snippetType))
    const envList: string[] = getDefaultEnvs(snippetType).map((env) => env.label)

    // Insert package environments
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    if (configuration.get('intellisense.package.enabled')) {
        const unusual = configuration.get('intellisense.package.unusual') as boolean
        const packages = lw.completion.usepackage.getAll(langId)
        Object.entries(packages).forEach(([packageName, options]) => {
            getEnvFromPkg(packageName, snippetType).forEach((env) => {
                if (env.ifCond && !options.includes(env.ifCond)) {
                    return
                }
                if (env.unusual && !unusual) {
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
    lw.cache.getIncludedTeX().forEach((cachedFile) => {
        const cachedEnvs = lw.cache.get(cachedFile)?.elements.environment
        if (cachedEnvs !== undefined) {
            cachedEnvs.forEach((env) => {
                if (!envList.includes(env.label)) {
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
function provideEnvsAsMacroInPkg(
    packageName: string,
    options: string[],
    suggestions: CmdEnvSuggestion[],
    defined?: Set<string>
) {
    defined = defined ?? new Set<string>()
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const useOptionalArgsEntries = configuration.get('intellisense.optionalArgsEntries.enabled')

    if (!configuration.get('intellisense.package.env.enabled')) {
        return
    }

    // Load environments from the package if not already done
    const envs = getEnvFromPkg(packageName, EnvSnippetType.AsMacro)
    // No environment defined in package
    if (!envs || envs.length === 0) {
        return
    }

    const unusual = configuration.get('intellisense.package.unusual') as boolean
    // Insert env snippets
    envs.forEach((env) => {
        if (!useOptionalArgsEntries && env.hasOptionalArgs()) {
            return
        }
        if (!defined.has(env.signatureAsString())) {
            if (env.ifCond && !options.includes(env.ifCond)) {
                return
            }
            if (env.unusual && !unusual) {
                return
            }
            suggestions.push(env)
            defined.add(env.signatureAsString())
        }
    })
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
        const content = typeof node.env === 'string' ? node.env : (node.env as unknown as { content: string }).content
        const env = new CmdEnvSuggestion(
            `${content}`,
            '',
            [],
            -1,
            { name: content, args: '' },
            vscode.CompletionItemKind.Module
        )
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
        const env = new CmdEnvSuggestion(
            `${result[1]}`,
            '',
            [],
            -1,
            { name: result[1], args: '' },
            vscode.CompletionItemKind.Module
        )
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
    pkgEnvs.forEach((env) => {
        // \array{} : detail=array{}, name=array.
        newEntry.push(entryEnvToCompletion(env, type))
    })
    packageEnvs.set(packageName, newEntry)
    return newEntry
}

function envRawToInfo(packageName: string, env: EnvironmentRaw): EnvironmentInfo {
    const envInfo: EnvironmentInfo = {
        ...env,
        package: packageName,
        detail: env.name,
    }
    return envInfo
}

function setPackageEnvs(packageName: string, envs: EnvironmentRaw[]) {
    data.packageEnvs.set(
        packageName,
        envs.map((env) => envRawToInfo(packageName, env))
    )
}

function entryEnvToCompletion(item: EnvironmentInfo, type: EnvSnippetType): CmdEnvSuggestion {
    const label = item.detail ? item.detail : item.name
    const suggestion = new CmdEnvSuggestion(
        item.name + (item.arg?.format ?? ''),
        item.package || 'latex',
        item.arg?.keys ?? [],
        item.arg?.keyPos ?? -1,
        { name: item.name, args: item.arg?.format ?? '' },
        vscode.CompletionItemKind.Module,
        item.if,
        item.unusual
    )
    suggestion.detail = `\\begin{${item.name}}${
        item.arg?.snippet.replace(/\$\{\d+:([^$}]*)\}/g, '$1') ?? ''
    }\n...\n\\end{${item.name}}`
    suggestion.documentation = `Environment ${item.name} .`
    if (item.package) {
        suggestion.documentation += ` From package: ${item.package}.`
    }
    suggestion.sortText = label.replace(/([a-z])/g, '$10').toLowerCase()

    if (type === EnvSnippetType.AsName) {
        return suggestion
    } else {
        if (type === EnvSnippetType.AsMacro) {
            suggestion.kind = vscode.CompletionItemKind.Snippet
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useTabStops = configuration.get('intellisense.useTabStops.enabled')
        const prefix = type === EnvSnippetType.ForBegin ? '' : 'begin{'
        let snippet: string = item.arg?.snippet ?? ''
        if (item.arg?.snippet && useTabStops) {
            snippet = item.arg.snippet.replace(/\$\{(\d+):[^}]*\}/g, '$${$1}')
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
        suggestion.filterText = item.detail
        suggestion.insertText = new vscode.SnippetString(`${prefix}${item.name}}${snippet}\\end{${item.name}}`)
        return suggestion
    }
}
