import * as vscode from 'vscode'
import * as fs from 'fs'

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

    binaries() {
        function windowsPaths(command: string, disks: string[]=['C', 'D'], tlVers: string[]=['2014', '2015', '2016', '2017']) {
            const paths: string[] = []
            for (const disk of disks) {
                for (const tlVer of tlVers) {
                    paths.push(`${disk}:\\TexLive\\${tlVer}\\bin\\win32\\${command}.exe`)
                }
            }
            return paths
        }
        function linuxPaths(command: string) {
            return `/usr/local/texbin/${command}`
        }
        this.extension.logger.addLogMessage(`BINARIES command invoked.`)
        this.extension.manager.findBinary('synctex_command', windowsPaths('synctex').concat(linuxPaths('synctex')))
        this.extension.manager.findBinary('linter_command', windowsPaths('chktex').concat(linuxPaths('chktex')))
    }

    actions() {
        this.extension.logger.addLogMessage(`ACTIONS command invoked.`)
        this.extension.logger.displayFullStatus()
        if (!this.commandTitles) {
            const packageInfo = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/package.json`).toString())
            const commands = packageInfo.contributes.commands.filter(command => {
                if (command.command === 'latex-workshop.actions') {
                    return false
                }
                return true
            })
            this.commandTitles = commands.map(command => command.title)
            this.commands = commands.map(command => command.command)
        }
        const items = JSON.parse(JSON.stringify(this.commandTitles))
        if (this.extension.parser.buildLogRaw) {
            items.push('Show last LaTeX log')
        }
        vscode.window.showQuickPick(items, {
            placeHolder: 'Please Select LaTeX Workshop Actions'
        }).then(selected => {
            if (!selected) {
                return
            }
            const command = this.commands[this.commandTitles.indexOf(selected)]
            if (command) {
                vscode.commands.executeCommand(command)
                return
            }
            switch (selected) {
                case 'Show last LaTeX log':
                    this.extension.logger.showLog()
                    break
                default:
                    break
            }
        })
    }
}
