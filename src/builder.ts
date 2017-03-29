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
        if (this.currentProcess)
            this.currentProcess.kill()
        let toolchain = this.createToolchain(rootFile)
        this.extension.logger.addLogMessage(`Created toolchain ${toolchain}`)
        this.buildStep(rootFile, toolchain, 0)
    }

    buildStep(rootFile: string, toolchain: string[], index: number) {
        if (toolchain.length === index) {
            this.extension.logger.addLogMessage(`Toolchain of length ${toolchain.length} finished.`)
            this.buildFinished(rootFile)
            return
        }

        this.extension.logger.addLogMessage(`Toolchain step ${index + 1}: ${toolchain[index]}`)
        this.extension.logger.displayStatus('sync', 'orange', `LaTeX build toolchain step ${index + 1}.`, 0)
        this.currentProcess = this.processWrapper(toolchain[index], {cwd: path.dirname(rootFile)}, (error, stdout, stderr) => {
            this.extension.parser.parse(stdout)
            if (!error) {
                this.buildStep(rootFile, toolchain, index + 1)
                return
            }
            this.extension.logger.addLogMessage(`Toolchain returns with error.`)
            this.extension.logger.displayStatus('x', 'red', `LaTeX toolchain terminated with error.`)
        })
    }

    buildFinished(rootFile: string) {
        this.extension.logger.addLogMessage(`Successfully built ${rootFile}`)
        this.extension.logger.displayStatus('check', 'white', `LaTeX toolchain succeeded.`)
        this.extension.viewer.refreshExistingViewer(rootFile)
        let configuration = vscode.workspace.getConfiguration('latex-workshop')
        let clean = configuration.get('clean_after_build') as boolean
        if (clean) {
            this.extension.cleaner.clean()
        }
    }

    processWrapper(command: string, options: any, callback: (error: Error, stdout: string, stderr: string) => void) : cp.ChildProcess {
        options.maxBuffer = Infinity
        return cp.exec(command, options, callback)
    }

    createToolchain(rootFile: string) : string[] {
        let configuration = vscode.workspace.getConfiguration('latex-workshop')
        let commands = configuration.get('toolchain') as Array<string>
        return commands.map(command => command.replace('%DOC%', `"${rootFile}"`))
    }
}
