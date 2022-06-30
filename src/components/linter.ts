import * as vscode from 'vscode'

import type {Extension} from '../main'
import { ChkTeX } from './linters/chktex'

export class Linter {
    protected readonly extension: Extension
    private readonly chktex: ChkTeX
    private linterTimeout?: NodeJS.Timer

    constructor(extension: Extension) {
        this.extension = extension
        this.chktex = new ChkTeX(extension)
    }

    lintRootFileIfEnabled() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', this.extension.manager.getWorkspaceFolderRootDir())
        if (configuration.get('linting.linter') as string !== 'none') {
            void this.chktex.lintRootFile()
        }
    }

    lintActiveFileIfEnabledAfterInterval(document: vscode.TextDocument) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', document.uri)
        if ((configuration.get('linting.linter') as string !== 'none') &&
            (configuration.get('linting.run') as string) === 'onType') {
            const interval = configuration.get('linting.delay') as number
            if (this.linterTimeout) {
                clearTimeout(this.linterTimeout)
            }
            this.linterTimeout = setTimeout(() => this.chktex.lintFile(document), interval)
        }
    }
}
