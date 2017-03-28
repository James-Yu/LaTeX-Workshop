'use strict'

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as cp from 'child_process'
import * as tmp from 'tmp'

import {Extension} from './main'

function writeFile(filename: string, data: any) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filename, data, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result)
            }
        })
    })
}

export class Linter {
    extension: Extension
    linterFile: string
    linterTimeout: NodeJS.Timer
    currentProcesses: {[linterId: string]: cp.ChildProcess} = {}

    constructor(extension: Extension) {
        this.extension = extension
    }

    async lintActiveFile() {
        if (!vscode.window.activeTextEditor || !vscode.window.activeTextEditor.document.getText()) {
            return
        }
        this.extension.logger.addLogMessage(`Linter for active file state started.`)
        const content = vscode.window.activeTextEditor.document.getText()
        const filePath = vscode.window.activeTextEditor.document.fileName
        const tmpFilePath = tmp.fileSync()
        try {
            await writeFile(tmpFilePath.name, content)
        } catch (err) {
            this.extension.logger.addLogMessage(`Unable to write file ${tmpFilePath}`)
            return
        }
        // provide the original path to the active file as the second argument.
        // this will mean: 
        //   1. we won't follow \input directives (lint this one file only)
        //   2. we will report this second path in the diagnostics instead of the temporary one.
        await this.lintFile(tmpFilePath.name, filePath)
        tmpFilePath.removeCallback()
        this.extension.logger.addLogMessage(`Temp file removed: ${tmpFilePath}`)
    }

    lintRootFile() {
        this.extension.logger.addLogMessage(`Linter for root file started.`)
        return this.lintFile(this.extension.manager.rootFile)
    }
    
    async lintFile(fileName: string, activeFileOriginalPath?: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        let command = (configuration.get('linter_command') as string).replace('%DOC%', `"${fileName}"`)
        let linterId = 'rootFile'
        if (activeFileOriginalPath) {
            command += ' -I0'  // Don't follow \input directives
            linterId = 'activeFile'
        }
        let stdout: string
        try {
            stdout = await this.lintCommand(linterId, command, fileName)
        } catch (err) {
            this.extension.logger.addLogMessage(`Linter failed with error ${err.message}.`)
        }
        this.extension.parser.parseLinter(stdout, activeFileOriginalPath)
    }

    async lintCommand(linterId: string, command: string, fileName: string) {
        this.extension.logger.addLogMessage(`Linter with ID '${linterId}' running with command ${command}`)
        const stdout = await this.processWrapper(linterId, command, {cwd: path.dirname(this.extension.manager.rootFile)})
        this.extension.logger.addLogMessage(`Linter with ID '${linterId}' successfully finished.`)
        return stdout
    }

    processWrapper(linterId: string, command: string, options: any) : Promise<string> {
        // linterId allows us to have two linters in flight simultaneously for separate jobs
        // (i.e. a full project lint and a current working file real-time lint)
        return new Promise((resolve, reject) => {
            if (this.currentProcesses[linterId]) {
                this.currentProcesses[linterId].kill()
            }
            this.currentProcesses[linterId] = cp.exec(command, {maxBuffer: Infinity, ...options}, (err, stdout, stderr) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(stdout)
                }
            })
        })
    }

}