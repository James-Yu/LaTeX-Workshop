import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

import type { Extension } from '../../main'
import { Linter, LinterLogParser } from './linter'
import { convertFilenameEncoding } from '../../utils/convertfilename'

export class LaCheck extends Linter {
    logParser: LaCheckLogParser

    constructor(extension: Extension) {
        super(extension)
        this.logParser = new LaCheckLogParser(extension)
    }

    async lintRootFile() {
        this.extension.logger.addLogMessage('Linter for root file started.')
        if (this.extension.manager.rootFile === undefined) {
            this.extension.logger.addLogMessage('No root file found for linting.')
            return
        }

        const filePath = this.extension.manager.rootFile
        const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(filePath))
        const command = configuration.get('linting.lacheck.exec.path') as string

        let stdout: string
        try {
            stdout = await this.processWrapper('root file', command, [filePath], {cwd: path.dirname(this.extension.manager.rootFile)})
        } catch (err: any) {
            if ('stdout' in err) {
                stdout = err.stdout as string
            } else {
                return
            }
        }
        this.logParser.parse(stdout)
    }

    async lintFile(document: vscode.TextDocument) {
        this.extension.logger.addLogMessage('Linter for active file started.')
        const filePath = document.fileName
        const content = document.getText()

        const configuration = vscode.workspace.getConfiguration('latex-workshop', document)
        const command = configuration.get('linting.lacheck.exec.path') as string

        let stdout: string
        try {
            stdout = await this.processWrapper('active file', command, [filePath], {cwd: path.dirname(filePath)}, content)
        } catch (err: any) {
            if ('stdout' in err) {
                stdout = err.stdout as string
            } else {
                return
            }
        }
        this.logParser.parse(stdout, document.fileName)
    }
}

interface LaCheckLogEntry {
    file: string,
    line: number,
    text: string
}

class LaCheckLogParser extends LinterLogParser {
    private readonly linterName = 'LaCheck'

    constructor(extension: Extension) {
        super(extension)
    }

    parse(log: string, filePath?: string) {
        const linterLog: LaCheckLogEntry[] = []
        const lines = log.split('\n')
        const baseDir = path.dirname(filePath || this.extension.manager.rootFile || '.')
        for (let index = 0; index < lines.length; index++) {
            const logLine = lines[index]
            const re = /"(.*?)",\sline\s(\d+):\s(<-\s)?(.*)/g
            const match = re.exec(logLine)
            if (!match) {
                continue
            }
            if (match[3] === '<- ') {
                const nextLineRe = /.*line\s(\d+).*->\s(.*)/g
                const nextLineMatch = nextLineRe.exec(lines[index+1])
                if (nextLineMatch) {
                    linterLog.push({
                        file: path.resolve(baseDir, match[1]),
                        line: parseInt(match[2]),
                        text: `${match[4]} -> ${nextLineMatch[2]} at Line ${nextLineMatch[1]}`
                    })
                    index++
                } else {
                    linterLog.push({
                        file: path.resolve(baseDir, match[1]),
                        line: parseInt(match[2]),
                        text: match[4]
                    })
                }
            } else {
                linterLog.push({
                    file: path.resolve(baseDir, match[1]),
                    line: parseInt(match[2]),
                    text: match[4]
                })
            }
        }
        this.extension.logger.addLogMessage(`Linter log parsed with ${linterLog.length} messages.`)
        LinterLogParser.linterDiagnostics?.clear()
        LinterLogParser.linterDiagnostics = vscode.languages.createDiagnosticCollection(this.linterName)
        this.showLinterDiagnostics(linterLog)
    }

    private showLinterDiagnostics(linterLog: LaCheckLogEntry[]) {
        const diagsCollection = Object.create(null) as { [key: string]: vscode.Diagnostic[] }
        for (const item of linterLog) {
            const range = new vscode.Range(
                new vscode.Position(item.line - 1, 0),
                new vscode.Position(item.line - 1, 65535)
            )
            const diag = new vscode.Diagnostic(range, item.text, vscode.DiagnosticSeverity.Warning)
            diag.source = this.linterName
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
                // Only report LaCheck errors on TeX files. This is done to avoid
                // reporting errors in .sty files, which are irrelevant for most users.
                if (!fs.existsSync(file1) && convEnc) {
                    const f = convertFilenameEncoding(file1)
                    if (f !== undefined) {
                        file1 = f
                    }
                }
                LinterLogParser.linterDiagnostics.set(vscode.Uri.file(file1), diagsCollection[file])
            }
        }
    }
}
