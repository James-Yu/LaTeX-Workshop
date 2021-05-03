import * as vscode from 'vscode'
import type {Extension} from '../../main'

type DeprecatedConfig = {
    oldConfigKey: string,
    newConfigKey?: string,
    message?: string
}

export class DeprecatedConfiguration {
    private readonly extension: Extension

    private readonly deprecatedConfigurations: DeprecatedConfig[] = []

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
                    msg = `"${conf.oldConfigKey}" has been replaced by "${conf.newConfigKey}".`
                } else {
                    msg = `"${conf.oldConfigKey}" has been deprecated.`
                }
                if (conf.message) {
                    msg = msg + ' ' + conf.message
                } else {
                    msg = msg + ' ' + 'Please manually remove the deprecated config from your settings.'
                }
                this.extension.logger.addLogMessage(`Deprecated configuration is used: ${conf.oldConfigKey}`)
                this.extension.logger.displayStatus('check', 'statusBar.foreground', msg, 'warning')
            }
        }
    }

}
