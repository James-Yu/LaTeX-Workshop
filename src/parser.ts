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

const diagnositic_severity = {
    'typesetting': vscode.DiagnosticSeverity.Hint,
    'warning': vscode.DiagnosticSeverity.Warning,
    'error': vscode.DiagnosticSeverity.Error,
}

export class Parser {
    extension: Extension
    isLaTeXmkSkipped: boolean
    diagnostics = vscode.languages.createDiagnosticCollection('LaTeX')

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
            this.diagnostics.clear()
            this.diagnostics.set(vscode.Uri.file(this.extension.manager.rootFile),
                [new vscode.Diagnostic(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)), 
                                       'LaTeXmk skipped building process', diagnositic_severity['typesetting'])])
            this.extension.logger.addLogMessage(`LaTeXmk skipped building process.`)
            return true
        }
        return false
    }

    parseLaTeX(log: string) {
        log = log.replace(/(.{78}(\w|\s|\d|\\|\/))(\r\n|\n)/g, '$1')
        let lines = log.replace(/(\r\n)|\r/g, '\n').split('\n')
        let items = []
        for (let line of lines) {
            let result = line.match(latexBox)
            if (result) {
                items.push({
                    type: 'typesetting',
                    text: result[1],
                    file: this.extension.manager.rootFile,
                    line: parseInt(result[2], 10)
                })
                continue
            }
            result = line.match(latexWarn)
            if (result) {
                items.push({
                    type: 'warning',
                    text: result[3],
                    file: this.extension.manager.rootFile,
                    line: parseInt(result[4])
                })
                continue
            }
            result = line.match(latexError)
            if (result) {
                items.push({
                    type: 'error',
                    text: (result[3] && result[3] !== 'LaTeX') ? `${result[3]}: ${result[4]}` : result[4],
                    file: result[1] ? path.resolve(path.dirname(this.extension.manager.rootFile), result[1]) : this.extension.manager.rootFile,
                    line: result[2] ? parseInt(result[2], 10) : undefined
                })
                continue
            }
        }
        this.diagnostics.clear()
        let diagsCollection: {[key:string]:vscode.Diagnostic[]} = {}
        for (let item of items) {
            const range = new vscode.Range(new vscode.Position(item.line - 1, 0), new vscode.Position(item.line - 1, 0))
            const diag = new vscode.Diagnostic(range, item.text, diagnositic_severity[item.type])
            if (diagsCollection[item.file] === undefined) {
                diagsCollection[item.file] = []
            }
            diagsCollection[item.file].push(diag)
        }
        let logFile = tmp.fileSync()
        fs.writeFileSync(logFile.fd, log)
        this.diagnostics.set(vscode.Uri.file(logFile.name),
            [new vscode.Diagnostic(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)), 
                                    'Click here to open log file', diagnositic_severity['typesetting'])])
        for (let file in diagsCollection)
            this.diagnostics.set(vscode.Uri.file(file), diagsCollection[file])
        this.extension.logger.addLogMessage(`LaTeX log parsed with ${items.length} messages.`)
    }
}