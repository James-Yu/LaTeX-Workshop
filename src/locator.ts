import * as vscode from 'vscode'
import * as path from 'path'
import * as cp from 'child_process'

import {Extension} from './main'

export interface SyncTeXRecord {
    input: string
    line: number
    column: number
}

export class Locator {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    parseSyncTeX(result: string) {
        const record: {[key: string]: string | number} = {}
        let started = false
        for (const line of result.split('\n')) {
            if (line.indexOf('SyncTeX result begin') > -1) {
                started = true
                continue
            }
            if (line.indexOf('SyncTeX result end') > -1) {
                break
            }
            if (!started) {
                continue
            }
            const pos = line.indexOf(':')
            if (pos < 0) {
                continue
            }
            const key = line.substr(0, pos).toLowerCase()
            if (key in record) {
                continue
            }
            let value: string | number = line.substr(pos + 1)
            if (value ===  'column' || value === 'line') {
                value = parseInt(value)
            }
            record[key] = value
        }
        return record
    }

    syncTeX() {
        if (!vscode.window.activeTextEditor) {
            return
        }
        const filePath = vscode.window.activeTextEditor.document.uri.fsPath
        if (!this.extension.manager.isTex(filePath)) {
            this.extension.logger.addLogMessage(`${filePath} is not a valid LaTeX file.`)
            return
        }
        const position = vscode.window.activeTextEditor.selection.active
        if (!position) {
            this.extension.logger.addLogMessage(`Cannot get cursor position: ${position}`)
            return
        }
        const pdfFile = this.extension.manager.tex2pdf(this.extension.manager.rootFile)
        const cmd = `synctex view -i "${position.line + 1}:${position.character + 1}:${filePath}" -o "${pdfFile}"`
        this.extension.logger.addLogMessage(`Executing ${cmd}`)
        cp.exec(cmd, {cwd: path.dirname(pdfFile)}, (err, stdout, stderr) => {
            if (err) {
                this.extension.logger.addLogMessage(`Cannot synctex: ${err}, ${stderr}`)
            } else {
                this.extension.viewer.syncTeX(pdfFile, this.parseSyncTeX(stdout))
            }
        })
    }

    locate(data: any, pdfPath: string) {
        const cmd = `synctex edit -o "${data.page}:${data.pos[0]}:${data.pos[1]}:${pdfPath}"`
        this.extension.logger.addLogMessage(`Executing ${cmd}`)
        cp.exec(cmd, {cwd: path.dirname(pdfPath)}, (err, stdout, stderr) => {
            if (err) {
                this.extension.logger.addLogMessage(`Cannot reverse synctex: ${err}, ${stderr}`)
                return
            }
            const record = this.parseSyncTeX(stdout)
            if (record === undefined) {
                this.extension.logger.addLogMessage(`Reverse synctex returned null file: ${record}`)
                return
            }
            const row = record.line as number - 1
            const col = record.column < 0 ? 0 : record.column as number
            const pos = new vscode.Position(row, col)
            const filePath = path.resolve((record.input as string).replace(/(\r\n|\n|\r)/gm, ''))

            this.extension.logger.addLogMessage(`SyncTeX to file ${filePath}`)
            vscode.workspace.openTextDocument(filePath).then((doc) => {
                vscode.window.showTextDocument(doc).then((editor) => {
                    editor.selection = new vscode.Selection(pos, pos)
                    vscode.commands.executeCommand("revealLine", {lineNumber: row, at: 'center'})
                })
            })
        })
    }
}
