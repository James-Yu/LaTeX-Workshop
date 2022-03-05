import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

import type { Extension } from '../../main'
import { convertFilenameEncoding } from '../../utils/convertfilename'

interface LinterLogEntry {
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

export class LinterLogParser {
    private readonly extension: Extension
    private readonly linterDiagnostics = vscode.languages.createDiagnosticCollection('ChkTeX')

    constructor(extension: Extension) {
        this.extension = extension
    }

    parse(log: string, singleFileOriginalPath?: string, tabSizeArg?: number) {
        const re = /^(.*?):(\d+):(\d+):(\d+):(.*?):(\d+):(.*?)$/gm
        const linterLog: LinterLogEntry[] = []
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
        if (!configuration.get('chktex.convertOutput.column.enabled', true)) {
            return column
        }
        const filePath = convertFilenameEncoding(filePathArg)
        if (!filePath){
            this.extension.logger.addLogMessage(`Stop converting chktex's column numbers. File not found: ${filePathArg}`)
            return column
        }
        const lineString = fs.readFileSync(filePath).toString().split('\n')[line-1]
        let tabSize: number | undefined
        const tabSizeConfig = configuration.get('chktex.convertOutput.column.chktexrcTabSize', -1)
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

    private showLinterDiagnostics(linterLog: LinterLogEntry[]) {
        const diagsCollection = Object.create(null) as { [key: string]: vscode.Diagnostic[] }
        for (const item of linterLog) {
            const range = new vscode.Range(
                new vscode.Position(item.line - 1, item.column - 1),
                new vscode.Position(item.line - 1, item.column - 1 + item.length)
            )
            const diag = new vscode.Diagnostic(range, item.text, DIAGNOSTIC_SEVERITY[item.type])
            diag.code = item.code
            diag.source = 'ChkTeX'
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
