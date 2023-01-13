import * as vscode from 'vscode'
import * as fs from 'fs'
import * as lw from '../../lw'
import { convertFilenameEncoding } from '../../utils/convertfilename'
import { BibLogParser } from './biblogparser'
import { LatexLogParser } from './latexlog'

// Notice that 'Output written on filename.pdf' isn't output in draft mode.
// https://github.com/James-Yu/LaTeX-Workshop/issues/2893#issuecomment-936312853
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

export interface LogEntry { type: string, file: string, text: string, line: number, errorPosText?: string }

export class CompilerLogParser {
    private static readonly bibDiagnostics = vscode.languages.createDiagnosticCollection('BibTeX')
    private static readonly texDiagnostics = vscode.languages.createDiagnosticCollection('LaTeX')

    static isLaTeXmkSkipped: boolean = false

    static parse(log: string, rootFile?: string) {
        CompilerLogParser.isLaTeXmkSkipped = false
        // Canonicalize line-endings
        log = log.replace(/(\r\n)|\r/g, '\n')

        if (log.match(bibtexPattern)) {
            let logs
            if (log.match(latexmkPattern)) {
                logs = BibLogParser.parse(CompilerLogParser.trimLaTeXmkBibTeX(log), rootFile)
            } else {
                logs = BibLogParser.parse(log, rootFile)
            }
            CompilerLogParser.showCompilerDiagnostics(CompilerLogParser.bibDiagnostics, logs, 'BibTeX')
        }
        if (log.match(latexmkPattern)) {
            log = CompilerLogParser.trimLaTeXmk(log)
        } else if (log.match(texifyPattern)) {
            log = CompilerLogParser.trimTexify(log)
        }
        if (log.match(latexPattern) || log.match(latexFatalPattern)) {
            const logs = LatexLogParser.parse(log, rootFile)
            CompilerLogParser.showCompilerDiagnostics(CompilerLogParser.texDiagnostics, logs, 'LaTeX')
        } else if (CompilerLogParser.latexmkSkipped(log)) {
            CompilerLogParser.isLaTeXmkSkipped = true
        }
    }

    private static trimLaTeXmk(log: string): string {
        return CompilerLogParser.trimPattern(log, latexmkLogLatex, latexmkLog)
    }

    private static trimLaTeXmkBibTeX(log: string): string {
        return CompilerLogParser.trimPattern(log, bibtexPattern, latexmkLogLatex)
    }

    private static trimTexify(log: string): string {
        return CompilerLogParser.trimPattern(log, texifyLogLatex, texifyLog)
    }


    /**
     * Return the lines between the last occurrences of `beginPattern` and `endPattern`.
     * If `endPattern` is not found, the lines from the last occurrence of
     * `beginPattern` up to the end is returned.
     */
    private static trimPattern(log: string, beginPattern: RegExp, endPattern: RegExp): string {
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


    private static latexmkSkipped(log: string): boolean {
        if (log.match(latexmkUpToDate) && !log.match(latexmkPattern)) {
            CompilerLogParser.showCompilerDiagnostics(CompilerLogParser.texDiagnostics, LatexLogParser.buildLog, 'LaTeX')
            CompilerLogParser.showCompilerDiagnostics(CompilerLogParser.bibDiagnostics, BibLogParser.buildLog, 'BibTeX')
            return true
        }
        return false
    }

    private static getErrorPosition(item: LogEntry): {start: number, end: number} | undefined {
        if (!item.errorPosText) {
            return
        }
        const content = lw.cacher.get(item.file)?.content
        if (!content) {
            return
        }
        // Try to find the errorPosText in the respective line of the document
        const lines = content.split('\n')
        if (lines.length >= item.line) {
            const line = lines[item.line-1]
            let pos = line.indexOf(item.errorPosText)
            if (pos >= 0) {
                pos += item.errorPosText.length
                // Find the length of the last word in the error.
                // This is the length of the error-range
                const len = item.errorPosText.length - item.errorPosText.lastIndexOf(' ') - 1
                if (len > 0) {
                    return {start: pos - len, end: pos}
                }
            }
        }
       return
    }

    static showCompilerDiagnostics(compilerDiagnostics: vscode.DiagnosticCollection, buildLog: LogEntry[], source: string) {
        compilerDiagnostics.clear()
        const diagsCollection = Object.create(null) as { [key: string]: vscode.Diagnostic[] }
        for (const item of buildLog) {
            let startChar = 0
            let endChar = 65535
            // Try to compute a more precise position
            const preciseErrorPos = CompilerLogParser.getErrorPosition(item)
            if (preciseErrorPos) {
                startChar = preciseErrorPos.start
                endChar = preciseErrorPos.end
            }

            const range = new vscode.Range(new vscode.Position(item.line - 1, startChar), new vscode.Position(item.line - 1, endChar))
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
