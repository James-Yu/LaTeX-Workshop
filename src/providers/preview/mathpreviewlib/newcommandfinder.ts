import * as vscode from 'vscode'
import * as fs from 'fs'
import {latexParser} from 'latex-utensils'
import {stripCommentsAndVerbatim} from '../../../utils/utils'
import * as path from 'path'

import type {Extension} from '../../../main'

export class NewCommandFinder {
    private readonly extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    private postProcessNewCommands(commands: string): string {
        return commands.replace(/\\providecommand/g, '\\newcommand')
                       .replace(/\\newcommand\*/g, '\\newcommand')
                       .replace(/\\renewcommand\*/g, '\\renewcommand')
                       .replace(/\\DeclarePairedDelimiter{(\\[a-zA-Z]+)}{([^{}]*)}{([^{}]*)}/g, '\\newcommand{$1}[2][]{#1$2 #2 #1$3}')
    }

    private async loadNewCommandFromConfigFile(newCommandFile: string) {
        let commandsString = ''
        if (newCommandFile === '') {
            return commandsString
        }
        if (path.isAbsolute(newCommandFile)) {
            if (fs.existsSync(newCommandFile)) {
                commandsString = fs.readFileSync(newCommandFile, {encoding: 'utf8'})
            }
        } else {
            if (this.extension.manager.rootFile === undefined) {
                await this.extension.manager.findRoot()
            }
            const rootDir = this.extension.manager.rootDir
            if (rootDir === undefined) {
                this.extension.logger.addLogMessage(`Cannot identify the absolute path of new command file ${newCommandFile} without root file.`)
                return ''
            }
            const newCommandFileAbs = path.join(rootDir, newCommandFile)
            if (fs.existsSync(newCommandFileAbs)) {
                commandsString = fs.readFileSync(newCommandFileAbs, {encoding: 'utf8'})
            }
        }
        commandsString = commandsString.replace(/^\s*$/gm, '')
        commandsString = this.postProcessNewCommands(commandsString)
        return commandsString
    }

    async findProjectNewCommand(ctoken: vscode.CancellationToken): Promise<string> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const newCommandFile = configuration.get('hover.preview.newcommand.newcommandFile') as string
        let commandsInConfigFile = ''
        if (newCommandFile !== '') {
            commandsInConfigFile = await this.loadNewCommandFromConfigFile(newCommandFile)
        }

        if (!configuration.get('hover.preview.newcommand.parseTeXFile.enabled')) {
            return commandsInConfigFile
        }
        let commands: string[] = []
        let exceeded = false
        setTimeout( () => { exceeded = true }, 5000)
        for (const tex of this.extension.manager.getIncludedTeX()) {
            if (ctoken.isCancellationRequested) {
                return ''
            }
            if (exceeded) {
                this.extension.logger.addLogMessage('Timeout error when parsing preambles in findProjectNewCommand.')
                throw new Error('Timeout Error in findProjectNewCommand')
            }
            const content = this.extension.manager.getCachedContent(tex).content
            commands = commands.concat(await this.findNewCommand(content))
        }
        return commandsInConfigFile + '\n' + this.postProcessNewCommands(commands.join(''))
    }

    async findNewCommand(content: string): Promise<string[]> {
        let commands: string[] = []
        try {
            const ast = await this.extension.pegParser.parseLatexPreamble(content)
            const regex = /^(renewcommand|newcommand|providecommand|DeclareMathOperator)(\*)?$/
            for (const node of ast.content) {
                if (((latexParser.isCommand(node) && node.name.match(regex)) || latexParser.isDefCommand(node)) && node.args.length > 0) {
                    node.name = node.name.replace(/\*/, '')
                    const s = latexParser.stringify(node)
                    commands.push(s)
                } else if (latexParser.isCommand(node) && node.name === 'DeclarePairedDelimiter' && node.args.length === 3) {
                    const name = latexParser.stringify(node.args[0])
                    const leftDelim = latexParser.stringify(node.args[1]).slice(1, -1)
                    const rightDelim = latexParser.stringify(node.args[2]).slice(1, -1)
                    const s = `\\newcommand${name}[2][]{#1${leftDelim} #2 #1${rightDelim}}`
                    commands.push(s)
                }
            }
        } catch (e) {
            commands = []
            const regex = /(\\(?:(?:(?:(?:re)?new|provide)command|DeclareMathOperator)(\*)?{\\[a-zA-Z]+}(?:\[[^[\]{}]*\])*{.*})|\\(?:def\\[a-zA-Z]+(?:#[0-9])*{.*})|\\DeclarePairedDelimiter{\\[a-zA-Z]+}{[^{}]*}{[^{}]*})/gm
            const noCommentContent = stripCommentsAndVerbatim(content)
            let result: RegExpExecArray | null
            do {
                result = regex.exec(noCommentContent)
                if (result) {
                    let command = result[1]
                    if (result[2]) {
                        command = command.replace(/\*/, '')
                    }
                    commands.push(command)
                }
            } while (result)
        }
        return commands
    }

}
