import * as vscode from 'vscode'
import * as cs from 'cross-spawn'
import type {LoggerLocator, ManagerLocator} from '../interfaces'

interface IExtension extends
    LoggerLocator,
    ManagerLocator { }

export class TeXDoc {
    private readonly extension: IExtension

    constructor(e: IExtension) {
        this.extension = e
    }

    private runTexdoc(pkg: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const texdocPath = configuration.get('texdoc.path') as string
        const texdocArgs = Array.from(configuration.get('texdoc.args') as string[])
        texdocArgs.push(pkg)
        this.extension.logger.logCommand('Run texdoc command', texdocPath, texdocArgs)
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
            this.extension.logger.addLogMessage(`Cannot run texdoc: ${err.message}, ${stderr}`)
            void this.extension.logger.showErrorMessage('Texdoc failed. Please refer to LaTeX Workshop Output for details.')
        })

        proc.on('exit', exitCode => {
            if (exitCode !== 0) {
                this.extension.logger.addLogMessage(`Cannot find documentation for ${pkg}.`)
                void this.extension.logger.showErrorMessage('Texdoc failed. Please refer to LaTeX Workshop Output for details.')
            } else {
                const regex = new RegExp(`(no documentation found)|(Documentation for ${pkg} could not be found)`)
                if (stdout.match(regex) || stderr.match(regex)) {
                    this.extension.logger.addLogMessage(`Cannot find documentation for ${pkg}.`)
                    void this.extension.logger.showErrorMessage(`Cannot find documentation for ${pkg}.`)
                } else {
                    this.extension.logger.addLogMessage(`Opening documentation for ${pkg}.`)
                }
            }
            this.extension.logger.addLogMessage(`texdoc stdout: ${stdout}`)
            this.extension.logger.addLogMessage(`texdoc stderr: ${stderr}`)
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
        for (const tex of this.extension.manager.getIncludedTeX()) {
            const content = this.extension.manager.getCachedContent(tex)
            const pkgs = content && content.element.package
            if (!pkgs) {
                continue
            }
            pkgs.forEach(pkg => names.add(pkg))
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
