import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as cp from 'child_process'

import {Extension} from '../main'

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

    syncTeX(line: number | undefined = undefined, forced_viewer: string = 'auto') {
        let character = 0
        if (!vscode.window.activeTextEditor) {
            return
        }
        const filePath = vscode.window.activeTextEditor.document.uri.fsPath
        if (!this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            this.extension.logger.addLogMessage(`${filePath} is not a valid LaTeX file.`)
            return
        }
        if (!line) {
            const position = vscode.window.activeTextEditor.selection.active
            if (!position) {
                this.extension.logger.addLogMessage(`Cannot get cursor position: ${position}`)
                return
            }
            line = position.line + 1
            character = position.character
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const pdfFile = this.extension.manager.tex2pdf(this.extension.manager.rootFile)
        if (vscode.window.activeTextEditor.document.lineCount === line &&
            vscode.window.activeTextEditor.document.lineAt(line - 1).text === '') {
                line -= 1
        }
        if (forced_viewer === 'external' || (forced_viewer === 'auto' && configuration.get('view.pdf.viewer') === 'external') ) {
            this.syncTeXExternal(line, pdfFile, this.extension.manager.rootFile)
            return
        }

        const docker = configuration.get('docker.enabled')
        const args = ['view', '-i', `${line}:${character + 1}:${docker ? path.basename(filePath) : filePath}`, '-o', docker ? path.basename(pdfFile) : pdfFile]
        this.extension.logger.addLogMessage(`Executing synctex with args ${args}`)

        let command = configuration.get('synctex.path') as string
        if (docker) {
            if (process.platform === 'win32') {
                command = path.join(this.extension.extensionRoot, 'scripts/synctex.bat')
            } else {
                command = path.join(this.extension.extensionRoot, 'scripts/synctex')
                fs.chmodSync(command, 0o755)
            }
        }
        const proc = cp.spawn(command, args, {cwd: path.dirname(pdfFile)})
        proc.stdout.setEncoding('utf8')
        proc.stderr.setEncoding('utf8')

        let stdout = ''
        proc.stdout.on('data', newStdout => {
            stdout += newStdout
        })

        let stderr = ''
        proc.stderr.on('data', newStderr => {
            stderr += newStderr
        })

        proc.on('error', err => {
            this.extension.logger.addLogMessage(`Cannot synctex: ${err.message}, ${stderr}`)
        })

        proc.on('exit', exitCode => {
            if (exitCode !== 0) {
                this.extension.logger.addLogMessage(`Cannot synctex, code: ${exitCode}, ${stderr}`)
            } else {
                this.extension.viewer.syncTeX(pdfFile, this.parseSyncTeX(stdout))
            }
        })
    }

    syncTeXOnRef(line: number) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const viewer = configuration.get('view.pdf.ref.viewer') as string
        line += 1
        if (viewer) {
            this.syncTeX(line, viewer)
        } else {
            this.syncTeX(line)
        }
    }

    locate(data: any, pdfPath: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')

        const docker = configuration.get('docker.enabled')
        const args = ['edit', '-o', `${data.page}:${data.pos[0]}:${data.pos[1]}:${docker ? path.basename(pdfPath) : pdfPath}`]
        this.extension.logger.addLogMessage(`Executing synctex with args ${args}`)

        let command = configuration.get('synctex.path') as string
        if (docker) {
            if (process.platform === 'win32') {
                command = path.join(this.extension.extensionRoot, 'scripts/synctex.bat')
            } else {
                command = path.join(this.extension.extensionRoot, 'scripts/synctex')
                fs.chmodSync(command, 0o755)
            }
        }
        const proc = cp.spawn(command, args, {cwd: path.dirname(pdfPath)})
        proc.stdout.setEncoding('utf8')
        proc.stderr.setEncoding('utf8')

        let stdout = ''
        proc.stdout.on('data', newStdout => {
            stdout += newStdout
        })

        let stderr = ''
        proc.stderr.on('data', newStderr => {
            stderr += newStderr
        })

        proc.on('error', err => {
            this.extension.logger.addLogMessage(`Cannot reverse synctex: ${err.message}, ${stderr}`)
        })

        proc.on('exit', exitCode => {
            if (exitCode !== 0) {
                this.extension.logger.addLogMessage(`Cannot reverse synctex, code: ${exitCode}, ${stderr}`)
            } else {
                const record = this.parseSyncTeX(stdout)
                if (record === undefined) {
                    this.extension.logger.addLogMessage(`Reverse synctex returned null file: ${record}`)
                    return
                }
                const row = record.line as number - 1
                const col = record.column < 0 ? 0 : record.column as number
                const pos = new vscode.Position(row, col)
                let filePath = path.resolve((record.input as string).replace(/(\r\n|\n|\r)/gm, ''))
                if (docker && process.platform === 'win32') {
                    filePath = path.join(path.dirname(pdfPath), (record.input as string).replace('/data/', ''))
                }

                this.extension.logger.addLogMessage(`SyncTeX to file ${filePath}`)
                vscode.workspace.openTextDocument(filePath).then((doc) => {
                    let viewColumn: vscode.ViewColumn | undefined = undefined
                    for (let index = 0; index < vscode.window.visibleTextEditors.length; index++) {
                        viewColumn = vscode.window.visibleTextEditors[index].viewColumn
                        if (viewColumn !== undefined) {
                            break
                        }
                    }
                    vscode.window.showTextDocument(doc, viewColumn).then((editor) => {
                        editor.selection = new vscode.Selection(pos, pos)
                        vscode.commands.executeCommand('revealLine', {lineNumber: row, at: 'center'})
                        const configuration = vscode.workspace.getConfiguration('latex-workshop')
                        const flag = configuration.get('synctex.pdfToTex.animation') as boolean
                        if (flag) {
                            this.animateToNotify(editor, pos)
                        }
                    })
                })
            }
        })
    }

    private animateToNotify(editor: vscode.TextEditor, position : vscode.Position) {
        const decoConfig = {
            borderWidth: '1px',
            borderStyle: 'solid',
            light: {
                borderColor: 'red'
            },
            dark: {
                borderColor: 'white'
            }
        }
        const line = editor.document.lineAt(position.line)
        const lineEnd = line.range.end.character
        const cur = position.character
        let begin = Math.max(cur - 6, 0)
        let end = Math.min(lineEnd, cur + 6)
        const range = new vscode.Range(position.line, begin, position.line, end)
        setTimeout(async () => {
            let prevDeco : vscode.TextEditorDecorationType | undefined = undefined
            for( let i = 0; i < 10; i++ ) {
                decoConfig.borderWidth = (10 - i) + 'px'
                const deco = vscode.window.createTextEditorDecorationType(decoConfig)
                if (prevDeco) {
                    prevDeco.dispose()
                }
                editor.setDecorations(deco, [range])
                prevDeco = deco
                await (new Promise(resolve => setTimeout(resolve, 100)))
            }
            if (prevDeco) {
                prevDeco.dispose()
            }
        }, 10);
    }

    syncTeXExternal(line: number, pdfFile: string, rootFile: string) {
        if (!vscode.window.activeTextEditor) {
            return
        }
        const texFile = vscode.window.activeTextEditor.document.uri.fsPath
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const command = JSON.parse(JSON.stringify(configuration.get('view.pdf.external.synctex'))) as ExternalCommand
        if (command.args) {
            command.args = command.args.map(arg => arg.replace('%DOC%', rootFile.replace(/\.tex$/, '').split(path.sep).join('/'))
                                                      .replace('%DOCFILE%', path.basename(rootFile, '.tex').split(path.sep).join('/'))
                                                      .replace('%PDF%', pdfFile)
                                                      .replace('%LINE%', line.toString())
                                                      .replace('%TEX%', texFile))
        }
        cp.spawn(command.command, command.args)
        this.extension.logger.addLogMessage(`Open external viewer for syncTeX from ${pdfFile}`)
    }
}

interface ExternalCommand {
    command: string,
    args?: string[]
}
