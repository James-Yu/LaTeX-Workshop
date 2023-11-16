import * as vscode from 'vscode'
import * as cs from 'cross-spawn'
import * as lw from '../lw'
import { getLogger } from '../utils/logging/logger'

const logger = getLogger('TeXDoc')

export class TeXDoc {
    private runTexdoc(packageName: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const texdocPath = configuration.get('texdoc.path') as string
        const texdocArgs = Array.from(configuration.get('texdoc.args') as string[])
        texdocArgs.push(packageName)
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
            logger.log(`Cannot run texdoc: ${err.message}, ${stderr}`)
            void logger.showErrorMessage('Texdoc failed. Please refer to LaTeX Workshop Output for details.')
        })

        proc.on('exit', exitCode => {
            if (exitCode !== 0) {
                logger.logError(`Cannot find documentation for ${packageName}.`, exitCode)
                void logger.showErrorMessage('Texdoc failed. Please refer to LaTeX Workshop Output for details.')
            } else {
                const regex = new RegExp(`(no documentation found)|(Documentation for ${packageName} could not be found)`)
                if (stdout.match(regex) || stderr.match(regex)) {
                    logger.log(`Cannot find documentation for ${packageName}.`)
                    void logger.showErrorMessage(`Cannot find documentation for ${packageName}.`)
                } else {
                    logger.log(`Opening documentation for ${packageName}.`)
                }
            }
            logger.log(`texdoc stdout: ${stdout}`)
            logger.log(`texdoc stderr: ${stderr}`)
        })
    }

    texdoc(packageName?: string) {
        if (packageName) {
            this.runTexdoc(packageName)
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
        for (const tex of lw.cacher.getIncludedTeX()) {
            const content = lw.cacher.get(tex)
            const pkgs = content && content.elements.package
            if (!pkgs) {
                continue
            }
            Object.keys(pkgs).forEach(packageName => names.add(packageName))
        }
        const packageNames = Array.from(new Set(names))
        const items: vscode.QuickPickItem[] = packageNames.map(packageName => ({ label: packageName }))
        void vscode.window.showQuickPick(items).then(selectedPkg => {
            if (!selectedPkg) {
                return
            }
            this.runTexdoc(selectedPkg.label)
        })
    }
}
