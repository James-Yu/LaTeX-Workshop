import * as vscode from 'vscode'

export class Logger {
    private readonly logPanel: vscode.OutputChannel
    private readonly compilerLogPanel: vscode.OutputChannel
    readonly status: vscode.StatusBarItem

    constructor() {
        this.logPanel = vscode.window.createOutputChannel('LaTeX Workshop')
        this.compilerLogPanel = vscode.window.createOutputChannel('LaTeX Compiler')
        this.compilerLogPanel.append('Ready')
        this.addLogMessage('Initializing LaTeX Workshop.')
        this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10000)
        this.status.command = 'latex-workshop.actions'
        this.status.show()
        this.displayStatus('check', 'statusBar.foreground')
    }

    addLogMessage(message: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('message.log.show')) {
            this.logPanel.append(`[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${message}\n`)
        }
    }

    addCompilerMessage(message: string) {
        this.compilerLogPanel.append(message)
    }

    logError(e: Error) {
        this.addLogMessage(e.message)
        if (e.stack) {
            this.addLogMessage(e.stack)
        }
    }

    logOnRejected(e: unknown) {
        if (e instanceof Error) {
            this.logError(e)
        } else {
            this.addLogMessage(String(e))
        }
    }

    clearCompilerMessage() {
        this.compilerLogPanel.clear()
    }

    displayStatus(
        icon: string,
        color: string,
        message: string | undefined = undefined,
        severity: 'info' | 'warning' | 'error' = 'info',
        build: string = ''
    ) {
        this.status.text = `$(${icon})${build}`
        this.status.tooltip = message
        this.status.color = new vscode.ThemeColor(color)
        if (message === undefined) {
            return
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        switch (severity) {
            case 'info':
                if (configuration.get('message.information.show')) {
                    void vscode.window.showInformationMessage(message)
                }
                break
            case 'warning':
                if (configuration.get('message.warning.show')) {
                    void vscode.window.showWarningMessage(message)
                }
                break
            case 'error':
            default:
                if (configuration.get('message.error.show')) {
                    void vscode.window.showErrorMessage(message)
                }
                break
        }
    }

    showErrorMessage(message: string, ...args: string[]): Thenable<string | undefined> | undefined {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('message.error.show')) {
            return vscode.window.showErrorMessage(message, ...args)
        } else {
            return undefined
        }
    }

    showErrorMessageWithCompilerLogButton(message: string) {
        const res = this.showErrorMessage(message, 'Open compiler log')
        if (res) {
            return res.then(option => {
                switch (option) {
                    case 'Open compiler log': {
                        this.showCompilerLog()
                        break
                    }
                    default: {
                        break
                    }
                }
            })
        }
        return
    }

    showLog() {
        this.logPanel.show()
    }

    showCompilerLog() {
        this.compilerLogPanel.show()
    }
}
