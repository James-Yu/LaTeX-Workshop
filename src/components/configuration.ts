import * as vscode from 'vscode'
import * as path from 'path'
import { readFileSync } from 'fs'
import type {Extension} from '../main'

export class Configuration {
    private readonly extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
        this.logConfiguration()
        this.checkDeprecatedConfiguration()
        vscode.workspace.onDidChangeConfiguration((ev) => {
            this.logChangeOnConfiguration(ev)
        })
    }

    private readonly configurationsToLog = [
        'editor.acceptSuggestionOnEnter',
        'latex-workshop.bind.enter.key',
        'latex-workshop.docker.enabled',
        'latex-workshop.docker.image.latex',
        'latex-workshop.hover.preview.mathjax.extensions',
        'latex-workshop.intellisense.package.enabled',
        'latex-workshop.intellisense.update.aggressive.enabled',
        'latex-workshop.intellisense.update.delay',
        'latex-workshop.latex.autoBuild.run',
        'latex-workshop.latex.build.forceRecipeUsage',
        'latex-workshop.latex.outDir',
        'latex-workshop.latex.recipes',
        'latex-workshop.latex.tools',
        'latex-workshop.viewer.pdf.internal.keyboardEvent'
    ]

    private logConfiguration() {
        const workspaceFolders = vscode.workspace.workspaceFolders || [undefined]
        for (const workspace of workspaceFolders) {
            this.extension.logger.addLogMessage(`Configuration for workspace: ${workspace?.uri.toString(true)}`)
            const configuration = vscode.workspace.getConfiguration(undefined, workspace)
            for(const config of this.configurationsToLog) {
                const value = configuration.get(config)
                this.extension.logger.addLogMessage(`${config}: ${JSON.stringify(value, null, ' ')}`)
            }
        }
    }

    private logChangeOnConfiguration(ev: vscode.ConfigurationChangeEvent) {
        const workspaceFolders = vscode.workspace.workspaceFolders || [undefined]
        for(const config of this.configurationsToLog) {
            for (const workspace of workspaceFolders) {
                if (ev.affectsConfiguration(config, workspace)) {
                    const configuration = vscode.workspace.getConfiguration(undefined, workspace)
                    const value = configuration.get(config)
                    this.extension.logger.addLogMessage(`Configuration changed to { ${config}: ${JSON.stringify(value)} } at ${workspace?.uri.toString(true)}`)
                }
            }
        }
    }

    private checkDeprecatedConfiguration() {
        const packageDef = JSON.parse(readFileSync(path.resolve(__dirname, '../../../package.json')).toString()) as {contributes: {configuration: {properties: {[config: string]: {default: any, deprecationMessage?: string}}}}}
        const configs = Object.keys(packageDef.contributes.configuration.properties)
        const deprecatedConfigs = configs.filter(config => packageDef.contributes.configuration.properties[config].deprecationMessage)
                                         .map(config => config.split('.').slice(1).join('.'))
        const workspaceFolders = vscode.workspace.workspaceFolders || [undefined]
        for (const workspace of workspaceFolders) {
            const configuration = vscode.workspace.getConfiguration('latex-workshop', workspace)
            deprecatedConfigs.forEach(config => {
                const defaultValue = configuration.inspect(config)?.defaultValue
                const configValue = configuration.get(config)
                if (JSON.stringify(defaultValue) !== JSON.stringify(configValue)) {
                    const fullConfig = `latex-workshop.${config}`
                    this.extension.logger.addLogMessage(`Deprecated config ${config} with default value ${JSON.stringify(defaultValue)} is set to ${JSON.stringify(configValue)} at ${workspace?.uri.toString(true)}.`)
                    void vscode.window.showWarningMessage(`Config "${fullConfig}" is deprecated. ${packageDef.contributes.configuration.properties[fullConfig].deprecationMessage}`)
                }
            })
        }
    }

}
