import * as vscode from 'vscode'

import type {Extension} from '../main'
import { ChkTeX } from './linterlib/chktex'
import { LaCheck } from './linterlib/lacheck'

export class Linter {
    private readonly chktex: ChkTeX
    private readonly lacheck: LaCheck
    private linterTimeout?: NodeJS.Timer

    constructor(private readonly extension: Extension) {
        this.chktex = new ChkTeX(extension)
        this.lacheck = new LaCheck(extension)
    }

    private getLinters(scope?: vscode.ConfigurationScope): (ChkTeX | LaCheck)[] {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', scope)
        const linters =[]
        if (configuration.get('linting.chktex.enabled')) {
            linters.push(this.chktex)
        } else {
            this.chktex.linterDiagnostics.clear()
        }
        if (configuration.get('linting.lacheck.enabled')) {
            linters.push(this.lacheck)
        } else {
            this.lacheck.linterDiagnostics.clear()
        }
        return linters
    }

    lintRootFileIfEnabled() {
        const linters = this.getLinters(this.extension.manager.getWorkspaceFolderRootDir())
        linters.forEach(linter => linter.lintRootFile())
    }

    lintActiveFileIfEnabledAfterInterval(document: vscode.TextDocument) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', document.uri)
        const linters = this.getLinters(document.uri)
        if (linters.length > 0
            && (configuration.get('linting.run') as string) === 'onType') {
            const interval = configuration.get('linting.delay') as number
            if (this.linterTimeout) {
                clearTimeout(this.linterTimeout)
            }
            this.linterTimeout = setTimeout(() => linters.forEach(linter => linter.lintFile(document)), interval)
        }
    }
}
