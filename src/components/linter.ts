import * as vscode from 'vscode'

import type {Extension} from '../main'
import { Linter as AbstractLinter } from './linters/linter'
import { ChkTeX } from './linters/chktex'

export class Linter {
    protected readonly extension: Extension
    private readonly chktex: ChkTeX
    private linterTimeout?: NodeJS.Timer

    constructor(extension: Extension) {
        this.extension = extension
        this.chktex = new ChkTeX(extension)
    }

    private getLinter(scope?: vscode.ConfigurationScope | null): AbstractLinter | undefined {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', scope)
        switch (configuration.get('linting.linter') as string) {
            case 'none':
            default:
                return undefined
            case 'chktex':
                return this.chktex
        }
    }

    lintRootFileIfEnabled() {
        const linter = this.getLinter(this.extension.manager.getWorkspaceFolderRootDir())
        void linter?.lintRootFile()
    }

    lintActiveFileIfEnabledAfterInterval(document: vscode.TextDocument) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', document.uri)
        const linter = this.getLinter(document.uri)
        if (linter
            && (configuration.get('linting.run') as string) === 'onType') {
            const interval = configuration.get('linting.delay') as number
            if (this.linterTimeout) {
                clearTimeout(this.linterTimeout)
            }
            this.linterTimeout = setTimeout(() => linter.lintFile(document), interval)
        }
    }
}
