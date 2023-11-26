import * as vscode from 'vscode'
import { lw } from '../lw'
import { chkTeX } from './linterlib/chktex'
import { laCheck } from './linterlib/lacheck'


const logger = lw.log('Linter')

export interface ILinter {
    readonly linterDiagnostics: vscode.DiagnosticCollection,
    getName(): string,
    lintRootFile(rootPath: string): Promise<void>,
    lintFile(document: vscode.TextDocument): Promise<void>,
    parseLog(log: string, filePath?: string): void
}

export class Linter {
    private linterTimeout?: NodeJS.Timer

    private getLinters(scope?: vscode.ConfigurationScope): ILinter[] {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', scope)
        const linters: ILinter[] = []
        if (configuration.get('linting.chktex.enabled')) {
            linters.push(chkTeX)
        } else {
            chkTeX.linterDiagnostics.clear()
        }
        if (configuration.get('linting.lacheck.enabled')) {
            linters.push(laCheck)
        } else {
            laCheck.linterDiagnostics.clear()
        }
        return linters
    }

    lintRootFileIfEnabled() {
        const linters = this.getLinters(lw.root.getWorkspace())
        linters.forEach(linter => {
            if (lw.root.file.path === undefined) {
                logger.log(`No root file found for ${linter.getName()}.`)
                return
            }
            logger.log(`${linter.getName()} lints root ${lw.root.file.path} .`)
            void linter.lintRootFile(lw.root.file.path)
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
                void linter.lintFile(document)
            }), interval)
        }
    }
}
