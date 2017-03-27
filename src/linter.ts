'use strict'

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as cp from 'child_process'

import {Extension} from './main'

export class Linter {
    extension: Extension
    linterFile: string
    linterTimeout: NodeJS.Timer
    currentProcess: cp.ChildProcess

    constructor(extension: Extension) {
        this.extension = extension
    }

    lint() {
        if (!vscode.window.activeTextEditor || !vscode.window.activeTextEditor.document.getText())
            return
        if (this.currentProcess)
            this.currentProcess.kill()
        this.extension.logger.addLogMessage(`Linter start.`)
        if (vscode.window.activeTextEditor.document.fileName === this.extension.manager.rootFile) {
            let configuration = vscode.workspace.getConfiguration('latex-workshop')
            let command = (configuration.get('linter_command') as string).replace('%DOC%', `"${this.extension.manager.rootFile}"`)
            this.lintCommand(command, this.extension.manager.rootFile)
        } else {
            let content = vscode.window.activeTextEditor.document.getText()
            let tmpFile = path.join(path.dirname(this.extension.manager.rootFile), `.chktex.${path.basename(this.extension.manager.rootFile)}`)
            fs.writeFile(tmpFile, content, err => {
                if (err) {
                    this.extension.logger.addLogMessage(`Unable to write file ${tmpFile}`)
                    return;
                }
                let configuration = vscode.workspace.getConfiguration('latex-workshop')
                let command = (configuration.get('linter_command') as string).replace('%DOC%', `"${tmpFile}"`)
                this.lintCommand(command, tmpFile)
            })
        }
    }

    lintCommand(command: string, fileName: string) {
        this.extension.logger.addLogMessage(`Linting with command ${command}`)
        this.currentProcess = this.processWrapper(command, {cwd: path.dirname(this.extension.manager.rootFile)}, (error, stdout, stderr) => {
            if (!error) {
                this.extension.parser.parseLinter(stdout.split(fileName).join(this.extension.manager.rootFile))
                this.extension.logger.addLogMessage(`Linter finished.`)
                return
            }
            this.extension.logger.addLogMessage(`Linter failed with error ${error.message}.`)
        })
    }

    processWrapper(command: string, options: any, callback: (error: Error, stdout: string, stderr: string) => void) : cp.ChildProcess {
        options.maxBuffer = Infinity
        return cp.exec(command, options, callback)
    }
}