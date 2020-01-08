import * as vscode from 'vscode'
import * as fs from 'fs-extra'

import {Extension} from '../main'
import {Citation} from './completer/citation'
import {Command} from './completer/command'
import {Environment} from './completer/environment'
import {Reference} from './completer/reference'
import {Package} from './completer/package'
import {Input} from './completer/input'

export class Completer implements vscode.CompletionItemProvider {
    extension: Extension
    citation: Citation
    command: Command
    environment: Environment
    reference: Reference
    package: Package
    input: Input

    constructor(extension: Extension) {
        this.extension = extension
        this.citation = new Citation(extension)
        this.command = new Command(extension)
        this.environment = new Environment(extension)
        this.reference = new Reference(extension)
        this.package = new Package(extension)
        this.input = new Input(extension)
        try {
            this.loadDefaultItems()
        } catch (err) {
            this.extension.logger.addLogMessage(`Error reading data: ${err}.`)
        }
    }

    loadDefaultItems() {
        const defaultEnvs = fs.readFileSync(`${this.extension.extensionRoot}/data/environments.json`, {encoding: 'utf8'})
        const defaultCommands = fs.readFileSync(`${this.extension.extensionRoot}/data/commands.json`, {encoding: 'utf8'})
        const defaultLaTeXMathSymbols = fs.readFileSync(`${this.extension.extensionRoot}/data/packages/latex-mathsymbols_cmd.json`,
                                                        {encoding: 'utf8'})
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
        this.command.initialize(maths, env)
        this.environment.initialize(env)
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Promise<vscode.CompletionItem[]> {
        return new Promise((resolve, _reject) => {
            const invokeChar = document.lineAt(position.line).text[position.character - 1]
            const currentLine = document.lineAt(position.line).text
            if (position.character > 1 && currentLine[position.character - 1] === '\\' && currentLine[position.character - 2] === '\\') {
                resolve()
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
                    resolve([mathSnippet])
                    return
                }
            }

            const line = document.lineAt(position.line).text.substr(0, position.character)
            for (const type of ['citation', 'reference', 'environment', 'package', 'input', 'subimport', 'import', 'command']) {
                const suggestions = this.completion(type, line, {document, position, token, context})
                if (suggestions.length > 0) {
                    if (type === 'citation') {
                        const configuration = vscode.workspace.getConfiguration('latex-workshop')
                        if (configuration.get('intellisense.citation.type') as string === 'browser') {
                            resolve()
                            setTimeout(() => this.citation.browser({document, position, token, context}), 10)
                            return
                        }
                    }
                    resolve(suggestions)
                    return
                }
            }
            resolve()
        })
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

    completion(type: string, line: string, args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}): vscode.CompletionItem[] {
        let reg: RegExp | undefined
        let provider: Citation | Reference | Environment | Command | Package | Input | undefined
        let payload: any
        switch (type) {
            case 'citation':
                reg = /(?:\\[a-zA-Z]*[Cc]ite[a-zA-Z]*\*?(?:(?:\[[^[\]]*\])*(?:{[^{}]*})?)*{([^}]*)$)|(?:\\bibentry{([^}]*)$)/
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
                reg = /\\([a-zA-Z]*)$/
                provider = this.command
                break
            case 'package':
                reg = /(?:\\usepackage(?:\[[^[\]]*\])*){([^}]*)$/
                provider = this.package
                break
            case 'input':
                reg = /\\(input|include|subfile|includegraphics|lstinputlisting|verbatiminput)\*?(?:\[[^[\]]*\])*{([^}]*)$/
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
            default:
                // This shouldn't be possible, so mark as error case in log.
                this.extension.logger.addLogMessage(`Error - trying to complete unknown type ${type}`)
                return []
        }
        const result = line.match(reg)
        let suggestions: vscode.CompletionItem[] = []
        if (result) {
            if (type === 'input' || type === 'import' || type === 'subimport') {
                const editor = vscode.window.activeTextEditor
                // Make sure to pass the args always in the same order [type, filename, command, typedFolder, importFromDir]
                if (editor) {
                    payload = [type, editor.document.fileName, result[1], ...result.slice(2).reverse()]
                }
            } else if (type === 'reference' || type === 'citation') {
                payload = args
            }
            suggestions = provider.provide(payload)
        }
        return suggestions
    }
}
