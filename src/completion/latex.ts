import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as lw from '../lw'
import { Citation } from './completer/citation'
import { DocumentClass } from './completer/documentclass'
import { Command } from './completer/command'
import type { CmdType } from './completer/command'
import { Environment } from './completer/environment'
import type { EnvType } from './completer/environment'
import { Argument } from './completer/argument'
import { AtSuggestion } from './completer/atsuggestion'
import { Reference } from './completer/reference'
import { Package } from './completer/package'
import { Input, Import, SubImport } from './completer/input'
import { Glossary } from './completer/glossary'
import type { ReferenceDocType } from './completer/reference'
import { escapeRegExp } from '../utils/utils'
import { extension } from '../extension'

const logger = extension.log('Intelli')

export type PkgType = {includes: {[key: string]: string[]}, cmds: {[key: string]: CmdType}, envs: {[key: string]: EnvType}, options: string[], keyvals: string[][]}

export type IProviderArgs = {
    uri: vscode.Uri,
    langId: string,
    line: string,
    position: vscode.Position
}

export interface IProvider {
    /**
     * Returns the array of completion items. Should be called only from `Completer.completion`.
     */
    provideFrom(
        result: RegExpMatchArray,
        args: IProviderArgs
    ): vscode.CompletionItem[]
}

export interface ICompletionItem extends vscode.CompletionItem {
    label: string
}

export class Completer implements vscode.CompletionItemProvider {
    readonly citation: Citation
    readonly command: Command
    readonly documentClass: DocumentClass
    readonly environment: Environment
    readonly argument: Argument
    readonly reference: Reference
    readonly package: Package
    readonly input: Input
    readonly import: Import
    readonly subImport: SubImport
    readonly glossary: Glossary

    private readonly packagesLoaded: string[] = []

    constructor() {
        this.citation = new Citation()
        this.environment = new Environment() // Must be created before command
        this.command = new Command()
        this.argument = new Argument()
        this.documentClass = new DocumentClass()
        this.reference = new Reference()
        this.package = new Package()
        this.input = new Input()
        this.import = new Import()
        this.subImport = new SubImport()
        this.glossary = new Glossary()
        try {
            const environment = this.environment.initialize()
            this.command.initialize(environment)
        } catch (err) {
            logger.log(`Error reading data: ${err}.`)
        }
    }

    loadPackageData(packageName: string) {
        if (this.packagesLoaded.includes(packageName)) {
            return
        }

        const filePath: string | undefined = this.resolvePackageFile(packageName)
        if (filePath === undefined) {
            this.packagesLoaded.push(packageName)
            return
        }

        try {
            const packageData = JSON.parse(fs.readFileSync(filePath).toString()) as PkgType
            this.populatePackageData(packageData)

            this.package.setPackageDeps(packageName, packageData.includes)
            this.command.setPackageCmds(packageName, packageData.cmds)
            this.environment.setPackageEnvs(packageName, packageData.envs)
            this.package.setPackageOptions(packageName, packageData.options)

            this.packagesLoaded.push(packageName)
        } catch (e) {
            logger.log(`Cannot parse intellisense file: ${filePath}`)
        }
    }

    private resolvePackageFile(packageName: string): string | undefined {
        const defaultDir = `${lw.extensionRoot}/data/packages/`
        const dirs = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.package.dirs') as string[]
        dirs.push(defaultDir)
        for (const dir of dirs) {
            const filePath = path.resolve(dir, `${packageName}.json`)
            if (fs.existsSync(filePath)) {
                return filePath
            }
        }
        // Many package with names like toppackage-config.sty are just wrappers around
        // the general package toppacke.sty and do not define commands on their own.
        const indexDash = packageName.lastIndexOf('-')
        if (indexDash > - 1) {
            const generalPkg = packageName.substring(0, indexDash)
            const filePath = path.resolve(defaultDir, `${generalPkg}.json`)
            if (fs.existsSync(filePath)) {
                return filePath
            }
        }
        return
    }

    private populatePackageData(packageData: PkgType) {
        Object.entries(packageData.cmds).forEach(([key, cmd]) => {
            cmd.command = key
            cmd.snippet = cmd.snippet || key
            cmd.keyvals = packageData.keyvals[cmd.keyvalindex ?? -1]
        })
        Object.entries(packageData.envs).forEach(([key, env]) => {
            env.detail = key
            env.name = env.name || key
            env.snippet = env.snippet || ''
            env.keyvals = packageData.keyvals[env.keyvalindex ?? -1]
        })
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] | undefined {
        const currentLine = document.lineAt(position.line).text
        if (position.character > 1 && currentLine[position.character - 1] === '\\' && currentLine[position.character - 2] === '\\') {
            return
        }
        return this.provide({
            uri: document.uri,
            langId: document.languageId,
            line: document.lineAt(position).text,
            position
        })
    }

    provide(args: IProviderArgs): vscode.CompletionItem[] {
        // Note that the order of the following array affects the result.
        // 'command' must be at the last because it matches any commands.
        for (const type of ['citation', 'reference', 'environment', 'package', 'documentclass', 'input', 'subimport', 'import', 'includeonly', 'glossary', 'argument', 'command']) {
            const suggestions = this.completion(type, args)
            if (suggestions.length > 0) {
                if (type === 'citation') {
                    const configuration = vscode.workspace.getConfiguration('latex-workshop')
                    if (configuration.get('intellisense.citation.type') as string === 'browser') {
                        setTimeout(() => this.citation.browser(args), 10)
                        return []
                    }
                }
                return suggestions
            }
        }
        return []
    }

    async resolveCompletionItem(item: vscode.CompletionItem, token: vscode.CancellationToken): Promise<vscode.CompletionItem> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (item.kind === vscode.CompletionItemKind.Reference) {
            if (typeof item.documentation !== 'string') {
                return item
            }
            const data = JSON.parse(item.documentation) as ReferenceDocType
            const sug = {
                file: data.file,
                position: new vscode.Position(data.position.line, data.position.character)
            }
            if (!configuration.get('hover.ref.enabled')) {
                item.documentation = data.documentation
                return item
            }
            const tex = lw.mathPreview.findHoverOnRef(sug, data.key)
            if (tex) {
                const svgDataUrl = await lw.mathPreview.renderSvgOnRef(tex, data, token)
                item.documentation = new vscode.MarkdownString(`![equation](${svgDataUrl})`)
                return item
            } else {
                item.documentation = data.documentation
                return item
            }
        } else if (item.kind === vscode.CompletionItemKind.File) {
            const preview = configuration.get('intellisense.includegraphics.preview.enabled') as boolean
            if (!preview) {
                return item
            }
            const filePath = item.documentation
            if (typeof filePath !== 'string') {
                return item
            }
            const md = await lw.graphicsPreview.renderGraphicsAsMarkdownString(filePath, { height: 190, width: 300 })
            if (md === undefined) {
                return item
            }
            const ret = new vscode.CompletionItem(item.label, vscode.CompletionItemKind.File)
            ret.documentation = md
            return ret
        } else {
            return item
        }
    }

    completion(type: string, args: IProviderArgs): vscode.CompletionItem[] {
        let reg: RegExp | undefined
        let provider: IProvider | undefined
        switch (type) {
            case 'citation':
                reg = /(?:\\[a-zA-Z]*[Cc]ite[a-zA-Z]*\*?(?:\([^[)]*\)){0,2}(?:<[^<>]*>|\[[^[\]]*\]|{[^{}]*})*{([^}]*)$)|(?:\\bibentry{([^}]*)$)/
                provider = this.citation
                break
            case 'reference':
                reg = /(?:\\hyperref\[([^\]]*)(?!\])$)|(?:(?:\\(?!hyper)[a-zA-Z]*ref[a-zA-Z]*\*?(?:\[[^[\]]*\])?){([^}]*)$)|(?:\\[Cc][a-z]*refrange\*?{[^{}]*}{([^}]*)$)/
                provider = this.reference
                break
            case 'environment':
                reg = /(?:\\begin|\\end){([^}]*)$/
                provider = this.environment
                break
            case 'command':
                reg = args.langId === 'latex-expl3' ? /\\([a-zA-Z_@]*(?::[a-zA-Z]*)?)$/ : /\\(\+?[a-zA-Z]*|(?:left|[Bb]ig{1,2}l)?[({[]?)$/
                provider = this.command
                break
            case 'argument':
                reg = args.langId === 'latex-expl3' ? /\\([a-zA-Z_@]*(?::[a-zA-Z]*)?)((?:\[.*?\]|{.*?})*)[[{][^[\]{}]*$/ : /\\(\+?[a-zA-Z]*)((?:\[.*?\]|{.*?})*)[[{][^[\]{}]*$/
                provider = this.argument
                break
            case 'package':
                reg = /(?:\\usepackage(?:\[[^[\]]*\])*){([^}]*)$/
                provider = this.package
                break
            case 'documentclass':
                reg = /(?:\\documentclass(?:\[[^[\]]*\])*){([^}]*)$/
                provider = this.documentClass
                break
            case 'input':
                reg = /\\(input|include|subfile|subfileinclude|includegraphics|includesvg|lstinputlisting|verbatiminput|loadglsentries|markdownInput)\*?(?:\[[^[\]]*\])*{([^}]*)$/
                provider = this.input
                break
            case 'includeonly':
                reg = /\\(includeonly|excludeonly){(?:{[^}]*},)*(?:[^,]*,)*{?([^},]*)$/
                provider = this.input
                break
            case 'import':
                reg = /\\(import|includefrom|inputfrom)\*?(?:{([^}]*)})?{([^}]*)$/
                provider = this.import
                break
            case 'subimport':
                reg = /\\(sub(?:import|includefrom|inputfrom))\*?(?:{([^}]*)})?{([^}]*)$/
                provider = this.subImport
                break
            case 'glossary':
                reg = /\\(gls(?:pl|text|first|fmt(?:text|short|long)|plural|firstplural|name|symbol|desc|disp|user(?:i|ii|iii|iv|v|vi))?|Acr(?:long|full|short)?(?:pl)?|ac[slf]?p?)(?:\[[^[\]]*\])?{([^}]*)$/i
                provider = this.glossary
                break
            default:
                // This shouldn't be possible, so mark as error case in log.
                logger.log(`Error - trying to complete unknown type ${type}`)
                return []
        }
        let lineToPos = args.line.substring(0, args.position.character)
        if (type === 'argument') {
            lineToPos = lineToPos.replace(/(?<!\\begin){[^[\]{}]*}/g, '').replace(/\[[^[\]{}]*\]/g, '')
        }
        const result = lineToPos.match(reg)
        let suggestions: vscode.CompletionItem[] = []
        if (result) {
            suggestions = provider.provideFrom(result, args)
        }
        return suggestions
    }
}

export class AtSuggestionCompleter implements vscode.CompletionItemProvider {
    private atSuggestion: AtSuggestion
    private triggerCharacter: string

    constructor() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        this.triggerCharacter = configuration.get('intellisense.atSuggestion.trigger.latex') as string
        this.atSuggestion = new AtSuggestion(this.triggerCharacter)
    }

    updateTrigger() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        this.triggerCharacter = configuration.get('intellisense.atSuggestion.trigger.latex') as string
        this.atSuggestion = new AtSuggestion(this.triggerCharacter)
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] | undefined {
        return this.provide({
            uri: document.uri,
            langId: document.languageId,
            line: document.lineAt(position).text,
            position
        })
    }

    provide(args: IProviderArgs): vscode.CompletionItem[] {
        const escapedTriggerCharacter = escapeRegExp(this.triggerCharacter)
        const reg = new RegExp(escapedTriggerCharacter + '[^\\\\s]*$')
        const result = args.line.substring(0, args.position.character).match(reg)
        let suggestions: vscode.CompletionItem[] = []
        if (result) {
            suggestions = this.atSuggestion.provideFrom(result, args)
        }
        return suggestions
    }
}
