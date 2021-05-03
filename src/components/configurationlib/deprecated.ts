import * as vscode from 'vscode'
import type {Extension} from '../../main'

type DeprecatedConfig = {
    oldConfigKey: string,
    newConfigKey?: string,
    message?: string
}

export class DeprecatedConfiguration {
    private readonly extension: Extension

    private readonly deprecatedConfigurations: DeprecatedConfig[] = [
        {
            oldConfigKey: 'latex-workshop.maxPrintLine.option.enabled',
            newConfigKey: 'latex-workshop.latex.option.maxPrintLine.enabled'
        },
        {
            oldConfigKey: 'latex-workshop.chktex.interval',
            newConfigKey: 'latex-workshop.chktex.delay'
        },
        {
            oldConfigKey: 'latex-workshop.latex.outputDir',
            newConfigKey: 'latex-workshop.latex.outDir'
        },
        {
            oldConfigKey: 'latex-workshop.view.autoActivateLatex.enabled',
            newConfigKey: 'latex-workshop.view.autoFocus.enabled'
        },
        {
            oldConfigKey: 'latex-workshop.hoverPreview.enabled',
            newConfigKey: 'latex-workshop.hover.preview.enabled'
        },
        {
            oldConfigKey: 'latex-workshop.hoverReference.enabled',
            newConfigKey: 'latex-workshop.hover.ref.enabled'
        },
        {
            oldConfigKey: 'latex-workshop.hoverCitation.enabled',
            newConfigKey: 'latex-workshop.hover.citation.enabled'
        },
        {
            oldConfigKey: 'latex-workshop.hoverCommandDoc.enabled',
            newConfigKey: 'latex-workshop.hover.command.enabled'
        },
        {
            oldConfigKey: 'latex-workshop.hoverPreview.scale',
            newConfigKey: 'latex-workshop.hover.preview.scale'
        },
        {
            oldConfigKey: 'latex-workshop.hoverPreview.cursor.enabled',
            newConfigKey: 'latex-workshop.hover.preview.cursor.enabled'
        },
        {
            oldConfigKey: 'latex-workshop.hoverPreview.cursor.symbol',
            newConfigKey: 'latex-workshop.hover.preview.cursor.symbol'
        },
        {
            oldConfigKey: 'latex-workshop.hoverPreview.cursor.color',
            newConfigKey: 'latex-workshop.hover.preview.cursor.color'
        },
        {
            oldConfigKey: 'latex-workshop.hoverPreview.ref.enabled',
            newConfigKey: 'latex-workshop.hover.ref.enabled'
        },
        {
            oldConfigKey: 'latex-workshop.latex.clean.enabled',
            newConfigKey: 'latex-workshop.latex.autoClean.run'
        },
        {
            oldConfigKey: 'latex-workshop.latex.clean.onFailBuild.enabled',
            newConfigKey: 'latex-workshop.latex.autoClean.run'
        },
        {
            oldConfigKey: 'latex-workshop.latex.autoBuild.onSave.enabled',
            newConfigKey: 'latex-workshop.latex.autoBuild.run'
        },
        {
            oldConfigKey: 'latex-workshop.latex.autoBuild.onTexChange.enabled',
            newConfigKey: 'latex-workshop.latex.autoBuild.run'
        },
        {
            oldConfigKey: 'latex-workshop.hover.ref.numberAtLastCompilation.enabled',
            newConfigKey: 'latex-workshop.hover.ref.number.enabled'
        },
        {
            oldConfigKey: 'latex-workshop.latex-workshop.view.pdf.tab.useNewGroup',
            newConfigKey: 'latex-workshop.view.pdf.tab.editorGroup'
        },
        {
            oldConfigKey: 'latex-workshop.view.pdf.external.command',
            newConfigKey: 'latex-workshop.view.pdf.external.viewer.command'
        },
        {
            oldConfigKey: 'latex-workshop.intellisense.preview.enabled',
            newConfigKey: 'latex-workshop.intellisense.includegraphics.preview.enabled'
        }
    ]

    constructor(extension: Extension) {
        this.extension = extension
    }

    check() {
        const configuration = vscode.workspace.getConfiguration()
        for (const conf of this.deprecatedConfigurations) {
            const hasConf = configuration.has(conf.oldConfigKey)
            if (hasConf) {
                let msg: string
                if (conf.newConfigKey) {
                    msg = `"${conf.oldConfigKey}" has been replaced by "${conf.newConfigKey}". Please manually remove the deprecated config from your settings.`
                } else {
                    msg = `"${conf.oldConfigKey}" has been deprecated. Please manually remove the deprecated config from your settings.`
                }
                this.extension.logger.addLogMessage(`Deprecated configuration is used: ${conf.oldConfigKey}`)
                this.extension.logger.displayStatus('check', 'statusBar.foreground', msg, 'warning')
            }
        }
    }

}
