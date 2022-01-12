import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as cp from 'child_process'

import type {Extension} from '../main'

export class Counter {
    private readonly extension: Extension
    private useDocker: boolean = false
    private disableCountAfterSave: boolean = false
    private autoRunEnabled: boolean = false
    private autoRunInterval: number = 0
    private commandArgs: string[] = []
    private commandPath: string = ''
    private texCountMessage: string = ''
    private wordCount: string = ''
    private status: vscode.StatusBarItem

    constructor(extension: Extension) {
        this.extension = extension
        // gotoLine status item has priority 100.5 and selectIndentation item has priority 100.4
        this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100.45)
        this.loadConfiguration()
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('latex-workshop.texcount') || e.affectsConfiguration('latex-workshop.docker.enabled')) {
                this.loadConfiguration()
                this.updateStatusVisibility()

            }
        })
        this.updateStatusVisibility()
        vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor | undefined) => {
            if (e && extension.manager.hasTexId(e.document.languageId)) {
                this.updateStatusVisibility()
            } else {
                this.status.hide()
            }
        })

    }

    private loadConfiguration() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        this.autoRunEnabled = (configuration.get('texcount.autorun') as string === 'onSave')
        this.autoRunInterval = configuration.get('texcount.interval') as number
        this.commandArgs = configuration.get('texcount.args') as string[]
        this.commandPath = configuration.get('texcount.path') as string
        this.useDocker = configuration.get('docker.enabled') as boolean
    }

    private updateStatusVisibility() {
        if (this.autoRunEnabled) {
            this.updateWordCount()
            this.status.show()
        } else {
            this.status.hide()
        }
    }

    private updateWordCount() {
        if (this.wordCount === '') {
            this.status.text = ''
            this.status.tooltip = ''
        } else {
            this.status.text = this.wordCount + ' words'
            this.status.tooltip = this.texCountMessage
        }
    }

    async countOnSaveIfEnabled(file: string) {
        if (!this.autoRunEnabled) {
            return
        }
        if (this.disableCountAfterSave) {
            this.extension.logger.addLogMessage('Auto texcount is temporarily disabled during a second.')
            return
        }
        this.extension.logger.addLogMessage(`Auto texcount started on saving file: ${file}`)
        this.disableCountAfterSave = true
        setTimeout(() => this.disableCountAfterSave = false, this.autoRunInterval)
        if (this.extension.manager.rootFile === undefined) {
            await this.extension.manager.findRoot()
        }
        if (this.extension.manager.rootFile === undefined) {
            this.extension.logger.addLogMessage('Cannot find root file')
            return
        }
        void this.runTeXCount(this.extension.manager.rootFile).then(() => {
            this.updateWordCount()
        })
    }


    count(file: string, merge: boolean = true) {
        void this.runTeXCount(file, merge).then( () => {
            void vscode.window.showInformationMessage(this.texCountMessage)
        })
    }

    runTeXCount(file: string, merge: boolean = true): Promise<boolean> {
        let command = this.commandPath
        if (this.useDocker) {
            this.extension.logger.addLogMessage('Use Docker to invoke the command.')
            if (process.platform === 'win32') {
                command = path.resolve(this.extension.extensionRoot, './scripts/texcount.bat')
            } else {
                command = path.resolve(this.extension.extensionRoot, './scripts/texcount')
                fs.chmodSync(command, 0o755)
            }
        }
        const args = Array.from(this.commandArgs)
        if (merge && !args.includes('-merge')) {
            args.push('-merge')
        }
        args.push(path.basename(file))
        this.extension.logger.logCommand('Count words using command', command, args)
        const proc = cp.spawn(command, args, {cwd: path.dirname(file)})
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
            this.extension.logger.addLogMessage(`Cannot count words: ${err.message}, ${stderr}`)
            void this.extension.logger.showErrorMessage('TeXCount failed. Please refer to LaTeX Workshop Output for details.')
        })

        return new Promise( resolve => {
            proc.on('exit', exitCode => {
                if (exitCode !== 0) {
                    this.extension.logger.addLogMessage(`Cannot count words, code: ${exitCode}, ${stderr}`)
                    void this.extension.logger.showErrorMessage('TeXCount failed. Please refer to LaTeX Workshop Output for details.')
                } else {
                    const words = /Words in text: ([0-9]*)/g.exec(stdout)
                    const floats = /Number of floats\/tables\/figures: ([0-9]*)/g.exec(stdout)
                    if (words) {
                        let floatMsg = ''
                        if (floats && parseInt(floats[1]) > 0) {
                            floatMsg = `and ${floats[1]} float${parseInt(floats[1]) > 1 ? 's' : ''} (tables, figures, etc.) `
                        }
                        this.wordCount = words[1]
                        this.texCountMessage = `There are ${words[1]} words ${floatMsg}in the ${merge ? 'LaTeX project' : 'opened LaTeX file'}.`
                        resolve(true)
                    }
                }
            })
        })
    }
}
