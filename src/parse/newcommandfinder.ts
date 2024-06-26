import * as vscode from 'vscode'
import * as path from 'path'
import * as Ast from '@unified-latex/unified-latex-types'
import { lw } from '../lw'

const logger = lw.log('Parse', 'Macro')

export async function findMacros(ctoken?: vscode.CancellationToken): Promise<string> {
    let macros = ''
    const filepaths = []
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const macroDefPath = await resolveMacroDefFile(configuration.get('hover.preview.newcommand.newcommandFile') as string)
    if (macroDefPath !== undefined) {
        filepaths.push(macroDefPath)
        if (lw.cache.get(macroDefPath) === undefined) {
            lw.cache.add(macroDefPath)
        }
    }
    if (configuration.get('hover.preview.newcommand.parseTeXFile.enabled') as boolean) {
        lw.cache.getIncludedTeX().forEach(filepath => filepaths.push(filepath))
    }
    for (const filepath of filepaths) {
        if (ctoken?.isCancellationRequested) {
            return ''
        }
        await lw.cache.wait(filepath)
        const content = lw.cache.get(filepath)?.content
        const ast = lw.cache.get(filepath)?.ast
        if (content === undefined || ast === undefined) {
            logger.log(`Cannot parse the AST of ${filepath} .`)
        } else {
            macros += parseAst(content, ast).join('\n') + '\n'
        }
    }

    return macros
}

function parseAst(content: string, node: Ast.Node): string[] {
    let macros = []
    // \newcommand{\fix}[3][]{\chdeleted{#2}\chadded[comment={#1}]{#3}}
    // \newcommand\WARNING{\textcolor{red}{WARNING}}
    const isNewCommand = node.type === 'macro' &&
        ['newcommand', 'renewcommand', 'newrobustcmd', 'renewrobustcmd'].includes(node.content) &&
        node.args?.[2]?.content?.[0]?.type === 'macro'
    // \DeclarePairedDelimiterX\braketzw[2]{\langle}{\rangle}{#1\,\delimsize\vert\,\mathopen{}#2}
    const isDeclarePairedDelimiter = node.type === 'macro' &&
        ['DeclarePairedDelimiter', 'DeclarePairedDelimiterX', 'DeclarePairedDelimiterXPP'].includes(node.content) &&
        node.args?.[0]?.content?.[0]?.type === 'macro'
    const isProvideCommand = node.type === 'macro' &&
        ['providecommand', 'providerobustcmd', 'DeclareMathOperator', 'DeclareRobustCommand'].includes(node.content) &&
        node.args?.[1]?.content?.[0]?.type === 'macro'
    if (isNewCommand || isDeclarePairedDelimiter || isProvideCommand) {
        macros.push(
            lw.parser.parse.stringify(node)
                // Change providecommand to newcommand
                .replaceAll(/^\\providecommand([^a-zA-Z])/g, '\\newcommand$1')
                // Remove the star as MathJax does not support #4127
                .replaceAll(/^\\([a-zA-Z]+)\*/g, '\\$1')
        )
    }

    if ('content' in node && typeof node.content !== 'string') {
        for (const subNode of node.content) {
            macros = [...macros, ...parseAst(content, subNode)]
        }
    }
    return macros
}

async function resolveMacroDefFile(filepath: string): Promise<string | undefined> {
    if (filepath === '') {
        return undefined
    }
    let filepathAbs: string
    if (path.isAbsolute(filepath)) {
        filepathAbs = filepath
    } else {
        if (lw.root.file.path === undefined) {
            await lw.root.find()
        }
        const rootDir = lw.root.dir.path
        if (rootDir === undefined) {
            logger.log(`Cannot identify the absolute path of macro definition file ${filepath} without root file.`)
            return undefined
        }
        filepathAbs = path.join(rootDir, filepath)
    }
    if (await lw.file.exists(filepathAbs)) {
        return filepathAbs
    }
    return undefined
}
