import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import {ChildProcessWithoutNullStreams, spawn} from 'child_process'
import {EOL} from 'os'

import type {Extension} from '../main'

export class Linter {
    private readonly extension: Extension
    private linterTimeout?: NodeJS.Timer
    private readonly currentProcesses = Object.create(null) as { [linterId: string]: ChildProcessWithoutNullStreams }

    constructor(extension: Extension) {
        this.extension = extension
    }

    private get rcPath() {
        let rcPath: string
        // 0. root file folder
        const root = this.extension.manager.rootFile
        if (root) {
            rcPath = path.resolve(path.dirname(root), './.chktexrc')
        } else {
            return
        }
        if (fs.existsSync(rcPath)) {
            return rcPath
        }

        // 1. project root folder
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
        if (workspaceFolder) {
            rcPath = path.resolve(workspaceFolder.uri.fsPath, './.chktexrc')
        }
        if (fs.existsSync(rcPath)) {
            return rcPath
        }
        return undefined
    }

    private globalRcPath(): string | undefined {
        const rcPathArray: string[] = []
        if (os.platform() === 'win32') {
            if (process.env.CHKTEXRC) {
                rcPathArray.push(path.join(process.env.CHKTEXRC, 'chktexrc'))
            }
            if (process.env.CHKTEX_HOME) {
                rcPathArray.push(path.join(process.env.CHKTEX_HOME, 'chktexrc'))
            }
            if (process.env.EMTEXDIR) {
                rcPathArray.push(path.join(process.env.EMTEXDIR, 'data', 'chktexrc'))
            }
        } else {
            if (process.env.HOME) {
                rcPathArray.push(path.join(process.env.HOME, '.chktexrc'))
            }
            if (process.env.LOGDIR) {
                rcPathArray.push(path.join(process.env.LOGDIR, '.chktexrc'))
            }
            if (process.env.CHKTEXRC) {
                rcPathArray.push(path.join(process.env.CHKTEXRC, '.chktexrc'))
            }
        }
        for (const rcPath of rcPathArray) {
            if (fs.existsSync(rcPath)) {
                return rcPath
            }
        }
        return
    }

    lintRootFileIfEnabled() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('chktex.enabled') as boolean) {
            void this.lintRootFile()
        }
    }

    lintActiveFileIfEnabledAfterInterval() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if ((configuration.get('chktex.enabled') as boolean) &&
            (configuration.get('chktex.run') as string) === 'onType') {
            const interval = configuration.get('chktex.delay') as number
            if (this.linterTimeout) {
                clearTimeout(this.linterTimeout)
            }
            this.linterTimeout = setTimeout(() => this.lintActiveFile(), interval)
        }
    }

    private async lintActiveFile() {
        if (!vscode.window.activeTextEditor || !vscode.window.activeTextEditor.document.getText()) {
            return
        }
        this.extension.logger.addLogMessage('Linter for active file started.')
        const filePath = vscode.window.activeTextEditor.document.fileName
        const content = vscode.window.activeTextEditor.document.getText()

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const command = configuration.get('chktex.path') as string
        const args = [...(configuration.get('chktex.args.active') as string[])]
        if (!args.includes('-l')) {
            const rcPath = this.rcPath
            if (rcPath) {
                args.push('-l', rcPath)
            }
        }
        const requiredArgs = ['-I0', '-f%f:%l:%c:%d:%k:%n:%m\n']

        let stdout: string
        try {
            stdout = await this.processWrapper('active file', command, args.concat(requiredArgs).filter(arg => arg !== ''), {cwd: path.dirname(filePath)}, content)
        } catch (err: any) {
            if ('stdout' in err) {
                stdout = err.stdout as string
            } else {
                return
            }
        }
        // provide the original path to the active file as the second argument, so
        // we report this second path in the diagnostics instead of the temporary one.
        const tabSize = this.getChktexrcTabSize()
        this.extension.linterLogParser.parse(stdout, filePath, tabSize)
    }

    private async lintRootFile() {
        this.extension.logger.addLogMessage('Linter for root file started.')
        if (this.extension.manager.rootFile === undefined) {
            this.extension.logger.addLogMessage('No root file found for linting.')
            return
        }

        const filePath = this.extension.manager.rootFile
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const command = configuration.get('chktex.path') as string
        const args = [...(configuration.get('chktex.args.active') as string[])]
        if (!args.includes('-l')) {
            const rcPath = this.rcPath
            if (rcPath) {
                args.push('-l', rcPath)
            }
        }
        const requiredArgs = ['-f%f:%l:%c:%d:%k:%n:%m\n', filePath]

        let stdout: string
        try {
            stdout = await this.processWrapper('root file', command, args.concat(requiredArgs).filter(arg => arg !== ''), {cwd: path.dirname(this.extension.manager.rootFile)})
        } catch (err: any) {
            if ('stdout' in err) {
                stdout = err.stdout as string
            } else {
                return
            }
        }
        const tabSize = this.getChktexrcTabSize()
        this.extension.linterLogParser.parse(stdout, undefined, tabSize)
    }

    private getChktexrcTabSize(): number | undefined {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const args = configuration.get('chktex.args.active') as string[]
        let filePath: string | undefined
        if (args.includes('-l')) {
            const idx = args.indexOf('-l')
            if (idx >= 0) {
                const rcpath = args[idx+1]
                if (fs.existsSync(rcpath)) {
                    filePath = rcpath
                }
            }
        } else {
            if (this.rcPath) {
                filePath = this.rcPath
            } else {
                filePath = this.globalRcPath()
            }
        }
        if (!filePath) {
            this.extension.logger.addLogMessage('The .chktexrc file not found.')
            return
        }
        const rcFile = fs.readFileSync(filePath).toString()
        const reg = /^\s*TabSize\s*=\s*(\d+)\s*$/m
        const match = reg.exec(rcFile)
        if (match) {
            const ret = Number(match[1])
            this.extension.logger.addLogMessage(`TabSize and .chktexrc: ${ret}, ${filePath}`)
            return ret
        }
        this.extension.logger.addLogMessage(`TabSize not found in the .chktexrc file: ${filePath}`)
        return
    }

    private processWrapper(linterId: string, command: string, args: string[], options: {cwd: string}, stdin?: string): Promise<string> {
        this.extension.logger.logCommand(`Linter for ${linterId} command`, command, args)
        return new Promise((resolve, reject) => {
            if (this.currentProcesses[linterId]) {
                this.currentProcesses[linterId].kill()
            }
            const startTime = process.hrtime()
            this.currentProcesses[linterId] = spawn(command, args, options)
            const proc = this.currentProcesses[linterId]
            proc.stdout.setEncoding('binary')
            proc.stderr.setEncoding('binary')

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
                    let msg: string
                    if (stderr === '') {
                        msg = stderr
                    } else {
                        msg = '\n' + stderr
                    }
                    this.extension.logger.addLogMessage(`Linter for ${linterId} failed with exit code ${exitCode} and error:${msg}`)
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
