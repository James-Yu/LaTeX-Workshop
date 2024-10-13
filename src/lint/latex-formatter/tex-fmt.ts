import * as vscode from 'vscode'
import * as path from 'path'
import { lw } from '../../lw'
import { LaTeXFormatter } from '../../types'

const logger = lw.log('Format', 'tex-fmt')

export const texfmt: LaTeXFormatter = {
    formatDocument
}

async function formatDocument(document: vscode.TextDocument, range?: vscode.Range): Promise<vscode.TextEdit | undefined> {
    const config = vscode.workspace.getConfiguration('latex-workshop')
    const program = config.get('formatting.tex-fmt.path') as string
    const args = [...(config.get('formatting.tex-fmt.args') as string[]), '--stdin']
    const process = lw.external.spawn(program, args, { cwd: path.dirname(document.uri.fsPath) })

    let stdout: Buffer = Buffer.alloc(0)
    process.stdout?.on('data', (msg: Buffer | string) => {
        stdout = Buffer.concat([stdout, Buffer.isBuffer(msg) ? msg : Buffer.from(msg)])
    })

    const promise = new Promise<vscode.TextEdit | undefined>(resolve => {
        process.on('error', err => {
            logger.logError(`Failed to run ${program}`, err)
            logger.showErrorMessage(`Failed to run ${program}. See extension log for more information.`)
            resolve(undefined)
        })

        process.on('exit', code => {
            if (code !== 0) {
                logger.log(`${program} returned ${code} .`)
                logger.showErrorMessage(`${program} returned ${code} . Be cautious on the edits.`)
                resolve(undefined)
            }
            let stdoutStr = stdout.toString()
            // tex-fmt adds an extra newline at the end
            if (stdoutStr.endsWith('\n\n')) {
                stdoutStr = stdoutStr.slice(0, -1)
            }
            logger.log(`Formatted using ${program} .`)
            resolve(vscode.TextEdit.replace(range ?? document.validateRange(new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE)), stdoutStr))
        })
    })

    process.stdin?.write(document.getText(range))
    process.stdin?.end()
    const edits = await promise

    return edits
}
