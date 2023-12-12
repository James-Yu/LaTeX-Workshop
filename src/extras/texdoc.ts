import * as vscode from 'vscode'
import * as cs from 'cross-spawn'
import { lw } from '../lw'

const logger = lw.log('TeXDoc')

export {
    texdoc
}

function runTexdoc(packageName: string) {
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

function texdoc(packageName?: string, useonly = false) {
    if (packageName) {
        runTexdoc(packageName)
        return
    }
    if (useonly) {
        const names: Set<string> = new Set()
        for (const tex of lw.cache.getIncludedTeX()) {
            const content = lw.cache.get(tex)
            const pkgs = content && content.elements.package
            if (!pkgs) {
                continue
            }
            Object.keys(pkgs).forEach(pkg => names.add(pkg))
        }
        const packageNames = Array.from(new Set(names))
        const items: vscode.QuickPickItem[] = packageNames.map(pkg => ({ label: pkg }))
        void vscode.window.showQuickPick(items).then(selectedPkg => {
            if (!selectedPkg) {
                return
            }
            runTexdoc(selectedPkg.label)
        })
    } else {
        void vscode.window.showInputBox({value: '', prompt: 'Package name'}).then(selectedPkg => {
            if (!selectedPkg) {
                return
            }
            runTexdoc(selectedPkg)
        })
    }
}
