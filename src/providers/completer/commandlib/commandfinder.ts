import * as vscode from 'vscode'
import {latexParser} from 'latex-utensils'
import {CmdEnvSuggestion} from '../completerutils'


export function isTriggerSuggestNeeded(name: string): boolean {
    const reg = /^(?:[a-z]*(cite|ref|input)[a-z]*|begin|bibitem|(sub)?(import|includefrom|inputfrom)|gls(?:pl|text|first|plural|firstplural|name|symbol|desc|user(?:i|ii|iii|iv|v|vi))?|Acr(?:long|full|short)?(?:pl)?|ac[slf]?p?)/i
    return reg.test(name)
}

export class CommandFinder {
    static definedCmds = new Map<string, {file: string, location: vscode.Location}>()

    static getCmdFromNodeArray(file: string, nodes: latexParser.Node[], cmdInPkg: CmdEnvSuggestion[], commandSignatureDuplicationDetector: CommandSignatureDuplicationDetector): CmdEnvSuggestion[] {
        let cmds: CmdEnvSuggestion[] = []
        nodes.forEach((node, index) => {
            const prev = nodes[index - 1]
            const next = nodes[index + 1]
            cmds = cmds.concat(CommandFinder.getCmdFromNode(file, node, cmdInPkg, commandSignatureDuplicationDetector, latexParser.isCommand(prev) ? prev : undefined, latexParser.isCommand(next) ? next : undefined))
        })
        return cmds
    }

    private static getCmdFromNode(file: string, node: latexParser.Node, cmdInPkg: CmdEnvSuggestion[], commandSignatureDuplicationDetector: CommandSignatureDuplicationDetector, prev?: latexParser.Command, next?: latexParser.Command): CmdEnvSuggestion[] {
        const cmds: CmdEnvSuggestion[] = []
        const newCommandDeclarations = ['newcommand', 'renewcommand', 'providecommand', 'DeclareMathOperator', 'DeclarePairedDelimiter', 'DeclarePairedDelimiterX', 'DeclarePairedDelimiterXPP']
        if (latexParser.isDefCommand(node)) {
            const name = node.token.slice(1)
            const args = CommandFinder.getArgsFromNode(node)
            const cmd = new CmdEnvSuggestion(`\\${name}${args}`, '', [], -1, {name, args}, vscode.CompletionItemKind.Function)
            if (!commandSignatureDuplicationDetector.has(cmd)) {
                cmd.documentation = '`' + name + '`'
                cmd.insertText = new vscode.SnippetString(name + CommandFinder.getTabStopsFromNode(node))
                cmd.filterText = name
                if (isTriggerSuggestNeeded(name)) {
                    cmd.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
                }
                cmds.push(cmd)
                commandSignatureDuplicationDetector.add(cmd)
            }
        } else if (latexParser.isCommand(node) && latexParser.isCommand(prev) && newCommandDeclarations.includes(prev.name.replace(/\*$/, '')) && prev.args.length === 0) {
            // We have gone to the WARNING part of \newcommand\WARNING{\textcolor{red}{WARNING}}, already parsed
            return cmds
        } else if (latexParser.isCommand(node) && newCommandDeclarations.includes(node.name.replace(/\*$/, ''))) {
            // \newcommand{\fix}[3][]{\chdeleted{#2}\chadded[comment={#1}]{#3}}
            const inside = node.args.length > 0
                && latexParser.isGroup(node.args[0])
                && node.args[0].content.length > 0
                && latexParser.isCommand(node.args[0].content[0])
            // \newcommand\WARNING{\textcolor{red}{WARNING}}
            const beside = next
                && latexParser.isCommand(next)
                && next.args.length > 0
            if (!inside && !beside) {
                return cmds
            }
            const label = ((inside ? node.args[0].content[0] : next) as latexParser.Command).name
            let tabStops = ''
            let newargs = ''
            const argsNode = inside ? node.args : next?.args || []
            const argNumNode = inside ? argsNode[1] : argsNode[0]
            if (latexParser.isOptionalArg(argNumNode)) {
                const numArgs = parseInt((argNumNode.content[0] as latexParser.TextString).content)
                let index = 1
                for (let i = (inside ? 2 : 1); i <= argsNode.length - 1; ++i) {
                    if (!latexParser.isOptionalArg(argsNode[i])) {
                        break
                    }
                    tabStops += '[${' + index + '}]'
                    newargs += '[]'
                    index++
                }
                for (; index <= numArgs; ++index) {
                    tabStops += '{${' + index + '}}'
                    newargs += '{}'
                }
            }
            const newcmd = new CmdEnvSuggestion(`\\${label}${newargs}`, 'user-defined', [], -1, {name: label, args: newargs}, vscode.CompletionItemKind.Function)
            if (!commandSignatureDuplicationDetector.has(newcmd)) {
                newcmd.documentation = '`' + label + '`'
                newcmd.insertText = new vscode.SnippetString(label + tabStops)
                newcmd.filterText = label
                if (isTriggerSuggestNeeded(label)) {
                    newcmd.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
                }
                cmds.push(newcmd)
                CommandFinder.definedCmds.set(newcmd.signatureAsString(), {
                    file,
                    location: new vscode.Location(
                        vscode.Uri.file(file),
                        new vscode.Position(node.location.start.line - 1, node.location.start.column))
                })
                commandSignatureDuplicationDetector.add(newcmd)
            }
        } else if (latexParser.isCommand(node)) {
            const args = CommandFinder.getArgsFromNode(node)
            const cmd = new CmdEnvSuggestion(`\\${node.name}${args}`, '', [], -1, {name: node.name, args}, vscode.CompletionItemKind.Function)
            if (!commandSignatureDuplicationDetector.has(cmd) && !newCommandDeclarations.includes(node.name)) {
                cmd.package = CommandFinder.whichPackageProvidesCommand(node.name, args, cmdInPkg)
                cmd.documentation = '`' + node.name + '`'
                cmd.insertText = new vscode.SnippetString(node.name + CommandFinder.getTabStopsFromNode(node))
                if (isTriggerSuggestNeeded(node.name)) {
                    cmd.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
                }
                cmds.push(cmd)
                commandSignatureDuplicationDetector.add(cmd)
            }
        }
        if (latexParser.hasContentArray(node)) {
            return cmds.concat(CommandFinder.getCmdFromNodeArray(file, node.content, cmdInPkg, commandSignatureDuplicationDetector))
        }
        return cmds
    }

    private static getArgsHelperFromNode(node: latexParser.Node, helper: (i: number) => string): string {
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

    private static getTabStopsFromNode(node: latexParser.Node): string {
        return CommandFinder.getArgsHelperFromNode(node, (i: number) => { return '${' + i + '}' })
    }

    private static getArgsFromNode(node: latexParser.Node): string {
        return CommandFinder.getArgsHelperFromNode(node, (_: number) => { return '' })
    }


    static getCmdFromContent(file: string, content: string, cmdInPkg: CmdEnvSuggestion[]): CmdEnvSuggestion[] {
        const cmdReg = /\\([a-zA-Z@_]+(?::[a-zA-Z]*)?\*?)({[^{}]*})?({[^{}]*})?({[^{}]*})?/g
        const cmds: CmdEnvSuggestion[] = []
        const commandSignatureDuplicationDetector = new CommandSignatureDuplicationDetector()
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
            const args = CommandFinder.getArgsFromRegResult(result)
            const cmd = new CmdEnvSuggestion(
                `\\${result[1]}${args}`,
                CommandFinder.whichPackageProvidesCommand(result[1], args, cmdInPkg),
                [],
                -1,
                { name: result[1], args },
                vscode.CompletionItemKind.Function
            )
            cmd.documentation = '`' + result[1] + '`'
            cmd.insertText = new vscode.SnippetString(result[1] + CommandFinder.getTabStopsFromRegResult(result))
            cmd.filterText = result[1]
            if (isTriggerSuggestNeeded(result[1])) {
                cmd.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
            }
            if (!commandSignatureDuplicationDetector.has(cmd)) {
                cmds.push(cmd)
                commandSignatureDuplicationDetector.add(cmd)
            }
        }

        const newCommandReg = /\\(?:(?:(?:re|provide)?(?:new)?command)|(?:DeclarePairedDelimiter(?:X|XPP)?)|DeclareMathOperator)\*?{?\\(\w+)}?(?:\[([1-9])\])?/g
        while (true) {
            const result = newCommandReg.exec(content)
            if (result === null) {
                break
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

            const cmd = new CmdEnvSuggestion(`\\${result[1]}${args}`, 'user-defined', [], -1, {name: result[1], args}, vscode.CompletionItemKind.Function)
            cmd.documentation = '`' + result[1] + '`'
            cmd.insertText = new vscode.SnippetString(result[1] + tabStops)
            cmd.filterText = result[1]
            if (!commandSignatureDuplicationDetector.has(cmd)) {
                cmds.push(cmd)
                commandSignatureDuplicationDetector.add(cmd)
            }

            CommandFinder.definedCmds.set(result[1], {
                file,
                location: new vscode.Location(
                    vscode.Uri.file(file),
                    new vscode.Position(content.substring(0, result.index).split('\n').length - 1, 0))
            })
        }

        return cmds
    }

    private static getTabStopsFromRegResult(result: RegExpExecArray): string {
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

    private static getArgsFromRegResult(result: RegExpExecArray): string {
        return '{}'.repeat(result.length - 1)
    }

    /**
     * Return the name of the package providing cmdName among all the packages
     * included in the rootFile. If no package matches, return ''
     *
     * @param cmdName the name of a command (without the leading '\\')
     */
    private static whichPackageProvidesCommand(cmdName: string, args: string, cmdInPkg: CmdEnvSuggestion[]): string {
        return cmdInPkg.find(cmd => cmd.signatureAsString() === cmdName + args)?.package ?? ''
    }

}


export class CommandSignatureDuplicationDetector {
    private readonly cmdSignatureList: Set<string> = new Set<string>()

    constructor(suggestions: CmdEnvSuggestion[] = []) {
        this.cmdSignatureList = new Set<string>(suggestions.map(s => s.signatureAsString()))
    }

    add(cmd: CmdEnvSuggestion) {
        this.cmdSignatureList.add(cmd.signatureAsString())
    }

    has(cmd: CmdEnvSuggestion): boolean {
        return this.cmdSignatureList.has(cmd.signatureAsString())
    }
}
