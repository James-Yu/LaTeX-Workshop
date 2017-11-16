import * as vscode from 'vscode'
import * as path from 'path'
import { ChildProcess, spawn, SpawnOptions } from 'child_process'
import { EOL } from 'os'

import { Extension } from '../main'

export class Linter {
    extension: Extension
    linterTimeout: NodeJS.Timer
    currentProcesses: {[linterId: string]: ChildProcess} = {}

    constructor(extension: Extension) {
        this.extension = extension
    }

    async lintActiveFile() {
        if (!vscode.window.activeTextEditor || !vscode.window.activeTextEditor.document.getText()) {
            return
        }
        this.extension.logger.addLogMessage(`Linter for active file started.`)
        const filePath = vscode.window.activeTextEditor.document.fileName
        const content = vscode.window.activeTextEditor.document.getText()

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const command = configuration.get('chktex.path') as string
        const args = configuration.get('chktex.args.active') as string[]
        const requiredArgs = ['-I0', '-f%f:%l:%c:%d:%k:%n:%m\n']

        let stdout: string
        try {
            stdout = await this.processWrapper('active file', command, args.concat(requiredArgs).filter(arg => arg !== ''), {}, content)
        } catch (err) {
            if ('stdout' in err) {
                stdout = err.stdout
            } else {
                return
            }
        }
        // provide the original path to the active file as the second argument, so
        // we report this second path in the diagnostics instead of the temporary one.
        this.extension.parser.parseLinter(stdout, filePath)
    }

    async lintRootFile() {
        this.extension.logger.addLogMessage(`Linter for root file started.`)
        const filePath = this.extension.manager.rootFile

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const command = configuration.get('chktex.path') as string
        const args = configuration.get('chktex.args.root') as string[]
        const requiredArgs = ['-f%f:%l:%c:%d:%k:%n:%m\n', '%DOC%'.replace('%DOC%', filePath)]

        let stdout: string
        try {
            stdout = await this.processWrapper('root file', command, args.concat(requiredArgs).filter(arg => arg !== ''), {cwd: path.dirname(this.extension.manager.rootFile)})
        } catch (err) {
            if ('stdout' in err) {
                stdout = err.stdout
            } else {
                return
            }
        }
        this.extension.parser.parseLinter(stdout)
    }

    processWrapper(linterId: string, command: string, args: string[], options: SpawnOptions, stdin?: string) : Promise<string> {
        this.extension.logger.addLogMessage(`Linter for ${linterId} running command ${command} with arguments ${args}`)
        return new Promise((resolve, reject) => {
            if (this.currentProcesses[linterId]) {
                this.currentProcesses[linterId].kill()
            }
            const startTime = process.hrtime()
            this.currentProcesses[linterId] = spawn(command, args, options)
            const proc = this.currentProcesses[linterId]
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
                this.extension.logger.addLogMessage(`Linter for ${linterId} failed to spawn command, encountering error: ${err.message}`)
                return reject(err)
            })

            proc.on('exit', exitCode => {
                if (exitCode !== 0) {
                    this.extension.logger.addLogMessage(`Linter for ${linterId} failed with exit code ${exitCode} and error:\n  ${stderr}`)
                    return reject({ exitCode, stdout, stderr})
                } else {
                    const [s, ms] = process.hrtime(startTime)
                    this.extension.logger.addLogMessage(`Linter for ${linterId} successfully finished in ${s}s ${Math.round(ms / 1000000)}ms`)
                    return resolve(stdout)
                }
            })

            if (stdin !== undefined) {
                proc.stdin.write(stdin)
                if (!stdin.endsWith(EOL)) {
                    // Always ensure we end with EOL otherwise ChkTeX will report line numbers as off by 1.
                    proc.stdin.write(EOL)
                }
                proc.stdin.end()
            }
        })
    }

}
