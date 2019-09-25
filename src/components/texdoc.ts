import * as vscode from 'vscode'
import * as cp from 'child_process'
import * as fs from 'fs'
import {Extension} from 'src/main'

type Packages = {[key: string]: {command: string, detail: string, documentation: string}}

export class TeXDoc {
    extension: Extension
    pkgs: Packages = {}
    packageItems: vscode.QuickPickItem[] = []

    constructor(e: Extension) {
        this.extension = e
        setImmediate( () => this.readPackages() )
    }

    private readPackages() {
        const json = fs.readFileSync(`${this.extension.extensionRoot}/data/packagenames.json`).toString()
        const items: vscode.QuickPickItem[] = []
        const pkgs: Packages = JSON.parse(json)
        for ( const pkg of Object.values(pkgs) ) {
            const item = this.quickItemize(pkg)
            if (item) {
                items.push(item)
            }
        }
        this.packageItems = items
        this.pkgs = pkgs
    }

    private quickItemize(pkg: Packages[string]) {
        if ( !(pkg.command && pkg.documentation) ) {
            return undefined
        } else {
            return { label: pkg.command, detail: pkg.documentation }
        }
    }

    private runTexdoc(pkg: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const texdocPath = configuration.get('texdoc.path') as string
        const texdocArgs = configuration.get('texdoc.args') as string[]
        texdocArgs.push(pkg)
        const proc = cp.spawn(texdocPath, texdocArgs)

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
            this.extension.logger.showErrorMessage('Texdoc failed. Please refer to LaTeX Workshop Output for details.')
        })

        proc.on('exit', exitCode => {
            if (exitCode !== 0) {
                this.extension.logger.addLogMessage(`Cannot find documentation for ${pkg}.`)
                this.extension.logger.showErrorMessage('Texdoc failed. Please refer to LaTeX Workshop Output for details.')
            } else {
                const regex = new RegExp(`(no documentation found)|(Documentation for ${pkg} could not be found)`)
                if (stdout.match(regex) || stderr.match(regex)) {
                    this.extension.logger.addLogMessage(`Cannot find documentation for ${pkg}.`)
                    this.extension.logger.showErrorMessage(`Cannot find documentation for ${pkg}.`)
                } else {
                    this.extension.logger.addLogMessage(`Opening documentation for ${pkg}.`)
                }
            }
        })
    }

    texdoc(pkg?: string) {
        if (pkg) {
            this.runTexdoc(pkg)
            return
        }
        vscode.window.showInputBox({value: '', prompt: 'Package name'}).then(selectedPkg => {
            if (!selectedPkg) {
                return
            }
            this.runTexdoc(selectedPkg)
        })
    }

    texdocUsepackages() {
        const items: vscode.QuickPickItem[] = []
        let names: string[] = []
        for (const tex of this.extension.manager.getIncludedTeX()) {
            const content = this.extension.manager.cachedContent[tex]
            const pkgs = content && content.element.package
            if (!pkgs) {
                continue
            }
            names = names.concat(pkgs)
        }
        const packagenames = Array.from(new Set(names))
        for (const name of packagenames) {
            let item: vscode.QuickPickItem | undefined = { label: name }
            const pkg = this.pkgs[name]
            if (pkg) {
                item = this.quickItemize(pkg) || item
            }
            items.push(item)
        }
        vscode.window.showQuickPick(items).then(selectedPkg => {
            if (!selectedPkg) {
                return
            }
            this.runTexdoc(selectedPkg.label)
        })
    }
}
