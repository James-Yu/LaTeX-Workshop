import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as cs from 'cross-spawn'
import { lw } from '../lw'

const logger = lw.log('Counter')

export {
    count
}

const state = {
    useDocker: false,
    disableCountAfterSave: false,
    autoRunEnabled: false,
    autoRunInterval: 0,
    commandArgs: [] as string[],
    commandPath: '',
    texCountMessage: '',
    wordCount: '',
    // gotoLine status item has priority 100.5 and selectIndentation item has priority 100.4
    statusBar: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100.45)
}
loadConfigs()

lw.onConfigChange(['texcount', 'docker.enabled'], loadConfigs)
lw.onDispose(vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor | undefined) => {
    if (e && lw.file.hasTeXLangId(e.document.languageId)) {
        loadConfigs(e.document.uri)
    } else {
        state.statusBar.hide()
    }
}))

function loadConfigs(scope?: vscode.ConfigurationScope | undefined) {
    scope = scope ?? vscode.window.activeTextEditor?.document.uri ?? lw.root.getWorkspace()
    const configuration = vscode.workspace.getConfiguration('latex-workshop', scope)
    state.autoRunEnabled = (configuration.get('texcount.autorun') as string === 'onSave')
    state.autoRunInterval = configuration.get('texcount.interval') as number
    state.commandArgs = configuration.get('texcount.args') as string[]
    state.commandPath = configuration.get('texcount.path') as string
    state.useDocker = configuration.get('docker.enabled') as boolean
    if (state.autoRunEnabled) {
        updateWordCount()
        state.statusBar.show()
    } else {
        state.statusBar.hide()
    }
}

function updateWordCount() {
    if (state.wordCount === '') {
        state.statusBar.text = ''
        state.statusBar.tooltip = ''
    } else {
        state.statusBar.text = state.wordCount + ' words'
        state.statusBar.tooltip = state.texCountMessage
    }
}

function count(file: string, merge: boolean = true, manual: boolean = false) {
    if (!manual) {
        if (!state.autoRunEnabled) {
            return
        }
        if (state.disableCountAfterSave) {
            logger.log('Auto texcount is temporarily disabled in favor of `texcount.interval`.')
            return
        }
        logger.log(`Auto texcount started on saving file ${file} .`)
        state.disableCountAfterSave = true
        setTimeout(() => state.disableCountAfterSave = false, state.autoRunInterval)
        void runTeXCount(file).then(() => {
            updateWordCount()
        })
    } else {
        void runTeXCount(file, merge).then( () => {
            void vscode.window.showInformationMessage(state.texCountMessage)
        })
    }
}

function runTeXCount(file: string, merge: boolean = true): Promise<boolean> {
    let command = state.commandPath
    if (state.useDocker) {
        logger.log('Use Docker to invoke the command.')
        if (process.platform === 'win32') {
            command = path.resolve(lw.extensionRoot, './scripts/texcount.bat')
        } else {
            command = path.resolve(lw.extensionRoot, './scripts/texcount')
            fs.chmodSync(command, 0o755)
        }
    }
    const args = Array.from(state.commandArgs)
    if (merge && !args.includes('-merge')) {
        args.push('-merge')
    }
    args.push(path.basename(file))
    logger.logCommand('Count words using command.', command, args)
    const proc = cs.spawn(command, args, {cwd: path.dirname(file)})
    proc.stdout.setEncoding('utf8')
    proc.stderr.setEncoding('utf8')

    let stdout = ''
    proc.stdout.on('data', newStdout => {
        stdout += newStdout
    })

    let stderr = ''
    proc.stderr.on('data', newStderr => {
        stderr += newStderr
    })

    proc.on('error', err => {
        logger.logError('Cannot count words.', err, stderr)
        void logger.showErrorMessage('TeXCount failed. Please refer to LaTeX Workshop Output for details.')
    })

    return new Promise( resolve => {
        proc.on('exit', exitCode => {
            if (exitCode !== 0) {
                logger.logError('Cannot count words', exitCode, stderr)
                void logger.showErrorMessage('TeXCount failed. Please refer to LaTeX Workshop Output for details.')
            } else {
                const words = /Words in text: ([0-9]*)/g.exec(stdout)
                const floats = /Number of floats\/tables\/figures: ([0-9]*)/g.exec(stdout)
                if (words) {
                    let floatMsg = ''
                    if (floats && parseInt(floats[1]) > 0) {
                        floatMsg = `and ${floats[1]} float${parseInt(floats[1]) > 1 ? 's' : ''} (tables, figures, etc.) `
                    }
                    state.wordCount = words[1]
                    state.texCountMessage = `There are ${words[1]} words ${floatMsg}in the ${merge ? 'LaTeX project' : 'opened LaTeX file'}.`
                    resolve(true)
                }
            }
        })
    })
}
