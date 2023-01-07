import * as vscode from 'vscode'
import * as cs from 'cross-spawn'

import type { Extension } from '../main'
import * as logger from './logger'

export class TeXDoc {
    private readonly extension: Extension

    constructor(e: Extension) {
        this.extension = e
    }

    private runTexdoc(pkg: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const texdocPath = configuration.get('texdoc.path') as string
        const texdocArgs = Array.from(configuration.get('texdoc.args') as string[])
        texdocArgs.push(pkg)
        logger.logCommand('Run texdoc command', texdocPath, texdocArgs)
        const proc = cs.spawn(texdocPath, texdocArgs)

        let stdout = ''
        proc.stdout.on('data', newStdout => {
            stdout += newStdout
        })

        let stderr = ''
        proc.stderr.on('data', newStderr => {
            stderr += newStderr
        })

        proc.on('error', err => {
            logger.log(`[TeXDoc] Cannot run texdoc: ${err.message}, ${stderr}`)
            void logger.showErrorMessage('Texdoc failed. Please refer to LaTeX Workshop Output for details.')
        })

        proc.on('exit', exitCode => {
            if (exitCode !== 0) {
                logger.logError(`Cannot find documentation for ${pkg}.`, exitCode)
                void logger.showErrorMessage('Texdoc failed. Please refer to LaTeX Workshop Output for details.')
            } else {
                const regex = new RegExp(`(no documentation found)|(Documentation for ${pkg} could not be found)`)
                if (stdout.match(regex) || stderr.match(regex)) {
                    logger.log(`[TeXDoc] Cannot find documentation for ${pkg}.`)
                    void logger.showErrorMessage(`Cannot find documentation for ${pkg}.`)
                } else {
                    logger.log(`[TeXDoc] Opening documentation for ${pkg}.`)
                }
            }
            logger.log(`[TeXDoc] texdoc stdout: ${stdout}`)
            logger.log(`[TeXDoc] texdoc stderr: ${stderr}`)
        })
    }

    texdoc(pkg?: string) {
        if (pkg) {
            this.runTexdoc(pkg)
            return
        }
        void vscode.window.showInputBox({value: '', prompt: 'Package name'}).then(selectedPkg => {
            if (!selectedPkg) {
                return
            }
            this.runTexdoc(selectedPkg)
        })
    }

    texdocUsepackages() {
        const names: Set<string> = new Set()
        for (const tex of this.extension.cacher.getIncludedTeX()) {
            const content = this.extension.cacher.get(tex)
            const pkgs = content && content.elements.package
            if (!pkgs) {
                continue
            }
            Object.keys(pkgs).forEach(pkg => names.add(pkg))
        }
        const packagenames = Array.from(new Set(names))
        const items: vscode.QuickPickItem[] = packagenames.map( name => {
            return { label: name }
        })
        void vscode.window.showQuickPick(items).then(selectedPkg => {
            if (!selectedPkg) {
                return
            }
            this.runTexdoc(selectedPkg.label)
        })
    }
}
