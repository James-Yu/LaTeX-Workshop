import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

import type { ILinter } from '../linter'
import { LinterUtil } from './linterutil'
import { convertFilenameEncoding } from '../../utils/convertfilename'
import type {LoggerLocator, ManagerLocator} from '../../interfaces'

interface IExtension extends
    LoggerLocator,
    ManagerLocator { }

export class ChkTeX implements ILinter {
    readonly #linterName = 'ChkTeX'
    readonly linterDiagnostics: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection(this.#linterName)
    readonly #linterUtil: LinterUtil

    constructor(private readonly extension: IExtension) {
        this.#linterUtil = new LinterUtil(extension)
    }

    async lintRootFile() {
        this.extension.logger.addLogMessage('Linter for root file started.')
        if (this.extension.manager.rootFile === undefined) {
            this.extension.logger.addLogMessage('No root file found for linting.')
            return
        }
        const filePath = this.extension.manager.rootFile
        const requiredArgs = ['-f%f:%l:%c:%d:%k:%n:%m\n', filePath]

        const stdout = await this.chktexWrapper('root', vscode.Uri.file(filePath), filePath, requiredArgs, undefined)
        if (stdout === undefined) { // It's possible to have empty string as output
            return
        }

        const tabSize = this.getChktexrcTabSize(filePath)
        this.parseLog(stdout, undefined, tabSize)
    }

    async lintFile(document: vscode.TextDocument) {
        this.extension.logger.addLogMessage('Linter for active file started.')
        const filePath = document.fileName
        const content = document.getText()
        const requiredArgs = ['-I0', '-f%f:%l:%c:%d:%k:%n:%m\n']
        const stdout = await this.chktexWrapper('active', document, filePath, requiredArgs, content)
        if (stdout === undefined) { // It's possible to have empty string as output
            return
        }
        // provide the original path to the active file as the second argument, so
        // we report this second path in the diagnostics instead of the temporary one.
        const tabSize = this.getChktexrcTabSize(document.fileName)
        this.parseLog(stdout, filePath, tabSize)
    }

    private async chktexWrapper(linterid: string, configScope: vscode.ConfigurationScope, filePath: string, requiredArgs: string[], content?: string): Promise<string | undefined> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', configScope)
        const command = configuration.get('linting.chktex.exec.path') as string
        const args = [...(configuration.get('linting.chktex.exec.args') as string[])]
        if (!args.includes('-l')) {
            const rcPath = this.rcPath
            if (rcPath) {
                args.push('-l', rcPath)
            }
        }

        let stdout: string
        try {
            stdout = await this.#linterUtil.processWrapper(linterid, command, args.concat(requiredArgs).filter(arg => arg !== ''), {cwd: path.dirname(filePath)}, content)
        } catch (err: any) {
            if ('stdout' in err) {
                stdout = err.stdout as string
            } else {
                return undefined
            }
        }

        return stdout
    }

    private get rcPath() {
        let rcPath: string
        // 0. root file folder
        const root = this.extension.manager.rootFile
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
        return undefined
    }

    private globalRcPath(): string | undefined {
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

    private getChktexrcTabSize(file: string): number | undefined {
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
            if (this.rcPath) {
                filePath = this.rcPath
            } else {
                filePath = this.globalRcPath()
            }
        }
        if (!filePath) {
            this.extension.logger.addLogMessage('The .chktexrc file not found.')
            return
        }
        const rcFile = fs.readFileSync(filePath).toString()
        const reg = /^\s*TabSize\s*=\s*(\d+)\s*$/m
        const match = reg.exec(rcFile)
        if (match) {
            const ret = Number(match[1])
            this.extension.logger.addLogMessage(`TabSize and .chktexrc: ${ret}, ${filePath}`)
            return ret
        }
        this.extension.logger.addLogMessage(`TabSize not found in the .chktexrc file: ${filePath}`)
        return
    }

    parseLog(log: string, singleFileOriginalPath?: string, tabSizeArg?: number) {
        const re = /^(.*?):(\d+):(\d+):(\d+):(.*?):(\d+):(.*?)$/gm
        const linterLog: ChkTeXLogEntry[] = []
        let match = re.exec(log)
        while (match) {
            // This log may be for a single file in memory, in which case we override the
            // path with what is provided
            let filePath = singleFileOriginalPath ? singleFileOriginalPath : match[1]
            if (!path.isAbsolute(filePath) && this.extension.manager.rootDir !== undefined) {
                filePath = path.resolve(this.extension.manager.rootDir, filePath)
            }
            const line = parseInt(match[2])
            const column = this.callConvertColumn(parseInt(match[3]), filePath, line, tabSizeArg)
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
        this.extension.logger.addLogMessage(`Linter log parsed with ${linterLog.length} messages.`)
        if (singleFileOriginalPath === undefined) {
            // A full lint of the project has taken place - clear all previous results.
            this.linterDiagnostics.clear()
        } else if (linterLog.length === 0) {
            // We are linting a single file and the new log is empty for it -
            // clean existing records.
            this.linterDiagnostics.set(vscode.Uri.file(singleFileOriginalPath), [])
        }
        this.showLinterDiagnostics(linterLog)
    }

    private callConvertColumn(column: number, filePathArg: string, line: number, tabSizeArg?: number): number {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', this.extension.manager.getWorkspaceFolderRootDir())
        if (!configuration.get('linting.chktex.convertOutput.column.enabled', true)) {
            return column
        }
        const filePath = convertFilenameEncoding(filePathArg)
        if (!filePath){
            this.extension.logger.addLogMessage(`Stop converting chktex's column numbers. File not found: ${filePathArg}`)
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
            this.extension.logger.addLogMessage(`Stop converting chktex's column numbers. Invalid line number: ${line}`)
            return column
        }
        return this.convertColumn(column, lineString, tabSize)
    }

    /**
     * @param colArg One-based value.
     * @param tabSize The default value used by chktex is 8.
     * @returns One-based value.
     */
    private convertColumn(colArg: number, lineString: string, tabSize = 8): number {
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

    private showLinterDiagnostics(linterLog: ChkTeXLogEntry[]) {
        const diagsCollection = Object.create(null) as { [key: string]: vscode.Diagnostic[] }
        for (const item of linterLog) {
            const range = new vscode.Range(
                new vscode.Position(item.line - 1, item.column - 1),
                new vscode.Position(item.line - 1, item.column - 1 + item.length)
            )
            const diag = new vscode.Diagnostic(range, item.text, DIAGNOSTIC_SEVERITY[item.type])
            diag.code = item.code
            diag.source = this.#linterName
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
                this.linterDiagnostics.set(vscode.Uri.file(file1), diagsCollection[file])
            }
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
