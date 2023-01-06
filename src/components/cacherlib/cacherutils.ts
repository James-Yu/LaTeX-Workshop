import vscode from 'vscode'
import path from 'path'
import os from 'os'
import micromatch from 'micromatch'

export function canContext(filePath: string) {
    const texExt: string[] = ['.tex', '.bib']
    const rsweaveExt: string[] = ['.rnw', '.Rnw', '.rtex', '.Rtex', '.snw', '.Snw']
    const jlweaveExt: string[] = ['.jnw', '.jtexw']
    return [...texExt, rsweaveExt, jlweaveExt].includes(path.extname(filePath))
        && !filePath.includes('expl3-code.tex')
}

export function isExcluded(filePath: string): boolean {
    const globsToIgnore = vscode.workspace.getConfiguration('latex-workshop').get('latex.watch.files.ignore') as string[]
    const format = (str: string): string => {
        if (os.platform() === 'win32') {
            return str.replace(/\\/g, '/')
        }
        return str
    }
    return micromatch.some(filePath, globsToIgnore, { format })
}
