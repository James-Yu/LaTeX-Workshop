import * as vscode from 'vscode'
import * as fs from 'fs'

import type { Extension } from '../../main'
import { convertFilenameEncoding } from '../../utils/utils'
import { LatexLogParser } from './latexlog'
import { BibLogParser } from './biblogparser'

const latexPattern = /^Output\swritten\son\s(.*)\s\(.*\)\.$/gm
const latexFatalPattern = /Fatal error occurred, no output PDF file produced!/gm

const latexmkPattern = /^Latexmk:\sapplying\srule/gm
const latexmkLog = /^Latexmk:\sapplying\srule/
const latexmkLogLatex = /^Latexmk:\sapplying\srule\s'(pdf|lua|xe)?latex'/
const latexmkUpToDate = /^Latexmk: All targets \(.*\) are up-to-date/m

const texifyPattern = /^running\s(pdf|lua|xe)?latex/gm
const texifyLog = /^running\s((pdf|lua|xe)?latex|miktex-bibtex)/
const texifyLogLatex = /^running\s(pdf|lua|xe)?latex/

const bibtexPattern = /^This is BibTeX, Version.*$/m

const DIAGNOSTIC_SEVERITY: { [key: string]: vscode.DiagnosticSeverity } = {
    'typesetting': vscode.DiagnosticSeverity.Information,
    'warning': vscode.DiagnosticSeverity.Warning,
    'error': vscode.DiagnosticSeverity.Error,
}

export interface LogEntry { type: string, file: string, text: string, line: number }

export class CompilerLogParser {
    private readonly latexLogParser: LatexLogParser
    private readonly bibLogParser: BibLogParser
    isLaTeXmkSkipped: boolean = false

    constructor(extension: Extension) {
        this.latexLogParser = new LatexLogParser(extension)
        this.bibLogParser = new BibLogParser(extension)
    }

    parse(log: string, rootFile?: string) {
        this.isLaTeXmkSkipped = false
        // Canonicalize line-endings
        log = log.replace(/(\r\n)|\r/g, '\n')

        if (log.match(bibtexPattern)) {
            if (log.match(latexmkPattern)) {
                this.bibLogParser.parse(this.trimLaTeXmkBibTeX(log), rootFile)
            } else {
                this.bibLogParser.parse(log, rootFile)
            }
        }
        if (log.match(latexmkPattern)) {
            log = this.trimLaTeXmk(log)
        } else if (log.match(texifyPattern)) {
            log = this.trimTexify(log)
        }
        if (log.match(latexPattern) || log.match(latexFatalPattern)) {
            this.latexLogParser.parse(log, rootFile)
        } else if (this.latexmkSkipped(log)) {
            this.isLaTeXmkSkipped = true
        }
    }

    private trimLaTeXmk(log: string): string {
        return this.trimPattern(log, latexmkLogLatex, latexmkLog)
    }

    private trimLaTeXmkBibTeX(log: string): string {
        return this.trimPattern(log, bibtexPattern, latexmkLogLatex)
    }

    private trimTexify(log: string): string {
        return this.trimPattern(log, texifyLogLatex, texifyLog)
    }


    /**
     * Return the lines between the last occurrences of `beginPattern` and `endPattern`.
     * If `endPattern` is not found, the lines from the last occurrence of
     * `beginPattern` up to the end is returned.
     */
    private trimPattern(log: string, beginPattern: RegExp, endPattern: RegExp): string {
        const lines = log.split('\n')
        let startLine = -1
        let finalLine = -1
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index]
            let result = line.match(beginPattern)
            if (result) {
                startLine = index
            }
            result = line.match(endPattern)
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


    private latexmkSkipped(log: string): boolean {
        if (log.match(latexmkUpToDate) && !log.match(latexmkPattern)) {
            this.showCompilerDiagnostics(this.latexLogParser.compilerDiagnostics, this.latexLogParser.buildLog, 'LaTeX')
            this.showCompilerDiagnostics(this.bibLogParser.compilerDiagnostics, this.bibLogParser.buildLog, 'BibTeX')
            return true
        }
        return false
    }

    showCompilerDiagnostics(compilerDiagnostics: vscode.DiagnosticCollection, buildLog: LogEntry[], source: string) {
        compilerDiagnostics.clear()
        const diagsCollection: { [key: string]: vscode.Diagnostic[] } = {}
        for (const item of buildLog) {
            const range = new vscode.Range(new vscode.Position(item.line - 1, 0), new vscode.Position(item.line - 1, 65535))
            const diag = new vscode.Diagnostic(range, item.text, DIAGNOSTIC_SEVERITY[item.type])
            diag.source = source
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
            compilerDiagnostics.set(vscode.Uri.file(file1), diagsCollection[file])
        }
    }
}
