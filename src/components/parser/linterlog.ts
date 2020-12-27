import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

import type { Extension } from '../../main'
import { convertFilenameEncoding } from '../../utils/utils'

interface LinterLogEntry {
    file: string,
    line: number,
    position: number,
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

    parse(log: string, singleFileOriginalPath?: string) {
        const re = /^(.*?):(\d+):(\d+):(\d+):(.*?):(\d+):(.*?)$/gm
        const linterLog: LinterLogEntry[] = []
        let match = re.exec(log)
        while (match) {
            // This log may be for a single file in memory, in which case we override the
            // path with what is provided
            const filePath = singleFileOriginalPath ? singleFileOriginalPath : match[1]
            linterLog.push({
                file: (!path.isAbsolute(filePath) && this.extension.manager.rootDir !== undefined) ?
                    path.resolve(this.extension.manager.rootDir, filePath) : filePath,
                line: parseInt(match[2]),
                position: parseInt(match[3]),
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

    private showLinterDiagnostics(linterLog: LinterLogEntry[]) {
        const diagsCollection: { [key: string]: vscode.Diagnostic[] } = {}
        for (const item of linterLog) {
            const range = new vscode.Range(new vscode.Position(item.line - 1, item.position - 1),
                new vscode.Position(item.line - 1, item.position - 1 + item.length))
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
