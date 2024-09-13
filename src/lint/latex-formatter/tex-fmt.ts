import * as vscode from 'vscode'
import * as path from 'path'
import { lw } from '../../lw'
import { LaTeXFormatter } from '../../types'

const logger = lw.log('Format', 'tex-fmt')

export const texfmt: LaTeXFormatter = {
    formatDocument
}

async function formatDocument(document: vscode.TextDocument, range?: vscode.Range): Promise<vscode.TextEdit[]> {
    const config = vscode.workspace.getConfiguration('latex-workshop')
    const program = config.get('formatting.tex-fmt.path') as string
    const process = lw.external.spawn(program, ['--stdin'], { cwd: path.dirname(document.uri.fsPath) })

    let stdout: string = ''
    process.stdout?.on('data', (msg: Buffer | string) => {
        stdout += msg
    })

    const promise = new Promise<vscode.TextEdit[]>(resolve => {
        process.on('error', err => {
            logger.logError(`Failed to run ${program}`, err)
            logger.showErrorMessage(`Failed to run ${program}. See extension log for more information.`)
            resolve([])
        })

        process.on('exit', code => {
            if (code !== 0) {
                logger.log(`${program} returned ${code} .`)
                logger.showErrorMessage(`${program} returned ${code} . Be cautious on the edits.`)
                resolve([])
            }
            resolve([ vscode.TextEdit.replace(range ?? document.validateRange(new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE)), stdout) ])
        })
    })

    process.stdin?.write(document.getText(range))
    process.stdin?.end()
    const edits = await promise

    return edits
}
