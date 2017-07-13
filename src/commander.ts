import * as vscode from 'vscode'
import * as opn from 'opn'

import {Extension} from './main'

export class Commander {
    extension: Extension
    commandTitles: string[]
    commands: string[]

    constructor(extension: Extension) {
        this.extension = extension
    }

    build() {
        this.extension.logger.addLogMessage(`BUILD command invoked.`)
        if (!vscode.window.activeTextEditor || !this.extension.manager.isTex(vscode.window.activeTextEditor.document.fileName)) {
            return
        }
        const rootFile = this.extension.manager.findRoot()
        if (rootFile !== undefined) {
            this.extension.logger.addLogMessage(`Building root file: ${rootFile}`)
            this.extension.builder.build(this.extension.manager.rootFile)
        } else {
            this.extension.logger.addLogMessage(`Cannot find LaTeX root file.`)
        }
    }

    view() {
        this.extension.logger.addLogMessage(`VIEW command invoked.`)
        if (!vscode.window.activeTextEditor || !this.extension.manager.isTex(vscode.window.activeTextEditor.document.fileName)) {
            return
        }
        const rootFile = this.extension.manager.findRoot()
        if (rootFile !== undefined) {
            this.extension.viewer.openViewer(rootFile)
        } else {
            this.extension.logger.addLogMessage(`Cannot find LaTeX root PDF to view.`)
        }
    }

    gotoSection(filePath: string, lineNumber: number) {
        this.extension.logger.addLogMessage(`GOTOSECTION command invoked. Target ${filePath}, line ${lineNumber}`)

        vscode.workspace.openTextDocument(filePath).then((doc) => {
            vscode.window.showTextDocument(doc).then((_) => {
                //editor.selection = new vscode.Selection(new vscode.Position(lineNumber,0), new vscode.Position(lineNumber,0))
                vscode.commands.executeCommand("revealLine", {lineNumber, at: 'center'})
            })
        })

    }

    tab() {
        this.extension.logger.addLogMessage(`TAB command invoked.`)
        if (!vscode.window.activeTextEditor || !this.extension.manager.isTex(vscode.window.activeTextEditor.document.fileName)) {
            return
        }
        const rootFile = this.extension.manager.findRoot()
        if (rootFile !== undefined) {
            this.extension.viewer.openTab(rootFile)
        } else {
            this.extension.logger.addLogMessage(`Cannot find LaTeX root PDF to view.`)
        }
    }

    synctex() {
        this.extension.logger.addLogMessage(`SYNCTEX command invoked.`)
        this.extension.manager.findRoot()
        if (!vscode.window.activeTextEditor || !this.extension.manager.isTex(vscode.window.activeTextEditor.document.fileName)) {
            return
        }
        this.extension.locator.syncTeX()
    }

    clean() {
        this.extension.logger.addLogMessage(`CLEAN command invoked.`)
        this.extension.manager.findRoot()
        this.extension.cleaner.clean()
    }

    citation() {
        this.extension.logger.addLogMessage(`CITATION command invoked.`)
        this.extension.completer.citation.browser()
    }

    log() {
        this.extension.logger.addLogMessage(`LOG command invoked.`)
        this.extension.logger.showLog()
    }

    actions() {
        this.extension.logger.addLogMessage(`ACTIONS command invoked.`)
        this.extension.logger.displayFullStatus()
        if (!this.commandTitles) {
            const commands = this.extension.packageInfo.contributes.commands.filter(command => {
                if (command.command === 'latex-workshop.actions') {
                    return false
                }
                return true
            })
            this.commandTitles = commands.map(command => command.title)
            this.commands = commands.map(command => command.command)
            this.commandTitles.push('Open LaTeX Workshop change log')
            this.commandTitles.push('Create an issue on Github')
            this.commandTitles.push('Star the project')
        }
        const items = JSON.parse(JSON.stringify(this.commandTitles))
        vscode.window.showQuickPick(items, {
            placeHolder: 'Please Select LaTeX Workshop Actions'
        }).then(selected => {
            if (!selected) {
                return
            }
            switch (selected) {
                case 'Open LaTeX Workshop change log':
                    opn('https://github.com/James-Yu/LaTeX-Workshop/blob/master/CHANGELOG.md')
                    break
                case 'Create an issue on Github':
                    opn('https://github.com/James-Yu/LaTeX-Workshop/issues/new')
                    break
                case 'Star the project':
                    opn('https://github.com/James-Yu/LaTeX-Workshop')
                    break
                default:
                    const command = this.commands[this.commandTitles.indexOf(selected)]
                    vscode.commands.executeCommand(command)
                    break
            }
        })
    }
}
