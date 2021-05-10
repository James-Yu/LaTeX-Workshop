import * as vscode from 'vscode'
import * as fs from 'fs'
import {latexParser} from 'latex-utensils'

import type {Suggestion} from '../command'
import type {Extension} from '../../../main'


export function isTriggerSuggestNeeded(name: string): boolean {
    const reg = /[a-z]*(cite|ref|input)[a-z]*|begin|bibitem|(sub)?(import|includefrom|inputfrom)|gls(?:pl|text|first|plural|firstplural|name|symbol|desc|user(?:i|ii|iii|iv|v|vi))?|Acr(?:long|full|short)?(?:pl)?|ac[slf]?p?/i
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
    definedCmds: {[key: string]: {file: string, location: vscode.Location}} = {}

    constructor(extension: Extension) {
        this.extension = extension
    }

    getCmdFromNodeArray(file: string, nodes: latexParser.Node[], cmdList: string[] = []): Suggestion[] {
        let cmds: Suggestion[] = []
        nodes.forEach(node => {
            cmds = cmds.concat(this.getCmdFromNode(file, node, cmdList))
        })
        return cmds
    }

    private getCmdFromNode(file: string, node: latexParser.Node, cmdList: string[] = []): Suggestion[] {
        const cmds: Suggestion[] = []
        if (latexParser.isDefCommand(node)) {
           const name = node.token.slice(1)
            if (!cmdList.includes(name)) {
                const cmd: Suggestion = {
                    label: `\\${name}`,
                    kind: vscode.CompletionItemKind.Function,
                    documentation: '`' + name + '`',
                    insertText: new vscode.SnippetString(name + this.getArgsFromNode(node)),
                    filterText: name,
                    package: ''
                }
                if (isTriggerSuggestNeeded(name)) {
                    cmd.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
                }
                cmds.push(cmd)
                cmdList.push(name)
            }
        } else if (latexParser.isCommand(node)) {
            if (!cmdList.includes(node.name)) {
                const cmd: Suggestion = {
                    label: `\\${node.name}`,
                    kind: vscode.CompletionItemKind.Function,
                    documentation: '`' + node.name + '`',
                    insertText: new vscode.SnippetString(node.name + this.getArgsFromNode(node)),
                    filterText: node.name,
                    package: this.whichPackageProvidesCommand(node.name)
                }
                if (isTriggerSuggestNeeded(node.name)) {
                    cmd.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
                }
                cmds.push(cmd)
                cmdList.push(node.name)
            }
            if (['newcommand', 'renewcommand', 'providecommand', 'DeclareMathOperator', 'DeclarePairedDelimiter', 'DeclarePairedDelimiterX', 'DeclarePairedDelimiterXPP'].includes(node.name.replace(/\*$/, '')) &&
                Array.isArray(node.args) && node.args.length > 0) {
                const label = (node.args[0].content[0] as latexParser.Command).name
                let args = ''
                if (latexParser.isOptionalArg(node.args[1])) {
                    const numArgs = parseInt((node.args[1].content[0] as latexParser.TextString).content)
                    for (let i = 1; i <= numArgs; ++i) {
                        args += '{${' + i + '}}'
                    }
                }
                if (!cmdList.includes(label)) {
                    const cmd: Suggestion = {
                        label: `\\${label}`,
                        kind: vscode.CompletionItemKind.Function,
                        documentation: '`' + label + '`',
                        insertText: new vscode.SnippetString(label + args),
                        filterText: label,
                        package: 'user-defined'
                    }
                    if (isTriggerSuggestNeeded(label)) {
                        cmd.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
                    }
                    cmds.push(cmd)
                    this.definedCmds[label] = {
                        file,
                        location: new vscode.Location(
                            vscode.Uri.file(file),
                            new vscode.Position(node.location.start.line - 1, node.location.start.column))
                    }
                    cmdList.push(label)
                }
            }
        }
        if (latexParser.hasContentArray(node)) {
            return cmds.concat(this.getCmdFromNodeArray(file, node.content, cmdList))
        }
        return cmds
    }

    private getArgsFromNode(node: latexParser.Node): string {
        let args = ''
        if (!('args' in node)) {
            return args
        }
        let index = 0
        if (latexParser.isCommand(node)) {
            node.args.forEach(arg => {
                ++index
                if (latexParser.isOptionalArg(arg)) {
                    args += '[${' + index + '}]'
                } else {
                    args += '{${' + index + '}}'
                }
            })
            return args
        }
        if (latexParser.isDefCommand(node)) {
            node.args.forEach(arg => {
                ++index
                if (latexParser.isCommandParameter(arg)) {
                    args += '{${' + index + '}}'
                }
            })
            return args
        }
        return args
    }

    getCmdFromContent(file: string, content: string): Suggestion[] {
        const cmdReg = /\\([a-zA-Z@_]+(?::[a-zA-Z]*)?\*?)({[^{}]*})?({[^{}]*})?({[^{}]*})?/g
        const cmds: Suggestion[] = []
        const cmdList: string[] = []
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
            if (cmdList.includes(result[1])) {
                continue
            }
            const cmd: Suggestion = {
                label: `\\${result[1]}`,
                kind: vscode.CompletionItemKind.Function,
                documentation: '`' + result[1] + '`',
                insertText: new vscode.SnippetString(this.getArgsFromRegResult(result)),
                filterText: result[1],
                package: this.whichPackageProvidesCommand(result[1])
            }
            if (isTriggerSuggestNeeded(result[1])) {
                cmd.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
            }
            cmds.push(cmd)
            cmdList.push(result[1])
        }

        const newCommandReg = /\\(?:(?:(?:re|provide)?(?:new)?command)|(?:DeclarePairedDelimiter(?:X|XPP)?)|DeclareMathOperator)\*?{?\\(\w+)}?(?:\[([1-9])\])?/g
        while (true) {
            const result = newCommandReg.exec(content)
            if (result === null) {
                break
            }
            if (cmdList.includes(result[1])) {
                continue
            }

            let args = ''
            if (result[2]) {
                const numArgs = parseInt(result[2])
                for (let i = 1; i <= numArgs; ++i) {
                    args += '{${' + i + '}}'
                }
            }

            const cmd: Suggestion = {
                label: `\\${result[1]}`,
                kind: vscode.CompletionItemKind.Function,
                documentation: '`' + result[1] + '`',
                insertText: new vscode.SnippetString(result[1] + args),
                filterText: result[1],
                package: 'user-defined'
            }
            cmds.push(cmd)
            cmdList.push(result[1])

            this.definedCmds[result[1]] = {
                file,
                location: new vscode.Location(
                    vscode.Uri.file(file),
                    new vscode.Position(content.substr(0, result.index).split('\n').length - 1, 0))
            }
        }

        return cmds
    }

    private getArgsFromRegResult(result: RegExpExecArray): string {
        let text = result[1]

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

    /**
     * Return the name of the package providing cmdName among all the packages
     * including in the rootFile. If no package matches, return ''
     *
     * @param cmdName the name of a command (without the leading '\')
     */
    private whichPackageProvidesCommand(cmdName: string): string {
        if (this.extension.manager.rootFile !== undefined) {
            for (const file of this.extension.manager.getIncludedTeX()) {
                const cachedPkgs = this.extension.manager.getCachedContent(file).element.package
                if (cachedPkgs === undefined) {
                    continue
                }
                for (const pkg of cachedPkgs) {
                    const commands: vscode.CompletionItem[] = []
                    this.extension.completer.command.provideCmdInPkg(pkg, commands, [])
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
