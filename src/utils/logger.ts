import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { lw } from '../lw'

const LOG_PANEL = vscode.window.createOutputChannel('LaTeX Workshop')
const COMPILER_PANEL = vscode.window.createOutputChannel('LaTeX Compiler')
const STATUS_ITEM = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10000)
const PLACEHOLDERS: {[placeholder: string]: string} = {}

COMPILER_PANEL.append('Ready')
let CACHED_EXTLOG: string[] = []
let CACHED_COMPILER: string[] = []

export const log = {
    getLogger,
    getCachedLog,
    resetCachedLog,
    initStatusBarItem,
    logConfig,
    logConfigChange,
    logDeprecatedConfig
}

function resetCachedLog() {
    CACHED_EXTLOG = []
    CACHED_COMPILER = []
}

function getCachedLog() {
    return {CACHED_EXTLOG, CACHED_COMPILER}
}

function getLogger(...tags: string[]) {
    const tagString = tags.map(tag => `[${tag}]`).join('')
    return {
        log(message: string) {
            logTagless(`${tagString} ${message}`)
        },
        logCommand(message: string, command: string, args: string[] = []) {
            logCommand(`${tagString} ${message}`, command, args)
        },
        logError(message: string, error: unknown, stderr?: string) {
            logError(`${tagString} ${message}`, error, stderr)
        },
        logUtensilsError(message: string, error: Error) {
            logUtensilsError(`${tagString} ${message}`, error)
        },
        logCompiler,
        clearCompilerMessage,
        showLog,
        showCompilerLog,
        showStatus,
        refreshStatus,
        showErrorMessage,
        showErrorMessageWithCompilerLogButton,
        showErrorMessageWithExtensionLogButton
    }
}

function logTagless(message: string) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    if (!configuration.get('message.log.show')) {
        return
    }
    const date = new Date()
    const timestamp = `${date.toLocaleTimeString('en-US', { hour12: false })}.${date.getMilliseconds().toString().padStart(3, '0')}`
    vscode.workspace.workspaceFolders?.forEach(folder => {
        if (folder.uri.fsPath in PLACEHOLDERS) {
            return
        }
        const placeholder = `%WS${Object.keys(PLACEHOLDERS).length + 1}%`
        PLACEHOLDERS[folder.uri.fsPath] = placeholder
        const logMsg = `[${timestamp}][Logger] New log placeholder ${placeholder} registered for ${folder.uri.fsPath} .`
        LOG_PANEL.appendLine(logMsg)
        CACHED_EXTLOG.push(logMsg)
    })
    const logMsg = `[${timestamp}]${applyPlaceholders(message)}`
    LOG_PANEL.appendLine(logMsg)
    CACHED_EXTLOG.push(logMsg)
}

function applyPlaceholders(message: string) {
    Object.entries(PLACEHOLDERS).forEach(([realPath, placeholder]) => message = message.replaceAll(realPath, placeholder))
    return message
}

function logCommand(message: string, command: string, args: string[] = []) {
    logTagless(`${message} The command is ${command}:${JSON.stringify(args)}.`)
}

function logUtensilsError(message: string, error: Error) {
    let msg = `${message}: ${error.message}`
    if ('location' in error) {
        msg += ` Location context: ${JSON.stringify(error.location)} .`
    }
    logTagless(msg)
}

function logError(message: string, error: unknown, stderr?: string) {
    if (error instanceof Error) {
        logTagless(`${message} ${error.name}: ${error.message}`)
        if (error.stack) {
            logTagless(error.stack)
        }
    } else if (error instanceof Number) {
        logTagless(`${message} Exit code ${error}`)
    } else {
        logTagless(`${message} Context: ${String(error)}.`)
    }
    if (stderr) {
        logTagless(`[STDERR] ${stderr}`)
    }
}

function logCompiler(message: string) {
    COMPILER_PANEL.append(message)
    CACHED_COMPILER.push(message)
}

function initStatusBarItem() {
    STATUS_ITEM.command = 'latex-workshop.actions'
    STATUS_ITEM.show()
    refreshStatus('check', 'statusBar.foreground')
}

function clearCompilerMessage() {
    COMPILER_PANEL.clear()
}

function showLog() {
    LOG_PANEL.show()
}

function showCompilerLog() {
    COMPILER_PANEL.show()
}

function showStatus() {
    STATUS_ITEM.show()
}

function refreshStatus(
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

function showErrorMessage(message: string, ...args: string[]): Thenable<string | undefined> | undefined {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    if (configuration.get('message.error.show')) {
        return vscode.window.showErrorMessage(message, ...args)
    }
    return
}

function showErrorMessageWithCompilerLogButton(message: string) {
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

function showErrorMessageWithExtensionLogButton(message: string) {
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


type Configs = {
    [config: string]: {
        default: any,
        deprecationMessage?: string
    }
}

type PackageJSON = {
    contributes: {
        configuration: {
            properties: Configs
        }
    }
}

const relatedConf = [
    'editor.acceptSuggestionOnEnter',
]

let defaultConfig: Configs | undefined = undefined
function getDefaultConfig() {
    if (defaultConfig === undefined) {
        defaultConfig = (JSON.parse(fs.readFileSync(path.resolve(lw.extensionRoot, 'package.json')).toString()) as PackageJSON).contributes.configuration.properties
    }
    return defaultConfig
}

function logConfig() {
    const logConfigs = [...Object.keys(getDefaultConfig()), ...relatedConf]
    const workspaceFolders = vscode.workspace.workspaceFolders || [undefined]
    for (const workspace of workspaceFolders) {
        const configuration = vscode.workspace.getConfiguration(undefined, workspace)
        logConfigs.forEach(config => {
            const defaultValue = configuration.inspect(config)?.defaultValue
            const configValue = configuration.get(config)
            if (JSON.stringify(defaultValue) !== JSON.stringify(configValue)) {
                logTagless(`[Config] ${config}: ${JSON.stringify(configValue)} .`)
            }
        })
    }
}

function logDeprecatedConfig() {
    const deprecatedConfigs = Object.entries(getDefaultConfig())
        .filter(([_, value]) => value.deprecationMessage)
        .map(([config, _]) => config.split('.').slice(1).join('.'))
    const workspaceFolders = vscode.workspace.workspaceFolders || [undefined]
    for (const workspace of workspaceFolders) {
        const configuration = vscode.workspace.getConfiguration(undefined, workspace)
        deprecatedConfigs.forEach(config => {
            const defaultValue = configuration.inspect(config)?.defaultValue
            const configValue = configuration.get(config)
            if (JSON.stringify(defaultValue) !== JSON.stringify(configValue)) {
                logTagless(`[Config] Deprecated config ${config} with default value ${JSON.stringify(defaultValue)} is set to ${JSON.stringify(configValue)} at ${workspace?.uri.toString(true)} .`)
                void vscode.window.showWarningMessage(`Config "${config}" is deprecated. ${getDefaultConfig()[config].deprecationMessage}`)
            }
        })
    }
}

function logConfigChange(ev: vscode.ConfigurationChangeEvent) {
    const logConfigs = [...Object.keys(getDefaultConfig()), ...relatedConf]
    const workspaceFolders = vscode.workspace.workspaceFolders || [undefined]
    for (const workspace of workspaceFolders) {
        logConfigs.forEach(config => {
            if (ev.affectsConfiguration(config, workspace)) {
                const configuration = vscode.workspace.getConfiguration(undefined, workspace)
                const value = configuration.get(config)
                logTagless(`[Config] Configuration changed to { ${config}: ${JSON.stringify(value)} } at ${workspace?.uri.toString(true)} .`)
            }
        })
    }
}
