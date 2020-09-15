import * as vscode from 'vscode'
import * as fs from 'fs-extra'

import {Extension} from '../main'
import {IProvider} from './completer/interface'
import {Citation} from './completer/citation'
import {DocumentClass} from './completer/documentclass'
import {Command} from './completer/command'
import {Environment} from './completer/environment'
import {Reference} from './completer/reference'
import {Package} from './completer/package'
import {Input} from './completer/input'
import {Glossary} from './completer/glossary'

export class Completer implements vscode.CompletionItemProvider {
    private readonly extension: Extension
    readonly citation: Citation
    readonly command: Command
    readonly documentClass: DocumentClass
    readonly environment: Environment
    readonly reference: Reference
    readonly package: Package
    readonly input: Input
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
        this.glossary = new Glossary()
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
        const env = JSON.parse(defaultEnvs)
        const cmds = JSON.parse(defaultCommands)
        const maths = JSON.parse(defaultLaTeXMathSymbols)
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
        const invokeChar = document.lineAt(position.line).text[position.character - 1]
        const currentLine = document.lineAt(position.line).text
        if (position.character > 1 && currentLine[position.character - 1] === '\\' && currentLine[position.character - 2] === '\\') {
            return
        }
        if (this.command.bracketCmds && this.command.bracketCmds[invokeChar]) {
            if (position.character > 1 && currentLine[position.character - 2] === '\\') {
                const mathSnippet = Object.assign({}, this.command.bracketCmds[invokeChar])
                if (vscode.workspace.getConfiguration('editor', document.uri).get('autoClosingBrackets') &&
                    (currentLine.length > position.character && [')', ']', '}'].includes(currentLine[position.character]))) {
                    mathSnippet.range = new vscode.Range(position.translate(0, -1), position.translate(0, 1))
                } else {
                    mathSnippet.range = new vscode.Range(position.translate(0, -1), position)
                }
                return [mathSnippet]
            }
        }

        const line = document.lineAt(position.line).text.substr(0, position.character)
        // Note that the order of the following array affects the result.
        // 'command' must be at the last because it matches any commands.
        for (const type of ['citation', 'reference', 'environment', 'package', 'documentclass', 'input', 'subimport', 'import', 'includeonly', 'command', 'glossary']) {
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

    async resolveCompletionItem(item: vscode.CompletionItem): Promise<vscode.CompletionItem> {
        if (item.kind !== vscode.CompletionItemKind.File) {
            return item
        }
        const preview = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.includegraphics.preview.enabled') as boolean
        if (!preview) {
            return item
        }
        const filePath = item.documentation
        if (typeof filePath !== 'string') {
            return item
        }
        const rsc = await this.extension.graphicsPreview.renderGraphics(filePath, { height: 190, width: 300 })
        if (rsc === undefined) {
            return item
        }

        // \u{2001} is a unicode character of space with width of one em.
        const spacer = '\n\n\u{2001}  \n\n\u{2001}  \n\n\u{2001}  \n\n\u{2001}  \n\n\u{2001}  \n\n\u{2001}  \n\n'
        const md = new vscode.MarkdownString(`![graphics](${rsc})` + spacer)
        const ret = new vscode.CompletionItem(item.label, vscode.CompletionItemKind.File)
        ret.documentation = md
        return ret
    }

    private completion(type: string, line: string, args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}): vscode.CompletionItem[] {
        let reg: RegExp | undefined
        let provider: IProvider | undefined
        switch (type) {
            case 'citation':
                reg = /(?:\\[a-zA-Z]*[Cc]ite[a-zA-Z]*\*?(?:\([^[)]*\)){0,2}(?:(?:\[[^[\]]*\])*(?:{[^{}]*})?)*{([^}]*)$)|(?:\\bibentry{([^}]*)$)/
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
                reg = args.document.languageId === 'latex-expl3' ? /\\([a-zA-Z_@]*(?::[a-zA-Z]*)?)$/ : /\\([a-zA-Z]*)$/
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
                reg = /\\(input|include|subfile|includegraphics|lstinputlisting|verbatiminput)\*?(?:\[[^[\]]*\])*{([^}]*)$/
                provider = this.input
                break
            case 'includeonly':
                reg = /\\(includeonly|excludeonly){(?:{[^}]*},)*(?:[^,]*,)*{?([^},]*)$/
                provider = this.input
                break
            case 'import':
                reg = /\\(import|includefrom|inputfrom)\*?(?:{([^}]*)})?{([^}]*)$/
                provider = this.input
                break
            case 'subimport':
                reg = /\\(sub(?:import|includefrom|inputfrom))\*?(?:{([^}]*)})?{([^}]*)$/
                provider = this.input
                break
            case 'glossary':
                reg = /\\([Gg]ls(?:pl)?|acr(?:full|long|short)){([^}]*)$/
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
            suggestions = provider.provideFrom(type, result, args)
        }
        return suggestions
    }
}
