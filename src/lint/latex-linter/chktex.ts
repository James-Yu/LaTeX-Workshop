import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { lw } from '../../lw'
import type { LaTeXLinter } from '../../types'
import { processWrapper } from './utils'
import { convertFilenameEncoding } from '../../utils/convertfilename'

const logger = lw.log('Linter', 'ChkTeX')

const getName = () => 'ChkTeX'
export const chkTeX: LaTeXLinter = {
    linterDiagnostics: vscode.languages.createDiagnosticCollection(getName()),
    getName,
    lintFile,
    lintRootFile,
    parseLog
}

let linterProcess: ChildProcessWithoutNullStreams | undefined

async function lintRootFile(rootPath: string) {
    const requiredArgs = ['-f%f:%l:%c:%d:%k:%n:%m\n', rootPath]

    const stdout = await chktexWrapper('root', vscode.Uri.file(rootPath), rootPath, requiredArgs, undefined)
    if (stdout === undefined) { // It's possible to have empty string as output
        return
    }

    const tabSize = getChktexrcTabSize(rootPath)
    parseLog(stdout, undefined, tabSize)
}

async function lintFile(document: vscode.TextDocument) {
    const filePath = document.fileName
    const content = document.getText()
    const requiredArgs = ['-I0', '-f%f:%l:%c:%d:%k:%n:%m\n']
    const stdout = await chktexWrapper('active', document, filePath, requiredArgs, content)
    if (stdout === undefined) { // It's possible to have empty string as output
        return
    }
    // provide the original path to the active file as the second argument, so
    // we report this second path in the diagnostics instead of the temporary one.
    const tabSize = getChktexrcTabSize(document.fileName)
    parseLog(stdout, filePath, tabSize)
}

async function chktexWrapper(linterid: string, configScope: vscode.ConfigurationScope, filePath: string, requiredArgs: string[], content?: string): Promise<string | undefined> {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', configScope)
    const command = configuration.get('linting.chktex.exec.path') as string
    const args = [...(configuration.get('linting.chktex.exec.args') as string[])]
    if (!args.includes('-l')) {
        const rcPath = getRcPath()
        if (rcPath) {
            args.push('-l', rcPath)
        }
    }

    let stdout: string
    try {
        linterProcess?.kill()
        logger.logCommand(`Linter for ${getName()} command`, command, args.concat(requiredArgs).filter(arg => arg !== ''))
        linterProcess = spawn(command, args.concat(requiredArgs).filter(arg => arg !== ''), { cwd: path.dirname(filePath) })
        stdout = await processWrapper(linterid, linterProcess, content)
    } catch (err: any) {
        if ('stdout' in err) {
            stdout = err.stdout as string
        } else {
            return
        }
    }

    return stdout
}

function getRcPath() {
    let rcPath: string
    // 0. root file folder
    const root = lw.root.file.path
    if (root) {
        rcPath = path.resolve(path.dirname(root), './.chktexrc')
    } else {
        return
    }
    if (fs.existsSync(rcPath)) {
        return rcPath
    }

    // 1. project root folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
    if (workspaceFolder) {
        rcPath = path.resolve(workspaceFolder.uri.fsPath, './.chktexrc')
    }
    if (fs.existsSync(rcPath)) {
        return rcPath
    }
    return
}

function globalRcPath(): string | undefined {
    const rcPathArray: string[] = []
    if (os.platform() === 'win32') {
        if (process.env.CHKTEXRC) {
            rcPathArray.push(path.join(process.env.CHKTEXRC, 'chktexrc'))
        }
        if (process.env.CHKTEX_HOME) {
            rcPathArray.push(path.join(process.env.CHKTEX_HOME, 'chktexrc'))
        }
        if (process.env.EMTEXDIR) {
            rcPathArray.push(path.join(process.env.EMTEXDIR, 'data', 'chktexrc'))
        }
    } else {
        if (process.env.HOME) {
            rcPathArray.push(path.join(process.env.HOME, '.chktexrc'))
        }
        if (process.env.LOGDIR) {
            rcPathArray.push(path.join(process.env.LOGDIR, '.chktexrc'))
        }
        if (process.env.CHKTEXRC) {
            rcPathArray.push(path.join(process.env.CHKTEXRC, '.chktexrc'))
        }
    }
    for (const rcPath of rcPathArray) {
        if (fs.existsSync(rcPath)) {
            return rcPath
        }
    }
    return
}

function getChktexrcTabSize(file: string): number | undefined {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(file))
    const args = configuration.get('linting.chktex.exec.args') as string[]
    let filePath: string | undefined
    if (args.includes('-l')) {
        const idx = args.indexOf('-l')
        if (idx >= 0) {
            const rcpath = args[idx+1]
            if (fs.existsSync(rcpath)) {
                filePath = rcpath
            }
        }
    } else {
        const rcPath = getRcPath()
        if (rcPath) {
            filePath = rcPath
        } else {
            filePath = globalRcPath()
        }
    }
    if (!filePath) {
        logger.log('No .chktexrc file is found to determine TabSize.')
        return
    }
    const rcFile = fs.readFileSync(filePath).toString()
    const reg = /^\s*TabSize\s*=\s*(\d+)\s*$/m
    const match = reg.exec(rcFile)
    if (match) {
        const ret = Number(match[1])
        logger.log(`TabSize ${ret} defined in .chktexrc ${filePath} .`)
        return ret
    }
    logger.log(`No TabSize is found in .chktexrc ${filePath} .`)
    return
}

function parseLog(log: string, singleFileOriginalPath?: string, tabSizeArg?: number) {
    const re = /^(.*?):(\d+):(\d+):(\d+):(.*?):(\d+):(.*?)$/gm
    const linterLog: ChkTeXLogEntry[] = []
    let match = re.exec(log)
    while (match) {
        // This log may be for a single file in memory, in which case we override the
        // path with what is provided
        let filePath = singleFileOriginalPath ? singleFileOriginalPath : match[1]
        if (!path.isAbsolute(filePath) && lw.root.dir.path !== undefined) {
            filePath = path.resolve(lw.root.dir.path, filePath)
        }
        const line = parseInt(match[2])
        const column = callConvertColumn(parseInt(match[3]), filePath, line, tabSizeArg)
        linterLog.push({
            file: filePath,
            line,
            column,
            length: parseInt(match[4]),
            type: match[5].toLowerCase(),
            code: parseInt(match[6]),
            text: `${match[6]}: ${match[7]}`
        })
        match = re.exec(log)
    }
    logger.log(`Logged ${linterLog.length} messages.`)
    if (singleFileOriginalPath === undefined) {
        // A full lint of the project has taken place - clear all previous results.
        chkTeX.linterDiagnostics.clear()
    } else if (linterLog.length === 0) {
        // We are linting a single file and the new log is empty for it -
        // clean existing records.
        chkTeX.linterDiagnostics.set(vscode.Uri.file(singleFileOriginalPath), [])
    }
    showLinterDiagnostics(linterLog)
}

function callConvertColumn(column: number, filePathArg: string, line: number, tabSizeArg?: number): number {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.root.getWorkspace())
    if (!configuration.get('linting.chktex.convertOutput.column.enabled', true)) {
        return column
    }
    const filePath = convertFilenameEncoding(filePathArg)
    if (!filePath){
        logger.log(`Column number not converted on non-existent ${filePathArg} .`)
        return column
    }
    const lineString = fs.readFileSync(filePath).toString().split('\n')[line-1]
    let tabSize: number | undefined
    const tabSizeConfig = configuration.get('linting.chktex.convertOutput.column.chktexrcTabSize', -1)
    if (tabSizeConfig >= 0) {
        tabSize = tabSizeConfig
    } else {
        tabSize = tabSizeArg
    }
    if (lineString === undefined) {
        logger.log(`Column number not converted by invalid line ${line} of ${filePathArg}.`)
        return column
    }
    return convertColumn(column, lineString, tabSize)
}

/**
 * @param colArg One-based value.
 * @param tabSize The default value used by chktex is 8.
 * @returns One-based value.
 */
function convertColumn(colArg: number, lineString: string, tabSize = 8): number {
    const col = colArg - 1
    const charByteArray = lineString.split('').map((c) => Buffer.byteLength(c))
    let i = 0
    let pos = 0
    while (i < charByteArray.length) {
        if (col <= pos) {
            break
        }
        if (lineString[i] === '\t') {
            pos += tabSize
        } else {
            pos += charByteArray[i]
        }
        i += 1
    }
    return i + 1
}

function showLinterDiagnostics(linterLog: ChkTeXLogEntry[]) {
    const diagsCollection = Object.create(null) as { [key: string]: vscode.Diagnostic[] }
    for (const item of linterLog) {
        const range = new vscode.Range(
            new vscode.Position(item.line - 1, item.column - 1),
            new vscode.Position(item.line - 1, item.column - 1 + item.length)
        )
        const diag = new vscode.Diagnostic(range, item.text, DIAGNOSTIC_SEVERITY[item.type])
        diag.code = item.code
        diag.source = getName()
        if (diagsCollection[item.file] === undefined) {
            diagsCollection[item.file] = []
        }
        diagsCollection[item.file].push(diag)
    }
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const convEnc = configuration.get('message.convertFilenameEncoding') as boolean
    for (const file in diagsCollection) {
        let file1 = file
        if (['.tex', '.bbx', '.cbx', '.dtx'].includes(path.extname(file))) {
            // Only report ChkTeX errors on TeX files. This is done to avoid
            // reporting errors in .sty files, which are irrelevant for most users.
            if (!fs.existsSync(file1) && convEnc) {
                const f = convertFilenameEncoding(file1)
                if (f !== undefined) {
                    file1 = f
                }
            }
            chkTeX.linterDiagnostics.set(vscode.Uri.file(file1), diagsCollection[file])
        }
    }
}

interface ChkTeXLogEntry {
    file: string,
    line: number,
    column: number,
    length: number,
    type: string,
    code: number,
    text: string
}

const DIAGNOSTIC_SEVERITY: { [key: string]: vscode.DiagnosticSeverity } = {
    'typesetting': vscode.DiagnosticSeverity.Information,
    'warning': vscode.DiagnosticSeverity.Warning,
    'error': vscode.DiagnosticSeverity.Error,
}
