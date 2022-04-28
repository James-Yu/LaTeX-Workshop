import * as vscode from 'vscode'
import * as fs from 'fs'
import {latexParser} from 'latex-utensils'

import {Suggestion} from '../command'
import type {Extension} from '../../../main'
import type {ILwCompletionItem} from '../interface'


export function isTriggerSuggestNeeded(name: string): boolean {
    const reg = /^(?:[a-z]*(cite|ref|input)[a-z]*|begin|bibitem|(sub)?(import|includefrom|inputfrom)|gls(?:pl|text|first|plural|firstplural|name|symbol|desc|user(?:i|ii|iii|iv|v|vi))?|Acr(?:long|full|short)?(?:pl)?|ac[slf]?p?)/i
    return reg.test(name)
}

export function resolveCmdEnvFile(name: string, dataDir: string): string | undefined {
    const dirs = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.package.dirs') as string[]
    dirs.push(dataDir)
    for (const dir of dirs) {
        const f = `${dir}/${name}`
        if (fs.existsSync(f)) {
            return f
        }
    }
    // Many package with names like toppackage-config.sty are just wrappers around
    // the general package toppacke.sty and do not define commands on their own.
    const suffix = name.substring(name.lastIndexOf('_'))
    const indexDash = name.lastIndexOf('-')
    if (indexDash > - 1) {
        const generalPkg = name.substring(0, indexDash)
        const f = `${dataDir}/${generalPkg}${suffix}`
        if (fs.existsSync(f)) {
            return f
        }
    }
    return undefined
}

export class CommandFinder {
    private readonly extension: Extension
    definedCmds = new Map<string, {file: string, location: vscode.Location}>()

    constructor(extension: Extension) {
        this.extension = extension
    }

    getCmdFromNodeArray(file: string, nodes: latexParser.Node[], cmdNameList: Set<string> = new Set<string>()): Suggestion[] {
        let cmds: Suggestion[] = []
        nodes.forEach(node => {
            cmds = cmds.concat(this.getCmdFromNode(file, node, cmdNameList))
        })
        return cmds
    }

    private getCmdFromNode(file: string, node: latexParser.Node, cmdNameList: Set<string> = new Set<string>()): Suggestion[] {
        const cmds: Suggestion[] = []
        if (latexParser.isDefCommand(node)) {
           const name = node.token.slice(1)
            if (!cmdNameList.has(name)) {
                const cmd = new Suggestion(`\\${name}`, '', {name, args: this.getArgsFromNode(node)}, vscode.CompletionItemKind.Function)
                cmd.documentation = '`' + name + '`'
                cmd.insertText = new vscode.SnippetString(name + this.getTabStopsFromNode(node))
                cmd.filterText = name
                if (isTriggerSuggestNeeded(name)) {
                    cmd.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
                }
                cmds.push(cmd)
                cmdNameList.add(name)
            }
        } else if (latexParser.isCommand(node)) {
            if (!cmdNameList.has(node.name)) {
                const cmd = new Suggestion(`\\${node.name}`,
                    this.whichPackageProvidesCommand(node.name),
                    { name: node.name, args: this.getArgsFromNode(node) },
                    vscode.CompletionItemKind.Function
                )

                cmd.documentation = '`' + node.name + '`'
                cmd.insertText = new vscode.SnippetString(node.name + this.getTabStopsFromNode(node))
                if (isTriggerSuggestNeeded(node.name)) {
                    cmd.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
                }
                cmds.push(cmd)
                cmdNameList.add(node.name)
            }
            if (['newcommand', 'renewcommand', 'providecommand', 'DeclareMathOperator', 'DeclarePairedDelimiter', 'DeclarePairedDelimiterX', 'DeclarePairedDelimiterXPP'].includes(node.name.replace(/\*$/, '')) &&
                Array.isArray(node.args) && node.args.length > 0) {
                const label = (node.args[0].content[0] as latexParser.Command).name
                let tabStops = ''
                let args = ''
                if (latexParser.isOptionalArg(node.args[1])) {
                    const numArgs = parseInt((node.args[1].content[0] as latexParser.TextString).content)
                    for (let i = 1; i <= numArgs; ++i) {
                        tabStops += '{${' + i + '}}'
                        args += '{}'
                    }
                }
                if (!cmdNameList.has(label)) {
                    const cmd = new Suggestion(`\\${label}`, 'user-defined', {name: label, args}, vscode.CompletionItemKind.Function)
                    cmd.documentation = '`' + label + '`'
                    cmd.insertText = new vscode.SnippetString(label + tabStops)
                    cmd.filterText = label
                    if (isTriggerSuggestNeeded(label)) {
                        cmd.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
                    }
                    cmds.push(cmd)
                    this.definedCmds.set(label, {
                        file,
                        location: new vscode.Location(
                            vscode.Uri.file(file),
                            new vscode.Position(node.location.start.line - 1, node.location.start.column))
                    })
                    cmdNameList.add(label)
                }
            }
        }
        if (latexParser.hasContentArray(node)) {
            return cmds.concat(this.getCmdFromNodeArray(file, node.content, cmdNameList))
        }
        return cmds
    }

    private getArgsHelperFromNode(node: latexParser.Node, helper: (i: number) => string): string {
        let args = ''
        if (!('args' in node)) {
            return args
        }
        let index = 0
        if (latexParser.isCommand(node)) {
            node.args.forEach(arg => {
                ++index
                if (latexParser.isOptionalArg(arg)) {
                    args += '[' + helper(index) + ']'
                } else {
                    args += '{' + helper(index) + '}'
                }
            })
            return args
        }
        if (latexParser.isDefCommand(node)) {
            node.args.forEach(arg => {
                ++index
                if (latexParser.isCommandParameter(arg)) {
                    args += '{' + helper(index) + '}'
                }
            })
            return args
        }
        return args
    }

    private getTabStopsFromNode(node: latexParser.Node): string {
        return this.getArgsHelperFromNode(node, (i: number) => { return '${' + i + '}' })
    }

    private getArgsFromNode(node: latexParser.Node): string {
        return this.getArgsHelperFromNode(node, (_: number) => { return '' })
    }


    getCmdFromContent(file: string, content: string): Suggestion[] {
        const cmdReg = /\\([a-zA-Z@_]+(?::[a-zA-Z]*)?\*?)({[^{}]*})?({[^{}]*})?({[^{}]*})?/g
        const cmds: Suggestion[] = []
        const cmdNameList: Set<string> = new Set<string>()
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
            if (cmdNameList.has(result[1])) {
                continue
            }
            const cmd = new Suggestion(
                `\\${result[1]}`,
                this.whichPackageProvidesCommand(result[1]),
                { name: result[1], args: this.getArgsFromRegResult(result) },
                vscode.CompletionItemKind.Function
            )
            cmd.documentation = '`' + result[1] + '`'
            cmd.insertText = new vscode.SnippetString(result[1] + this.getTabStopsFromRegResult(result))
            cmd.filterText = result[1]
            if (isTriggerSuggestNeeded(result[1])) {
                cmd.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
            }
            cmds.push(cmd)
            cmdNameList.add(result[1])
        }

        const newCommandReg = /\\(?:(?:(?:re|provide)?(?:new)?command)|(?:DeclarePairedDelimiter(?:X|XPP)?)|DeclareMathOperator)\*?{?\\(\w+)}?(?:\[([1-9])\])?/g
        while (true) {
            const result = newCommandReg.exec(content)
            if (result === null) {
                break
            }
            if (cmdNameList.has(result[1])) {
                continue
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

            const cmd = new Suggestion(`\\${result[1]}`, 'user-defined', {name: result[1], args}, vscode.CompletionItemKind.Function)
            cmd.documentation = '`' + result[1] + '`'
            cmd.insertText = new vscode.SnippetString(result[1] + tabStops)
            cmd.filterText = result[1]
            cmds.push(cmd)
            cmdNameList.add(result[1])

            this.definedCmds.set(result[1], {
                file,
                location: new vscode.Location(
                    vscode.Uri.file(file),
                    new vscode.Position(content.substring(0, result.index).split('\n').length - 1, 0))
            })
        }

        return cmds
    }

    private getTabStopsFromRegResult(result: RegExpExecArray): string {
        let text = ''

        if (result[2]) {
            text += '{${1}}'
        }
        if (result[3]) {
            text += '{${2}}'
        }
        if (result[4]) {
            text += '{${3}}'
        }
        return text
    }

    private getArgsFromRegResult(result: RegExpExecArray): string {
        return '{}'.repeat(result.length - 1)
    }

    /**
     * Return the name of the package providing cmdName among all the packages
     * including in the rootFile. If no package matches, return ''
     *
     * @param cmdName the name of a command (without the leading '\')
     */
    private whichPackageProvidesCommand(cmdName: string): string {
        if (this.extension.manager.rootFile !== undefined) {
            for (const file of this.extension.manager.getIncludedTeX()) {
                const cachedPkgs = this.extension.manager.getCachedContent(file)?.element.package
                if (cachedPkgs === undefined) {
                    continue
                }
                for (const pkg of cachedPkgs) {
                    const commands: ILwCompletionItem[] = []
                    this.extension.completer.command.provideCmdInPkg(pkg, commands, new Set<string>())
                    for (const cmd of commands) {
                        const label = cmd.label.slice(1)
                        if (label.startsWith(cmdName) &&
                            ((label.length === cmdName.length) ||
                            (label.charAt(cmdName.length) === '[') ||
                            (label.charAt(cmdName.length) === '{'))) {
                            return pkg
                        }
                    }
                }
            }
        }
        return ''
    }

}
