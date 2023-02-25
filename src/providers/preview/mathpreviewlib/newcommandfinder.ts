import * as vscode from 'vscode'
import {latexParser} from 'latex-utensils'
import {stripCommentsAndVerbatim, isNewCommand, NewCommand} from '../../../utils/utils'
import * as path from 'path'
import * as lw from '../../../lw'
import { getLogger } from '../../../components/logger'
import { syntaxParser } from '../../../components/parser/syntax'

const logger = getLogger('Preview', 'Math')

export class NewCommandFinder {
    private static postProcessNewCommands(commands: string): string {
        return commands.replace(/\\providecommand/g, '\\newcommand')
                       .replace(/\\newcommand\*/g, '\\newcommand')
                       .replace(/\\renewcommand\*/g, '\\renewcommand')
                       .replace(/\\DeclarePairedDelimiter{(\\[a-zA-Z]+)}{([^{}]*)}{([^{}]*)}/g, '\\newcommand{$1}[2][]{#1$2 #2 #1$3}')
    }

    private static async loadNewCommandFromConfigFile(newCommandFile: string) {
        let commandsString: string | undefined = ''
        if (newCommandFile === '') {
            return commandsString
        }
        let newCommandFileAbs: string
        if (path.isAbsolute(newCommandFile)) {
            newCommandFileAbs = newCommandFile
        } else {
            if (lw.manager.rootFile === undefined) {
                await lw.manager.findRoot()
            }
            const rootDir = lw.manager.rootDir
            if (rootDir === undefined) {
                logger.log(`Cannot identify the absolute path of new command file ${newCommandFile} without root file.`)
                return ''
            }
            newCommandFileAbs = path.join(rootDir, newCommandFile)
        }
        commandsString = lw.lwfs.readFileSyncGracefully(newCommandFileAbs)
        if (commandsString === undefined) {
            logger.log(`Cannot read file ${newCommandFileAbs}`)
            return ''
        }
        commandsString = commandsString.replace(/^\s*$/gm, '')
        commandsString = NewCommandFinder.postProcessNewCommands(commandsString)
        return commandsString
    }

    static async findProjectNewCommand(ctoken?: vscode.CancellationToken): Promise<string> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const newCommandFile = configuration.get('hover.preview.newcommand.newcommandFile') as string
        let commandsInConfigFile = ''
        if (newCommandFile !== '') {
            commandsInConfigFile = await NewCommandFinder.loadNewCommandFromConfigFile(newCommandFile)
        }

        if (!configuration.get('hover.preview.newcommand.parseTeXFile.enabled')) {
            return commandsInConfigFile
        }
        let commands: string[] = []
        let exceeded = false
        setTimeout( () => { exceeded = true }, 5000)
        for (const tex of lw.cacher.getIncludedTeX()) {
            if (ctoken?.isCancellationRequested) {
                return ''
            }
            if (exceeded) {
                logger.log('Timeout error when parsing preambles in findProjectNewCommand.')
                throw new Error('Timeout Error in findProjectNewCommand')
            }
            const content = lw.cacher.get(tex)?.content
            if (content === undefined) {
                continue
            }
            commands = commands.concat(await NewCommandFinder.findNewCommand(content))
        }
        return commandsInConfigFile + '\n' + NewCommandFinder.postProcessNewCommands(commands.join(''))
    }

    static async findNewCommand(content: string): Promise<string[]> {
        let commands: string[] = []
        try {
            const ast = await syntaxParser.parseLatexPreamble(content)
            for (const node of ast.content) {
                if ((isNewCommand(node) || latexParser.isDefCommand(node)) && node.args.length > 0) {
                    node.name = node.name.replace(/\*$/, '') as NewCommand['name']
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
                        command = command.replace('*', '')
                    }
                    commands.push(command)
                }
            } while (result)
        }
        return commands
    }
}
