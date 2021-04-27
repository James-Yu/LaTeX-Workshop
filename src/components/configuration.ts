import * as vscode from 'vscode'
import type {Extension} from '../main'

export class Configuration {
    private readonly extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
        this.logConfiguration()
        vscode.workspace.onDidChangeConfiguration((ev) => {
            this.logChangeOnConfiguration(ev)
        })
    }

    private readonly configurationsToLog = [
        'latex-workshop.intellisense.update.aggressive.enabled',
        'latex-workshop.intellisense.update.delay'
    ]

    private logConfiguration() {
        const configuration = vscode.workspace.getConfiguration()
        for(const config of this.configurationsToLog) {
            const value = configuration.get(config)
            this.extension.logger.addLogMessage(`${config}: ${JSON.stringify(value)}`)
        }
    }

    private logChangeOnConfiguration(ev: vscode.ConfigurationChangeEvent) {
        for(const config of this.configurationsToLog) {
            if (ev.affectsConfiguration(`${config}`)) {
                const configuration = vscode.workspace.getConfiguration()
                const value = configuration.get(config)
                this.extension.logger.addLogMessage(`Configutation changed to: ${config}: ${JSON.stringify(value)}`)
            }
        }
    }

}
