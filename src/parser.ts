import * as vscode from 'vscode'
import * as path from 'path'

import {Extension} from './main'

const latexPattern = /^Output\swritten\son\s(.*)\s\(.*\)\.$/gm
const latexFatalPattern = /Fatal error occurred, no output PDF file produced!/gm
const latexError = /^(?:(.*):(\d+):|!)(?: (.+) Error:)? (.+?)\.?$/
const latexBox = /^((?:Over|Under)full \\[vh]box \([^)]*\)) in paragraph at lines (\d+)--(\d+)$/
const latexWarn = /^((?:(?:Class|Package) \S+)|LaTeX) (Warning|Info):\s+(.*?)(?: on input line (\d+))?\.$/

const latexmkPattern = /^Latexmk:\sapplying\srule/gm
const latexmkPatternNoGM = /^Latexmk:\sapplying\srule/
const latexmkUpToDate = /^Latexmk: All targets \(.*\) are up-to-date/


const DIAGNOSTIC_SEVERITY: {[key: string]: vscode.DiagnosticSeverity} = {
    'typesetting': vscode.DiagnosticSeverity.Hint,
    'warning': vscode.DiagnosticSeverity.Warning,
    'error': vscode.DiagnosticSeverity.Error,
}

interface LinterLogEntry {
    file: string
    line: number
    position: number
    length: number
    type: string
    code: number
    text: string
}

export class Parser {
    extension: Extension
    isLaTeXmkSkipped: boolean
    buildLog: any[] = []
    buildLogRaw: string
    compilerDiagnostics = vscode.languages.createDiagnosticCollection('LaTeX')
    linterDiagnostics = vscode.languages.createDiagnosticCollection('ChkTeX')

    constructor(extension: Extension) {
        this.extension = extension
    }

    parse(log: string) {
        this.isLaTeXmkSkipped = false
        if (log.match(latexmkPattern)) {
            log = this.trimLaTeXmk(log)
        }
        if (log.match(latexPattern) || log.match(latexFatalPattern)) {
            this.parseLaTeX(log)
        } else if (this.latexmkSkipped(log)) {
            this.isLaTeXmkSkipped = true
        }
    }

    trimLaTeXmk(log: string) : string {
        log = log.replace(/(.{78}(\w|\s|\d|\\|\/))(\r\n|\n)/g, '$1')
        const lines = log.replace(/(\r\n)|\r/g, '\n').split('\n')
        let finalLine = -1
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index]
            const result = line.match(latexmkPatternNoGM)
            if (result) {
                finalLine = index
            }
        }
        return lines.slice(finalLine).join('\n')
    }

    latexmkSkipped(log: string) : boolean {
        const lines = log.replace(/(\r\n)|\r/g, '\n').split('\n')
        if (lines[0].match(latexmkUpToDate)) {
            this.showCompilerDiagnostics()
            return true
        }
        return false
    }

    parseLaTeX(log: string) {
        log = log.replace(/(.{78}(\w|\s|\d|\\|\/))(\r\n|\n)/g, '$1')
        this.buildLogRaw = log
        const lines = log.replace(/(\r\n)|\r/g, '\n').split('\n')
        this.buildLog = []
        for (const line of lines) {
            let result = line.match(latexBox)
            if (result) {
                this.buildLog.push({
                    type: 'typesetting',
                    text: result[1],
                    file: this.extension.manager.rootFile,
                    line: parseInt(result[2], 10)
                })
                continue
            }
            result = line.match(latexWarn)
            if (result) {
                this.buildLog.push({
                    type: 'warning',
                    text: result[3],
                    file: this.extension.manager.rootFile,
                    line: parseInt(result[4])
                })
                continue
            }
            result = line.match(latexError)
            if (result) {
                this.buildLog.push({
                    type: 'error',
                    text: (result[3] && result[3] !== 'LaTeX') ? `${result[3]}: ${result[4]}` : result[4],
                    file: result[1] ? path.resolve(this.extension.manager.rootDir, result[1]) : this.extension.manager.rootFile,
                    line: result[2] ? parseInt(result[2], 10) : undefined
                })
                continue
            }
        }
        this.extension.logger.addLogMessage(`LaTeX log parsed with ${this.buildLog.length} messages.`)
        this.showCompilerDiagnostics()
    }

    parseLinter(log: string, singleFileOriginalPath?: string) {
        const re = /^(.*?):(\d+):(\d+):(\d+):(.*?):(\d+):(.*?)$/gm
        const linterLog: LinterLogEntry[] = []
        let match = re.exec(log)
        while (match) {
            // this log may be for a single file in memory, in which case we override the
            // path with what is provided
            const filePath = singleFileOriginalPath ? singleFileOriginalPath : match[1]
            linterLog.push({
                file: path.isAbsolute(filePath) ? filePath : path.resolve(this.extension.manager.rootDir, filePath),
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

    showCompilerDiagnostics() {
        this.compilerDiagnostics.clear()
        const diagsCollection: {[key: string]: vscode.Diagnostic[]} = {}
        for (const item of this.buildLog) {
            const range = new vscode.Range(new vscode.Position(item.line - 1, 0), new vscode.Position(item.line - 1, 65535))
            const diag = new vscode.Diagnostic(range, item.text, DIAGNOSTIC_SEVERITY[item.type])
            diag.source = 'LaTeX'
            if (diagsCollection[item.file] === undefined) {
                diagsCollection[item.file] = []
            }
            diagsCollection[item.file].push(diag)
        }

        for (const file in diagsCollection) {
            this.compilerDiagnostics.set(vscode.Uri.file(file), diagsCollection[file])
        }
    }

    showLinterDiagnostics(linterLog: LinterLogEntry[]) {
        const diagsCollection: {[key: string]: vscode.Diagnostic[]} = {}
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
        for (const file in diagsCollection) {
            if (this.extension.manager.isTex(file)) {
                // only report ChkTeX errors on TeX files. This is done to avoid
                // reporting errors in .sty files which for most users is irrelevant.
                this.linterDiagnostics.set(vscode.Uri.file(file), diagsCollection[file])
            }
        }
    }
}
