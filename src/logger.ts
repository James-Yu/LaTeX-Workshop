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
        if (configuration.get('debug.showLog')) {
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

    showLog() {
        const uri = vscode.Uri.file(this.extension.manager.rootFile).with({scheme: 'latex-workshop-log'})
        let column = vscode.ViewColumn.Two
        if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.viewColumn === vscode.ViewColumn.Two) {
            column = vscode.ViewColumn.Three
        }
        vscode.commands.executeCommand("vscode.previewHtml", uri, column, 'Raw LaTeX Log')
        this.extension.logger.addLogMessage(`Open Log tab`)
    }
}

export class LogProvider implements vscode.TextDocumentContentProvider {
    extension: Extension
    change = new vscode.EventEmitter<vscode.Uri>()

    constructor(extension: Extension) {
        this.extension = extension
    }

    public update(uri: vscode.Uri) {
        this.change.fire(uri)
    }

    get onDidChange() : vscode.Event<vscode.Uri> {
        return this.change.event
    }

    public provideTextDocumentContent(_uri: vscode.Uri) : string {
        const dom = this.extension.parser.buildLogRaw.split('\n').map(log => `<span>${log.replace(/&/g, "&amp;")
                                                                                         .replace(/</g, "&lt;")
                                                                                         .replace(/>/g, "&gt;")
                                                                                         .replace(/"/g, "&quot;")
                                                                                         .replace(/'/g, "&#039;")}</span><br>`)
        return `
            <!DOCTYPE html style="position:absolute; left: 0; top: 0; width: 100%; height: 100%;"><html><head></head>
            <body style="position:absolute; left: 0; top: 0; width: 100%; height: 100%; white-space: pre;">${dom.join('')}</body></html>
        `
    }
}
