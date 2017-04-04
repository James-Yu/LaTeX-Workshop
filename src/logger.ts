import * as vscode from 'vscode'

import {Extension} from './main'

export class Logger {
    extension: Extension
    logPanel: vscode.OutputChannel
    status: vscode.StatusBarItem
    statusTimeout: NodeJS.Timer

    constructor(extension: Extension) {
        this.extension = extension
        this.logPanel = vscode.window.createOutputChannel('LaTeX Workshop')
        this.addLogMessage('Initializing LaTeX Workshop.')
        this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10000)
        this.status.command = 'latex-workshop.actions'
        this.status.show()
        this.displayStatus('repo', 'white', 'LaTeX Workshop')
    }

    addLogMessage(message: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('show_debug_log')) {
            this.logPanel.append(`[${new Date().toLocaleTimeString('en-US', {hour12: false})}] ${message}\n`)
        }
    }

    displayStatus(icon: string, color: string, message: string, timeout: number = 5000) {
        if (this.statusTimeout) {
            clearTimeout(this.statusTimeout)
        }
        this.status.text = `$(${icon}) ${message}`
        this.status.tooltip = message
        this.status.color = color
        if (timeout > 0) {
            this.statusTimeout = setTimeout(() => this.status.text = `$(${icon})`, timeout)
        }
    }

    displayFullStatus(timeout: number = 5000) {
        if (this.statusTimeout) {
            clearTimeout(this.statusTimeout)
        }
        const icon = this.status.text.split(' ')[0]
        const message = this.status.tooltip
        this.status.text = `${icon} Previous message: ${message}`
        if (timeout > 0) {
            this.statusTimeout = setTimeout(() => this.status.text = `${icon}`, timeout)
        }
    }
}
