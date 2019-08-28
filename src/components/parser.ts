import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

import { Extension } from '../main'
import { convertFilenameEncoding } from '../utils'

const latexPattern = /^Output\swritten\son\s(.*)\s\(.*\)\.$/gm
const latexFatalPattern = /Fatal error occurred, no output PDF file produced!/gm
const latexError = /^(?:(.*):(\d+):|!)(?: (.+) Error:)? (.+?)$/
const latexBox = /^((?:Over|Under)full \\[vh]box \([^)]*\)) in paragraph at lines (\d+)--(\d+)$/
const latexBoxAlt = /^((?:Over|Under)full \\[vh]box \([^)]*\)) detected at line (\d+)$/
const latexWarn = /^((?:(?:Class|Package) \S*)|LaTeX) (Warning|Info|Font Warning):\s+(.*?)(?: on input line (\d+))?(\.|\?|)$/
const latexPackageWarningExtraLines = /^\((.*)\)\s+(.*?)(?: +on input line (\d+))?(\.)?$/
const bibEmpty = /^Empty `thebibliography' environment/
const biberWarn = /^Biber warning:.*WARN - I didn't find a database entry for '([^']+)'/

const latexmkPattern = /^Latexmk:\sapplying\srule/gm
const latexmkLog = /^Latexmk:\sapplying\srule/
const latexmkLogLatex = /^Latexmk:\sapplying\srule\s'(pdf|lua|xe)?latex'/
const latexmkUpToDate = /^Latexmk: All targets \(.*\) are up-to-date/

const texifyPattern = /^running\s(pdf|lua|xe)?latex/gm
const texifyLog = /^running\s((pdf|lua|xe)?latex|miktex-bibtex)/
const texifyLogLatex = /^running\s(pdf|lua|xe)?latex/

// const truncatedLine = /(.{77}[^\.](\w|\s|-|\\|\/))(\r\n|\n)/g
const messageLine = /^l\.\d+\s(.*)$/

const DIAGNOSTIC_SEVERITY: { [key: string]: vscode.DiagnosticSeverity } = {
    'typesetting': vscode.DiagnosticSeverity.Information,
    'warning': vscode.DiagnosticSeverity.Warning,
    'error': vscode.DiagnosticSeverity.Error,
}

interface LinterLogEntry {
    file: string,
    line: number,
    position: number,
    length: number,
    type: string,
    code: number,
    text: string
}

interface LogEntry { type: string, file: string, text: string, line: number }

export class Parser {
    extension: Extension
    isLaTeXmkSkipped: boolean = false
    buildLog: LogEntry[] = []
    buildLogRaw: string = ''
    compilerDiagnostics = vscode.languages.createDiagnosticCollection('LaTeX')
    linterDiagnostics = vscode.languages.createDiagnosticCollection('ChkTeX')

    constructor(extension: Extension) {
        this.extension = extension
    }

    parse(log: string, rootFile?: string) {
        this.isLaTeXmkSkipped = false
        // canonicalize line-endings
        log = log.replace(/(\r\n)|\r/g, '\n')

        if (log.match(latexmkPattern)) {
            log = this.trimLaTeXmk(log)
        } else if (log.match(texifyPattern)) {
            log = this.trimTexify(log)
        }
        if (log.match(latexPattern) || log.match(latexFatalPattern)) {
            this.parseLaTeX(log, rootFile)
        } else if (this.latexmkSkipped(log)) {
            this.isLaTeXmkSkipped = true
        }
    }

    trimLaTeXmk(log: string): string {
        const lines = log.split('\n')
        let startLine = -1
        let finalLine = -1
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index]
            let result = line.match(latexmkLogLatex)
            if (result) {
                startLine = index
            }
            result = line.match(latexmkLog)
            if (result) {
                finalLine = index
            }
        }
        if (finalLine <= startLine) {
            return lines.slice(startLine).join('\n')
        } else {
            return lines.slice(startLine, finalLine).join('\n')
        }
    }

    trimTexify(log: string): string {
        const lines = log.split('\n')
        let startLine = -1
        let finalLine = -1
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index]
            let result = line.match(texifyLogLatex)
            if (result) {
                startLine = index
            }
            result = line.match(texifyLog)
            if (result) {
                finalLine = index
            }
        }
        if (finalLine <= startLine) {
            return lines.slice(startLine).join('\n')
        } else {
            return lines.slice(startLine, finalLine).join('\n')
        }
    }

    latexmkSkipped(log: string): boolean {
        const lines = log.split('\n')
        if (lines[0].match(latexmkUpToDate)) {
            this.showCompilerDiagnostics()
            return true
        }
        return false
    }

    parseLaTeX(log: string, rootFile?: string) {
        if (rootFile === undefined) {
            rootFile = this.extension.manager.rootFile
        }
        if (rootFile === undefined) {
            this.extension.logger.addLogMessage('How can you reach this point?')
            return
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const excludeRegexp = (configuration.get('message.latexlog.exclude') as string[]).map(regexp => RegExp(regexp))

        this.buildLogRaw = log
        const lines = log.split('\n')
        this.buildLog = []

        let searchesEmptyLine = false
        let insideBoxWarn = false
        let insideError = false
        let currentResult: LogEntry = { type: '', file: '', text: '', line: 1 }
        const fileStack: string[] = [rootFile]
        let nested = 0
        for (const line of lines) {
            // Compose the current file
            const filename = path.resolve(path.dirname(rootFile), fileStack[fileStack.length - 1])
            // Skip the first line after a box warning, this is just garbage
            if (insideBoxWarn) {
                insideBoxWarn = false
                continue
            }
            // append the read line, since we have a corresponding result in the making
            if (searchesEmptyLine) {
                if (line.trim() === '' || (insideError && line.match(/^\s/))) {
                    currentResult.text = currentResult.text + '\n'
                    searchesEmptyLine = false
                    insideError = false
                } else {
                    const packageExtraLineResult = line.match(latexPackageWarningExtraLines)
                    if (packageExtraLineResult) {
                        currentResult.text += '\n(' + packageExtraLineResult[1] + ')\t' + packageExtraLineResult[2] + (packageExtraLineResult[4] ? '.' : '')
                        currentResult.line = parseInt(packageExtraLineResult[3], 10)
                    } else if (insideError) {
                        const subLine = line.replace(messageLine, '$1')
                        currentResult.text = currentResult.text + '\n' + subLine
                    } else {
                    currentResult.text = currentResult.text + '\n' + line
                    }
                }
                continue
            }
            let excluded = false
            for (const regexp of excludeRegexp) {
                if (line.match(regexp)) {
                    excluded = true
                    break
                }
            }
            if (excluded) {
                continue
            }
            let result = line.match(latexBox)
            if (!result) {
                result = line.match(latexBoxAlt)
            }
            if (result && configuration.get('message.badbox.show')) {
                if (currentResult.type !== '') {
                    this.buildLog.push(currentResult)
                }
                currentResult = {
                    type: 'typesetting',
                    file: filename,
                    line: parseInt(result[2], 10),
                    text: result[1]
                }
                searchesEmptyLine = false
                insideBoxWarn = true
                continue
            }
            result = line.match(latexWarn)
            if (result) {
                if (currentResult.type !== '') {
                    this.buildLog.push(currentResult)
                }
                currentResult = {
                    type: 'warning',
                    file: filename,
                    line: parseInt(result[4], 10),
                    text: result[3] + result[5]
                }
                searchesEmptyLine = true
                continue
            }
            result = line.match(biberWarn)
            if (result) {
                if (currentResult.type !== '') {
                    this.buildLog.push(currentResult)
                }
                currentResult = {
                    type: 'warning',
                    file: '',
                    line: 1,
                    text: `No bib entry found for '${result[1]}'`
                }
                searchesEmptyLine = false
                continue
            }

            result = line.match(latexError)
            if (result) {
                if (currentResult.type !== '') {
                    this.buildLog.push(currentResult)
                }
                currentResult = {
                    type: 'error',
                    text: (result[3] && result[3] !== 'LaTeX') ? `${result[3]}: ${result[4]}` : result[4],
                    file: result[1] ? path.resolve(path.dirname(rootFile), result[1]): filename,
                    line: result[2] ? parseInt(result[2], 10): 1
                }
                searchesEmptyLine = true
                insideError = true
                continue
            }
            nested = this.parseLaTeXFileStack(line, fileStack, nested)
            if (fileStack.length === 0) {
                fileStack.push(rootFile)
            }
        }
        // push final result
        if (currentResult.type !== '' && !currentResult.text.match(bibEmpty)) {
            this.buildLog.push(currentResult)
        }
        this.extension.logger.addLogMessage(`LaTeX log parsed with ${this.buildLog.length} messages.`)
        this.showCompilerDiagnostics()
    }

    parseLaTeXFileStack(line: string, fileStack: string[], nested: number): number {
        const result = line.match(/(\(|\))/)
        if (result && result.index !== undefined && result.index > -1) {
            line = line.substr(result.index + 1)
            if (result[1] === '(') {
                const pathResult = line.match(/^"?((?:(?:[a-zA-Z]:|\.|\/)?(?:\/|\\\\?))[^"()[\]]*)/)
                const mikTeXPathResult = line.match(/^"?([^"()[\]]*\.[a-z]{3,})/)
                if (pathResult) {
                    fileStack.push(pathResult[1].trim())
                } else if (mikTeXPathResult) {
                    fileStack.push(`./${mikTeXPathResult[1].trim()}`)
                } else {
                    nested += 1
                }
            } else {
                if (nested > 0) {
                    nested -= 1
                } else {
                    fileStack.pop()
                }
            }
            nested = this.parseLaTeXFileStack(line, fileStack, nested)
        }
        return nested
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

    showCompilerDiagnostics() {
        this.compilerDiagnostics.clear()
        const diagsCollection: { [key: string]: vscode.Diagnostic[] } = {}
        for (const item of this.buildLog) {
            const range = new vscode.Range(new vscode.Position(item.line - 1, 0), new vscode.Position(item.line - 1, 65535))
            const diag = new vscode.Diagnostic(range, item.text, DIAGNOSTIC_SEVERITY[item.type])
            diag.source = 'LaTeX'
            if (diagsCollection[item.file] === undefined) {
                diagsCollection[item.file] = []
            }
            diagsCollection[item.file].push(diag)
        }

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const convEnc = configuration.get('message.convertFilenameEncoding') as boolean
        for (const file in diagsCollection) {
            let file1 = file
            if (!fs.existsSync(file1) && convEnc) {
                const f = convertFilenameEncoding(file1)
                if (f !== undefined) {
                    file1 = f
                }
            }
            this.compilerDiagnostics.set(vscode.Uri.file(file1), diagsCollection[file])
        }
    }

    showLinterDiagnostics(linterLog: LinterLogEntry[]) {
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
            if (['.tex', '.bbx', '.cbx', '.dtx'].indexOf(path.extname(file)) > -1) {
                // only report ChkTeX errors on TeX files. This is done to avoid
                // reporting errors in .sty files which for most users is irrelevant.
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
