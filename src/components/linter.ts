import * as vscode from 'vscode'
import * as lw from '../lw'
import { ChkTeX } from './linterlib/chktex'
import { LaCheck } from './linterlib/lacheck'
import { getLogger } from './logger'

const logger = getLogger('Linter')

export interface ILinter {
    readonly linterDiagnostics: vscode.DiagnosticCollection,
    getName(): string,
    lintRootFile(rootPath: string): void,
    lintFile(document: vscode.TextDocument): void,
    parseLog(log: string, filePath?: string): void
}

export class Linter {
    private linterTimeout?: NodeJS.Timer

    private getLinters(scope?: vscode.ConfigurationScope): ILinter[] {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', scope)
        const linters: ILinter[] = []
        if (configuration.get('linting.chktex.enabled')) {
            linters.push(ChkTeX.instance)
        } else {
            ChkTeX.instance.linterDiagnostics.clear()
        }
        if (configuration.get('linting.lacheck.enabled')) {
            linters.push(LaCheck.instance)
        } else {
            LaCheck.instance.linterDiagnostics.clear()
        }
        return linters
    }

    lintRootFileIfEnabled() {
        const linters = this.getLinters(lw.manager.getWorkspaceFolderRootDir())
        linters.forEach(linter => {
            if (lw.manager.rootFile === undefined) {
                logger.log(`No root file found for ${linter.getName()}.`)
                return
            }
            logger.log(`${linter.getName()} lints root ${lw.manager.rootFile} .`)
            linter.lintRootFile(lw.manager.rootFile)
        })
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
            this.linterTimeout = setTimeout(() => linters.forEach(linter => {
                logger.log(`${linter.getName()} lints ${document.fileName} .`)
                linter.lintFile(document)
            }), interval)
        }
    }
}
