import * as vscode from 'vscode'

import type {Extension} from '../main'
import { ChkTeX } from './linters/chktex'

export class Linter {
    private readonly chktex: ChkTeX

    constructor(extension: Extension) {
        this.chktex = new ChkTeX(extension)
    }

    lintRootFileIfEnabled() {
        this.chktex.lintRoot()
    }

    lintActiveFileIfEnabledAfterInterval(document: vscode.TextDocument) {
        this.chktex.lint(document)
    }
}
