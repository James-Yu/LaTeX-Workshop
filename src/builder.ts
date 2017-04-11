import * as vscode from 'vscode'
import * as path from 'path'
import * as cp from 'child_process'

import {Extension} from './main'

export class Builder {
    extension: Extension
    currentProcess: cp.ChildProcess
    disableBuildAfterSave: boolean = false

    constructor(extension: Extension) {
        this.extension = extension
    }

    build(rootFile: string) {
        this.extension.logger.addLogMessage(`Build root file ${rootFile}`)
        this.disableBuildAfterSave = true
        vscode.workspace.saveAll()
        this.disableBuildAfterSave = false
        if (this.currentProcess) {
            this.currentProcess.kill()
        }
        const toolchain = this.createToolchain(rootFile)
        if (toolchain === undefined) {
            this.extension.logger.addLogMessage('Invalid toolchain.')
            return
        }
        this.buildStep(rootFile, toolchain, 0)
    }

    buildStep(rootFile: string, toolchain: ToolchainCommand[], index: number) {
        if (toolchain.length === index) {
            this.extension.logger.addLogMessage(`Toolchain of length ${toolchain.length} finished.`)
            this.buildFinished(rootFile)
            return
        }

        this.extension.logger.addLogMessage(`Toolchain step ${index + 1}: ${toolchain[index].command}, ${toolchain[index].args}`)
        this.extension.logger.displayStatus('sync', 'orange', `LaTeX build toolchain step ${index + 1}.`, 0)
        this.currentProcess = cp.spawn(toolchain[index].command, toolchain[index].args, {cwd: path.dirname(rootFile)})

        let stdout = ''
        this.currentProcess.stdout.on('data', newStdout => {
            stdout += newStdout
        })

        let stderr = ''
        this.currentProcess.stderr.on('data', newStderr => {
            stderr += newStderr
        })

        this.currentProcess.on('error', err => {
            this.extension.logger.addLogMessage(`LaTeX fatal error: ${err.message}, ${stderr}. Does the executable exist?`)
            this.extension.logger.displayStatus('x', 'red', `Toolchain terminated with fatal error.`)
        })

        this.currentProcess.on('exit', exitCode => {
            this.extension.parser.parse(stdout)
            const uri = vscode.Uri.file(this.extension.manager.rootFile).with({scheme: 'latex-workshop-log'})
            this.extension.logProvider.update(uri)
            if (exitCode !== 0) {
                this.extension.logger.addLogMessage(`Toolchain returns with error. ${stdout}`)
                this.extension.logger.displayStatus('x', 'red', `LaTeX toolchain terminated with error.`)
            } else {
                this.buildStep(rootFile, toolchain, index + 1)
            }
        })
    }

    buildFinished(rootFile: string) {
        this.extension.logger.addLogMessage(`Successfully built ${rootFile}`)
        this.extension.logger.displayStatus('check', 'white', `LaTeX toolchain succeeded.`)
        this.extension.viewer.refreshExistingViewer(rootFile)
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const clean = configuration.get('latex.clean.enabled') as boolean
        if (clean) {
            this.extension.cleaner.clean()
        }
    }

    createToolchain(rootFile: string) : ToolchainCommand[] | undefined  {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        // Modify a copy, instead of itself.
        const commands = JSON.parse(JSON.stringify(configuration.get('latex.toolchain'))) as ToolchainCommand[]
        for (const command of commands) {
            if (!('command' in command)){
                vscode.window.showErrorMessage('LaTeX toolchain is invalid. Each tool in the toolchain must have a "command" string.')
                return undefined
            }
            if (!Array.isArray(command.args)) {
                vscode.window.showErrorMessage('LaTeX toolchain is invalid. "args" must be an array of strings.')
                return undefined
            }
            if (command.args) {
                command.args = command.args.map(arg => arg.replace('%DOC%', rootFile.replace(/\.tex$/, ''))
                                                          .replace('%DOCFILE%', path.basename(rootFile, '.tex')))
            }
        }
        console.log(commands)
        return commands
    }
}

interface ToolchainCommand {
    command: string,
    args?: string[]
}
