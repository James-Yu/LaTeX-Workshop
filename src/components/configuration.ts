import * as vscode from 'vscode'
import {DeprecatedConfiguration} from './configurationlib/deprecated'
import type {Extension} from '../main'

export class Configuration {
    private readonly extension: Extension
    private readonly deprecatedConfiguration: DeprecatedConfiguration

    constructor(extension: Extension) {
        this.extension = extension
        this.logConfiguration()
        vscode.workspace.onDidChangeConfiguration((ev) => {
            this.logChangeOnConfiguration(ev)
        })
        this.deprecatedConfiguration = new DeprecatedConfiguration(extension)
        this.deprecatedConfiguration.check()
    }

    private readonly configurationsToLog = [
        'latex-workshop.bind.enter.key',
        'latex-workshop.docker.enabled',
        'latex-workshop.docker.image.latex',
        'latex-workshop.hover.preview.mathjax.extensions',
        'latex-workshop.intellisense.package.enabled',
        'latex-workshop.intellisense.update.aggressive.enabled',
        'latex-workshop.intellisense.update.delay',
        'latex-workshop.latex.autoBuild.run',
        'latex-workshop.latex.outDir',
        'latex-workshop.latex.recipes',
        'latex-workshop.latex.tools',
        'latex-workshop.viewer.pdf.internal.keyboardEvent'
    ]

    private logConfiguration() {
        const configuration = vscode.workspace.getConfiguration()
        for(const config of this.configurationsToLog) {
            const value = configuration.get(config)
            this.extension.logger.addLogMessage(`${config}: ${JSON.stringify(value, null, ' ')}`)
        }
    }

    private logChangeOnConfiguration(ev: vscode.ConfigurationChangeEvent) {
        for(const config of this.configurationsToLog) {
            if (ev.affectsConfiguration(config)) {
                const configuration = vscode.workspace.getConfiguration()
                const value = configuration.get(config)
                this.extension.logger.addLogMessage(`Configutation changed to { ${config}: ${JSON.stringify(value)} }`)
            }
        }
    }

}
