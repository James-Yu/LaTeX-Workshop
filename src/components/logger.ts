import * as vscode from 'vscode'

const LOG_PANEL = vscode.window.createOutputChannel('LaTeX Workshop')
const COMPILER_PANEL = vscode.window.createOutputChannel('LaTeX Compiler')
const STATUS_ITEM = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10000)

COMPILER_PANEL.append('Ready')

export function initializeStatusBarItem() {
    STATUS_ITEM.command = 'latex-workshop.actions'
    STATUS_ITEM.show()
    refreshStatus('check', 'statusBar.foreground')
}

export function log(message: string) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    if (configuration.get('message.log.show')) {
        LOG_PANEL.appendLine(`[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${message}`)
    }
}

export function logCommand(message: string, command: string, args: string[] = []) {
    log(`${message} The command is ${command}:${JSON.stringify(args)}.`)
}

export function addCompilerMessage(message: string) {
    COMPILER_PANEL.append(message)
}

export function logError(message: string, error: unknown, stderr?: string) {
    if (error instanceof Error) {
        log(`${message} ${error.name}: ${error.message}`)
        if (error.stack) {
            log(error.stack)
        }
    } else {
        log(`${message} Context: ${String(error)}.`)
    }
    if (stderr) {
        log(`STDERR: ${stderr}`)
    }
}

export function clearCompilerMessage() {
    COMPILER_PANEL.clear()
}

export function showLog() {
    LOG_PANEL.show()
}

export function showCompilerLog() {
    COMPILER_PANEL.show()
}

export function showStatus() {
    STATUS_ITEM.show()
}

export function refreshStatus(
    icon: string,
    color: string,
    message: string | undefined = undefined,
    severity: 'info' | 'warning' | 'error' = 'info',
    build: string = ''
) {
    STATUS_ITEM.text = `$(${icon})${build}`
    STATUS_ITEM.tooltip = message
    STATUS_ITEM.color = new vscode.ThemeColor(color)
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

export function showErrorMessage(message: string, ...args: string[]): Thenable<string | undefined> | undefined {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    if (configuration.get('message.error.show')) {
        return vscode.window.showErrorMessage(message, ...args)
    } else {
        return undefined
    }
}

export function showErrorMessageWithCompilerLogButton(message: string) {
    const res = showErrorMessage(message, 'Open compiler log')
    if (res) {
        return res.then(option => {
            switch (option) {
                case 'Open compiler log': {
                    showCompilerLog()
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

export function showErrorMessageWithExtensionLogButton(message: string) {
    const res = showErrorMessage(message, 'Open LaTeX Workshop log')
    if (res) {
        return res.then(option => {
            switch (option) {
                case 'Open LaTeX Workshop log': {
                    showLog()
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
