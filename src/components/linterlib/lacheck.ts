import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as lw from '../../lw'
import type { ILinter } from '../linter'
import { LinterUtils } from './linterutils'
import { convertFilenameEncoding } from '../../utils/convertfilename'
import { getLogger } from '../logger'

const logger = getLogger('Linter', 'LaCheck')

export class LaCheck implements ILinter {
    readonly linterName = 'LaCheck'
    readonly linterDiagnostics: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection(this.linterName)

    getName() {
        return this.linterName
    }

    async lintRootFile(rootPath: string) {
        const stdout = await this.lacheckWrapper('root', vscode.Uri.file(rootPath), rootPath, undefined)
        if (stdout === undefined) { // It's possible to have empty string as output
            return
        }

        this.parseLog(stdout)
    }

    async lintFile(document: vscode.TextDocument) {
        const filePath = document.fileName
        const content = document.getText()

        const stdout = await this.lacheckWrapper('active', document, filePath, content)
        if (stdout === undefined) { // It's possible to have empty string as output
            return
        }

        this.parseLog(stdout, document.fileName)
    }

    private async lacheckWrapper(linterid: string, configScope: vscode.ConfigurationScope, filePath: string, content?: string): Promise<string | undefined> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', configScope)
        const command = configuration.get('linting.lacheck.exec.path') as string

        let stdout: string
        try {
            stdout = await LinterUtils.processWrapper(linterid, command, [filePath], {cwd: path.dirname(filePath)}, content)
        } catch (err: any) {
            if ('stdout' in err) {
                stdout = err.stdout as string
            } else {
                return undefined
            }
        }

        return stdout
    }

    parseLog(log: string, filePath?: string) {
        const linterLog: LaCheckLogEntry[] = []
        const lines = log.split('\n')
        const baseDir = path.dirname(filePath || lw.manager.rootFile || '.')
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
        logger.log(`Logged ${linterLog.length} messages.`)
        this.linterDiagnostics.clear()
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
                this.linterDiagnostics.set(vscode.Uri.file(file1), diagsCollection[file])
            }
        }
    }
}

interface LaCheckLogEntry {
    file: string,
    line: number,
    text: string
}
