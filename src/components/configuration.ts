import * as vscode from 'vscode'
import * as path from 'path'
import { readFileSync } from 'fs'
import { getLogger } from './logger'

const logger = getLogger('Config')

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

export class Configuration {
    private readonly defaultConf: Configs

    constructor() {
        this.defaultConf = (JSON.parse(readFileSync(path.resolve(__dirname, '../../../package.json')).toString()) as PackageJSON).contributes.configuration.properties
        this.logConfiguration()
        this.checkDeprecatedConfiguration()
        vscode.workspace.onDidChangeConfiguration((ev) => {
            this.logChangeOnConfiguration(ev)
        })
    }

    private readonly relatedConf = [
        'editor.acceptSuggestionOnEnter',
    ]

    private logConfiguration() {
        const logConfigs = [...Object.keys(this.defaultConf), ...this.relatedConf]
        const workspaceFolders = vscode.workspace.workspaceFolders || [undefined]
        for (const workspace of workspaceFolders) {
            const configuration = vscode.workspace.getConfiguration(undefined, workspace)
            logConfigs.forEach(config => {
                const defaultValue = configuration.inspect(config)?.defaultValue
                const configValue = configuration.get(config)
                if (JSON.stringify(defaultValue) !== JSON.stringify(configValue)) {
                    logger.log(`${config}: ${JSON.stringify(configValue)} .`)
                }
            })
        }
    }

    private logChangeOnConfiguration(ev: vscode.ConfigurationChangeEvent) {
        const logConfigs = [...Object.keys(this.defaultConf), ...this.relatedConf]
        const workspaceFolders = vscode.workspace.workspaceFolders || [undefined]
        for (const workspace of workspaceFolders) {
            logConfigs.forEach(config => {
                if (ev.affectsConfiguration(config, workspace)) {
                    const configuration = vscode.workspace.getConfiguration(undefined, workspace)
                    const value = configuration.get(config)
                    logger.log(`Configuration changed to { ${config}: ${JSON.stringify(value)} } at ${workspace?.uri.toString(true)} .`)
                }
            })
        }
    }

    private checkDeprecatedConfiguration() {
        const deprecatedConfigs = Object.entries(this.defaultConf)
            .filter(([_, value]) => value.deprecationMessage)
            .map(([config, _]) => config.split('.').slice(1).join('.'))
        const workspaceFolders = vscode.workspace.workspaceFolders || [undefined]
        for (const workspace of workspaceFolders) {
            const configuration = vscode.workspace.getConfiguration(undefined, workspace)
            deprecatedConfigs.forEach(config => {
                const defaultValue = configuration.inspect(config)?.defaultValue
                const configValue = configuration.get(config)
                if (JSON.stringify(defaultValue) !== JSON.stringify(configValue)) {
                    logger.log(`Deprecated config ${config} with default value ${JSON.stringify(defaultValue)} is set to ${JSON.stringify(configValue)} at ${workspace?.uri.toString(true)} .`)
                    void vscode.window.showWarningMessage(`Config "${config}" is deprecated. ${this.defaultConf[config].deprecationMessage}`)
                }
            })
        }
    }
}
