import * as vscode from 'vscode'

export class Logger {
    static readonly LOG_PANEL = vscode.window.createOutputChannel('LaTeX Workshop')
    static readonly COMPILER_PANEL = vscode.window.createOutputChannel('LaTeX Compiler')
    static readonly status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10000)

    constructor() {
        Logger.COMPILER_PANEL.append('Ready')
    }

    static initializeStatusBarItem() {
        Logger.status.command = 'latex-workshop.actions'
        Logger.status.show()
        Logger.displayStatus('check', 'statusBar.foreground')
    }

    static log(message: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('message.log.show')) {
            Logger.LOG_PANEL.append(`[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${message}\n`)
        }
    }

    static logCommand(message: string, command: string, args: string[] = []) {
        Logger.log(message + ': ' + command)
        Logger.log(message + ' args: ' + JSON.stringify(args))
    }

    static addCompilerMessage(message: string) {
        Logger.COMPILER_PANEL.append(message)
    }

    static logError(e: Error) {
        Logger.log(e.message)
        if (e.stack) {
            Logger.log(e.stack)
        }
    }

    static logOnRejected(e: unknown) {
        if (e instanceof Error) {
            this.logError(e)
        } else {
            Logger.log(String(e))
        }
    }

    static clearCompilerMessage() {
        Logger.COMPILER_PANEL.clear()
    }

    static showLog() {
        Logger.LOG_PANEL.show()
    }

    static showCompilerLog() {
        Logger.COMPILER_PANEL.show()
    }

    static displayStatus(
        icon: string,
        color: string,
        message: string | undefined = undefined,
        severity: 'info' | 'warning' | 'error' = 'info',
        build: string = ''
    ) {
        Logger.status.text = `$(${icon})${build}`
        Logger.status.tooltip = message
        Logger.status.color = new vscode.ThemeColor(color)
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

    static showErrorMessage(message: string, ...args: string[]): Thenable<string | undefined> | undefined {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('message.error.show')) {
            return vscode.window.showErrorMessage(message, ...args)
        } else {
            return undefined
        }
    }

    static showErrorMessageWithCompilerLogButton(message: string) {
        const res = Logger.showErrorMessage(message, 'Open compiler log')
        if (res) {
            return res.then(option => {
                switch (option) {
                    case 'Open compiler log': {
                        Logger.showCompilerLog()
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

    static showErrorMessageWithExtensionLogButton(message: string) {
        const res = Logger.showErrorMessage(message, 'Open LaTeX Workshop log')
        if (res) {
            return res.then(option => {
                switch (option) {
                    case 'Open LaTeX Workshop log': {
                        Logger.showLog()
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
}
