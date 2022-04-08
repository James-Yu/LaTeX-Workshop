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
            this.extension.logger.addLogMessage(`Workspace for configuration: ${workspace?.uri.toString(true)}`)
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
                    this.extension.logger.addLogMessage(`Configutation changed to { ${config}: ${JSON.stringify(value)} } at ${workspace?.uri.toString(true)}`)
                }
            }
        }
    }

}
