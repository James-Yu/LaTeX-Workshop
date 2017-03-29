'use strict'

import * as vscode from 'vscode'
import * as path from 'path'
import * as tmp from 'tmp'
import * as fs from 'fs'

import {Extension} from './main'

const latexPattern = /^Output\swritten\son\s(.*)\s\(.*\)\.$/gm
const latexFatalPattern = /Fatal error occurred, no output PDF file produced!/gm
const latexError = /^(?:(.*):(\d+):|!)(?: (.+) Error:)? (.+?)\.?$/
const latexBox = /^((?:Over|Under)full \\[vh]box \([^)]*\)) in paragraph at lines (\d+)--(\d+)$/
const latexWarn = /^((?:(?:Class|Package) \S+)|LaTeX) (Warning|Info):\s+(.*?)(?: on input line (\d+))?\.$/

const latexmkPattern = /^Latexmk:\sapplying\srule/gm
const latexmkPatternNoGM = /^Latexmk:\sapplying\srule/
const latexmkUpToDate = /^Latexmk: All targets \(.*\) are up-to-date/

const diagnostic_severity = {
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
    buildLog = []
    buildLogRaw: string
    buildLogFile: any
    compilerDiagnostics = vscode.languages.createDiagnosticCollection('LaTeX')
    linterDiagnostics = vscode.languages.createDiagnosticCollection('ChkTeX')

    constructor(extension: Extension) {
        this.extension = extension
    }

    parse(log: string) {
        this.isLaTeXmkSkipped = false
        if (log.match(latexmkPattern))
            log = this.trimLaTeXmk(log)
        if (log.match(latexPattern) || log.match(latexFatalPattern))
            this.parseLaTeX(log)
        else if (this.latexmkSkipped(log))
            this.isLaTeXmkSkipped = true
    }

    trimLaTeXmk(log: string) : string {
        log = log.replace(/(.{78}(\w|\s|\d|\\|\/))(\r\n|\n)/g, '$1')
        let lines = log.replace(/(\r\n)|\r/g, '\n').split('\n')
        let finalLine = -1
        for (let index = 0; index < lines.length; index++) {
            let line = lines[index]
            let result = line.match(latexmkPatternNoGM)
            if (result)
                finalLine = index
        }
        return lines.slice(finalLine).join('\n')
    }

    latexmkSkipped(log: string): boolean {
        let lines = log.replace(/(\r\n)|\r/g, '\n').split('\n')
        if (lines[0].match(latexmkUpToDate)) {
            this.showCompilerDiagnostics()
            return true
        }
        return false
    }

    parseLaTeX(log: string) {
        log = log.replace(/(.{78}(\w|\s|\d|\\|\/))(\r\n|\n)/g, '$1')
        this.buildLogRaw = log
        let lines = log.replace(/(\r\n)|\r/g, '\n').split('\n')
        this.buildLog = []
        for (let line of lines) {
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
        this.showCompilerDiagnostics(true)
    }

    parseLinter(log: string, singleFileOriginalPath?: string) {
        const re = /^(.*?):(\d+):(\d+):(\d+):(.*?):(\d+):(.*?)$/gm
        const linterLog: LinterLogEntry[] = []
        let match
        while (match = re.exec(log)) {
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

    showCompilerDiagnostics(createBuildLogRaw: boolean = false) {
        this.compilerDiagnostics.clear()
        let diagsCollection: {[key:string]:vscode.Diagnostic[]} = {}
        for (let item of this.buildLog) {
            const range = new vscode.Range(new vscode.Position(item.line - 1, 0), new vscode.Position(item.line - 1, 65535))
            const diag = new vscode.Diagnostic(range, item.text, diagnostic_severity[item.type])
            diag.source = 'LaTeX'
            if (diagsCollection[item.file] === undefined) {
                diagsCollection[item.file] = []
            }
            diagsCollection[item.file].push(diag)
        }
        if (createBuildLogRaw) {
            if (this.buildLogFile) {
                fs.unlink(this.buildLogFile.name)
                this.extension.logger.addLogMessage(`Temp file removed: ${this.buildLogFile.name}`)
            }
            this.buildLogFile = tmp.fileSync()
            fs.writeFileSync(this.buildLogFile.fd, this.buildLogRaw)
        }
        if (this.buildLogFile)
            this.compilerDiagnostics.set(vscode.Uri.file(this.buildLogFile.name),
                [new vscode.Diagnostic(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)), 
                                        'Click here to open log file', diagnostic_severity['typesetting'])])
        for (let file in diagsCollection)
            this.compilerDiagnostics.set(vscode.Uri.file(file), diagsCollection[file])
    }

    showLinterDiagnostics(linterLog: LinterLogEntry[]) {
        const diagsCollection: {[key:string]:vscode.Diagnostic[]} = {}
        for (const item of linterLog) {
            const range = new vscode.Range(new vscode.Position(item.line - 1, item.position - 1), 
                                           new vscode.Position(item.line - 1, item.position - 1 + item.length))
            const diag = new vscode.Diagnostic(range, item.text, diagnostic_severity[item.type])
            diag.code = item.code
            diag.source = 'ChkTeX'
            if (diagsCollection[item.file] === undefined) {
                diagsCollection[item.file] = []
            }
            diagsCollection[item.file].push(diag)
        }
        for (const file in diagsCollection) {
            this.linterDiagnostics.set(vscode.Uri.file(file), diagsCollection[file])
        }
    }
}