import * as vscode from 'vscode'
import * as lw from '../../lw'
import type { IProvider } from '../completion'
import { CmdEnvSuggestion, filterArgumentHint } from './completerutils'
import { EnvSnippetType } from './environment'

export class Argument implements IProvider {

    provideFrom(result: RegExpMatchArray, args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}): vscode.CompletionItem[] {
        if (result[1] === 'usepackage') {
            return this.providePackageOptions(args)
        }
        if (result[1] === 'documentclass') {
            return this.provideClassOptions(args)
        }
        const index = this.getArgumentIndex(result[2])
        const packages = lw.completer.package.getPackagesIncluded(args.document.languageId)
        let candidate: CmdEnvSuggestion | undefined
        let environment: string | undefined
        if (result[1] === 'begin') {
            environment = result[2].match(/{(.*?)}/)?.[1]
        }
        for (const packageName of Object.keys(packages)) {
            if (environment) {
                const environments = lw.completer.environment.getEnvFromPkg(packageName, EnvSnippetType.AsCommand) || []
                for (const env of environments) {
                    if (environment !== env.signature.name) {
                        continue
                    }
                    if (index !== env.keyvalIndex + 1) { // Start from one.
                        continue
                    }
                    candidate = env
                }
            } else {
                const commands = lw.completer.command.getPackageCmds(packageName)
                for (const command of commands) {
                    if (result[1] !== command.signature.name) {
                        continue
                    }
                    if (index !== command.keyvalIndex) {
                        continue
                    }
                    candidate = command
                    break
                }
            }
            if (candidate !== undefined) {
                break
            }
        }
        const suggestions = candidate?.keyvals?.map(option => {
            const item = new vscode.CompletionItem(option, vscode.CompletionItemKind.Constant)
            item.insertText = new vscode.SnippetString(option)
            return item
        }) || []

        filterArgumentHint(suggestions)

        return suggestions
    }

    private providePackageOptions(args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}): vscode.CompletionItem[] {
        const line = args.document.lineAt(args.position.line).text
        const regex = /\\usepackage.*?{(.*?)}/
        const match = line.match(regex)
        if (!match) {
            return []
        }
        lw.completer.loadPackageData(match[1])
        const suggestions = lw.completer.package.getPackageOptions(match[1])
            .map(option => {
                const item = new vscode.CompletionItem(option, vscode.CompletionItemKind.Constant)
                item.insertText = new vscode.SnippetString(option)
                return item
            })

        filterArgumentHint(suggestions)

        return suggestions
    }

    private provideClassOptions(args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}): vscode.CompletionItem[] {
        const line = args.document.lineAt(args.position.line).text
        const regex = /\\documentclass.*?{(.*?)}/
        const match = line.match(regex)
        if (!match) {
            return []
        }
        const isDefaultClass = ['article', 'report', 'book'].includes(match[1])
        lw.completer.loadPackageData(isDefaultClass ? 'latex-document' : `class-${match[1]}`)
        const suggestions = lw.completer.package.getPackageOptions(isDefaultClass ? 'latex-document' : `class-${match[1]}`)
            .map(option => {
                const item = new vscode.CompletionItem(option, vscode.CompletionItemKind.Constant)
                item.insertText = new vscode.SnippetString(option)
                return item
            })

        filterArgumentHint(suggestions)

        return suggestions
    }

    private getArgumentIndex(argstr: string) {
        let argumentIndex = 0
        let curlyLevel = argstr[0] === '{' ? 1 : 0
        let squareLevel = argstr[0] === '[' ? 1 : 0
        for (let index = 1; index < argstr.length; index++) {
            if (argstr[index-1] === '\\') {
                continue
            }
            switch (argstr[index]) {
                case '{':
                    curlyLevel++
                    break
                case '[':
                    squareLevel++
                    break
                case '}':
                    curlyLevel--
                    if (curlyLevel === 0 && squareLevel === 0) {
                        argumentIndex++
                    }
                    break
                case ']':
                    squareLevel--
                    if (curlyLevel === 0 && squareLevel === 0) {
                        argumentIndex++
                    }
                    break
                default:
                    break
            }
        }
        return argumentIndex
    }
}
