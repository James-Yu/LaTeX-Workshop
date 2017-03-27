'use strict'

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as cp from 'child_process'

import {Extension} from './main'

export class Linter {
    extension: Extension
    currentProcess: cp.ChildProcess

    constructor(extension: Extension) {
        this.extension = extension
    }

    lint() {
        if (!vscode.window.activeTextEditor || !vscode.window.activeTextEditor.document.getText())
            return
        let rootFile = this.extension.manager.findRoot(false)
        if (!(vscode.window.activeTextEditor.document.fileName === rootFile))
            return
        if (this.currentProcess)
            this.currentProcess.kill()
        this.extension.logger.addLogMessage(`Linter start.`)
        let content = vscode.window.activeTextEditor.document.getText()
        let tmpFile = path.join(path.dirname(rootFile), `.chktex.${path.basename(rootFile)}`)
        fs.writeFile(tmpFile, content, err => {
            if (err) {
                this.extension.logger.addLogMessage(`Unable to write file ${tmpFile}`)
                return;
            }
            let configuration = vscode.workspace.getConfiguration('latex-workshop')
            let command = (configuration.get('linter_command') as string).replace('%DOC%', `"${tmpFile}"`)
            this.extension.logger.addLogMessage(`Linting with command ${command}`)
            this.currentProcess = this.processWrapper(command, {cwd: path.dirname(rootFile)}, (error, stdout, stderr) => {
                if (!error) {
                    this.extension.parser.parseLinter(stdout.split(tmpFile).join(rootFile))
                    this.extension.logger.addLogMessage(`Linter finished.`)
                    return
                }
                this.extension.logger.addLogMessage(`Linter failed with error ${error.message}.`)
            })
        })
    }

    processWrapper(command: string, options: any, callback: (error: Error, stdout: string, stderr: string) => void) : cp.ChildProcess {
        options.maxBuffer = Infinity
        return cp.exec(command, options, callback)
    }
}