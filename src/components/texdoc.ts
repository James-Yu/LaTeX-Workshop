import * as vscode from 'vscode'
import * as cs from 'cross-spawn'
import * as lw from '../lw'
import { getLogger } from './logger'

const logger = getLogger('TeXDoc')

export class TeXDoc {
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
            logger.log(`Cannot run texdoc: ${err.message}, ${stderr}`)
            void logger.showErrorMessage('Texdoc failed. Please refer to LaTeX Workshop Output for details.')
        })

        proc.on('exit', exitCode => {
            if (exitCode !== 0) {
                logger.logError(`Cannot find documentation for ${pkg}.`, exitCode)
                void logger.showErrorMessage('Texdoc failed. Please refer to LaTeX Workshop Output for details.')
            } else {
                const regex = new RegExp(`(no documentation found)|(Documentation for ${pkg} could not be found)`)
                if (stdout.match(regex) || stderr.match(regex)) {
                    logger.log(`Cannot find documentation for ${pkg}.`)
                    void logger.showErrorMessage(`Cannot find documentation for ${pkg}.`)
                } else {
                    logger.log(`Opening documentation for ${pkg}.`)
                }
            }
            logger.log(`texdoc stdout: ${stdout}`)
            logger.log(`texdoc stderr: ${stderr}`)
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
        for (const tex of lw.cacher.getIncludedTeX()) {
            const content = lw.cacher.get(tex)
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
