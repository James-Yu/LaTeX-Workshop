import * as vscode from 'vscode'
import * as fs from 'fs'

import type {Extension} from '../main'
import type {IProvider} from './completer/interface'
import {Citation} from './completer/citation'
import {DocumentClass} from './completer/documentclass'
import {Command} from './completer/command'
import type {CmdItemEntry} from './completer/command'
import {Environment} from './completer/environment'
import type {EnvItemEntry} from './completer/environment'
import {AtSuggestion} from './completer/atsuggestion'
import {Reference} from './completer/reference'
import {Package} from './completer/package'
import {Input, Import, SubImport} from './completer/input'
import {Glossary} from './completer/glossary'
import type {ReferenceDocType} from './completer/reference'
import {escapeRegExp} from '../utils/utils'
import type {CommandLocator} from '../interfaces'

type DataEnvsJsonType = typeof import('../../data/environments.json')
type DataCmdsJsonType = typeof import('../../data/commands.json')
type DataLatexMathSymbolsJsonType = typeof import('../../data/packages/latex-mathsymbols_cmd.json')

export class Completer implements vscode.CompletionItemProvider, CommandLocator {
    private readonly extension: Extension
    readonly citation: Citation
    readonly command: Command
    readonly documentClass: DocumentClass
    readonly environment: Environment
    readonly reference: Reference
    readonly package: Package
    readonly input: Input
    readonly import: Import
    readonly subImport: SubImport
    readonly glossary: Glossary

    constructor(extension: Extension) {
        this.extension = extension
        this.citation = new Citation(extension)
        this.environment = new Environment(extension) // Must be created before command
        this.command = new Command(extension, this.environment)
        this.documentClass = new DocumentClass(extension)
        this.reference = new Reference(extension)
        this.package = new Package(extension)
        this.input = new Input(extension)
        this.import = new Import(extension)
        this.subImport = new SubImport(extension)
        this.glossary = new Glossary(extension)
        try {
            this.loadDefaultItems()
        } catch (err) {
            this.extension.logger.addLogMessage(`Error reading data: ${err}.`)
        }
    }

    private loadDefaultItems() {
        const defaultEnvs = fs.readFileSync(`${this.extension.extensionRoot}/data/environments.json`, {encoding: 'utf8'})
        const defaultCommands = fs.readFileSync(`${this.extension.extensionRoot}/data/commands.json`, {encoding: 'utf8'})
        const defaultLaTeXMathSymbols = fs.readFileSync(`${this.extension.extensionRoot}/data/packages/latex-mathsymbols_cmd.json`, {encoding: 'utf8'})
        const env: { [key: string]: EnvItemEntry } = JSON.parse(defaultEnvs) as DataEnvsJsonType
        const cmds = JSON.parse(defaultCommands) as DataCmdsJsonType
        const maths: { [key: string]: CmdItemEntry } = JSON.parse(defaultLaTeXMathSymbols) as DataLatexMathSymbolsJsonType
        for (const key of Object.keys(maths)) {
            if (key.match(/\{.*?\}/)) {
                const ent = maths[key]
                const newKey = key.replace(/\{.*?\}/, '')
                delete maths[key]
                maths[newKey] = ent
            }
        }
        Object.assign(maths, cmds)
        // Make sure to initialize environment first
        this.environment.initialize(env)
        this.command.initialize(maths)
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.CompletionItem[] | undefined {
        const currentLine = document.lineAt(position.line).text
        if (position.character > 1 && currentLine[position.character - 1] === '\\' && currentLine[position.character - 2] === '\\') {
            return
        }
        const line = document.lineAt(position.line).text.substring(0, position.character)
        // Note that the order of the following array affects the result.
        // 'command' must be at the last because it matches any commands.
        for (const type of ['citation', 'reference', 'environment', 'package', 'documentclass', 'input', 'subimport', 'import', 'includeonly', 'glossary', 'command']) {
            const suggestions = this.completion(type, line, {document, position, token, context})
            if (suggestions.length > 0) {
                if (type === 'citation') {
                    const configuration = vscode.workspace.getConfiguration('latex-workshop')
                    if (configuration.get('intellisense.citation.type') as string === 'browser') {
                        setTimeout(() => this.citation.browser({document, position, token, context}), 10)
                        return
                    }
                }
                return suggestions
            }
        }
        return
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
            const tex = this.extension.mathPreview.findHoverOnRef(sug, data.key)
            if (tex) {
                const svgDataUrl = await this.extension.mathPreview.renderSvgOnRef(tex, data, token)
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
            const md = await this.extension.graphicsPreview.renderGraphicsAsMarkdownString(filePath, { height: 190, width: 300 })
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

    private completion(type: string, line: string, args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}): vscode.CompletionItem[] {
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
                reg = /(?:\\begin(?:\[[^[\]]*\])?){([^}]*)$/
                provider = this.environment
                break
            case 'command':
                reg = args.document.languageId === 'latex-expl3' ? /\\([a-zA-Z_@]*(?::[a-zA-Z]*)?)$/ : /\\([a-zA-Z]*|(?:left|[Bb]ig{1,2}l)?[({[]?)$/
                provider = this.command
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
                reg = /\\(input|include|subfile|includegraphics|includesvg|lstinputlisting|verbatiminput|loadglsentries)\*?(?:\[[^[\]]*\])*{([^}]*)$/
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
                this.extension.logger.addLogMessage(`Error - trying to complete unknown type ${type}`)
                return []
        }
        const result = line.match(reg)
        let suggestions: vscode.CompletionItem[] = []
        if (result) {
            suggestions = provider.provideFrom(result, args)
        }
        return suggestions
    }
}

export class AtSuggestionCompleter implements vscode.CompletionItemProvider {
    private readonly atSuggestion: AtSuggestion
    private readonly triggerCharacter: string

    constructor(extension: Extension) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const triggerCharacter = configuration.get('intellisense.atSuggestion.trigger.latex') as string
        this.atSuggestion = new AtSuggestion(extension, triggerCharacter)
        this.triggerCharacter = triggerCharacter
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.CompletionItem[] | undefined {
        const line = document.lineAt(position.line).text.substring(0, position.character)
        return this.completion(line, {document, position, token, context})
    }

    private completion(line: string, args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}): vscode.CompletionItem[] {
        const escapedTriggerCharacter = escapeRegExp(this.triggerCharacter)
        const reg = new RegExp(escapedTriggerCharacter + '[^\\\\s]*$')
        const result = line.match(reg)
        let suggestions: vscode.CompletionItem[] = []
        if (result) {
            suggestions = this.atSuggestion.provideFrom(result, args)
        }
        return suggestions
    }
}
