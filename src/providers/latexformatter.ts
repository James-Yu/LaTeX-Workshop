import * as vscode from 'vscode'
import * as cp from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

import { Extension } from '../main'

const fullRange = doc => doc.validateRange(new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE))

export class OperatingSystem {
    public name
    public fileExt
    public checker

    constructor(name: string, fileExt: string, checker: string) {
        this.name = name
        this.fileExt = fileExt
        this.checker = checker
    }
}

const windows: OperatingSystem = new OperatingSystem('win32', '.exe', 'where')
const linux: OperatingSystem = new OperatingSystem('linux', '.pl', 'which')
const mac: OperatingSystem = new OperatingSystem('darwin', '.pl', 'which')

export class LaTexFormatter {
    private extension: Extension
    private machineOs: string
    private currentOs: OperatingSystem
    private formatter: string

    constructor(extension: Extension) {
        this.extension = extension
        this.machineOs = os.platform()
    }

    public formatDocument(document: vscode.TextDocument) : Thenable<vscode.TextEdit[]> {
        return new Promise((resolve, _reject) => {
            if (this.machineOs === windows.name) {
                this.currentOs = windows
            } else if (this.machineOs === linux.name) {
                this.currentOs = linux
            }  else if (this.machineOs === mac.name) {
                this.currentOs = mac
            }

            const configuration = vscode.workspace.getConfiguration('latex-workshop.latexindent')
            this.formatter = configuration.get<string>('path') || 'latexindent'
            const pathMeta = configuration.inspect('path')

            if (pathMeta && pathMeta.defaultValue && pathMeta.defaultValue !== this.formatter) {
                this.format(document).then((edit) => {
                    return resolve(edit)
                })
            } else {
                this.checkPath(this.currentOs.checker).then((latexindentPresent) => {
                    if (!latexindentPresent) {
                        this.extension.logger.addLogMessage('Can not find latexindent in PATH!')
                        vscode.window.showErrorMessage('Can not find latexindent in PATH!')
                        return resolve()
                    }
                    this.format(document).then((edit) => {
                        return resolve(edit)
                    })
                })
            }
        })
    }

    private checkPath(checker: string) : Thenable<boolean> {
        return new Promise((resolve, _reject) => {
            cp.exec(checker + ' ' + this.formatter, (err, _stdout, _stderr) => {
                if (err) {
                    this.formatter += this.currentOs.fileExt
                    cp.exec(checker + ' ' + this.formatter, (err1, _stdout1, _stderr1) => {
                        if (err1) {
                            resolve(false)
                        } else {
                            resolve(true)
                        }
                    })
                } else {
                    resolve(true)
                }
            })
        })

    }

    private format(document: vscode.TextDocument) : Thenable<vscode.TextEdit[]> {
        return new Promise((resolve, _reject) => {
            const configuration = vscode.workspace.getConfiguration('editor', document.uri)
            const useSpaces = configuration.get<boolean>('insertSpaces')
            const tabSize = configuration.get<number>('tabSize') || 4
            const indent = useSpaces ? ' '.repeat(tabSize) : '\\t'

            cp.exec(this.formatter + ' "' + document.fileName + '"' + ' -y="defaultIndent: \'' + indent + '\'"',
             (err, stdout, _stderr) => {
                if (err) {
                    this.extension.logger.addLogMessage(`Formatting failed: ${err.message}`)
                    vscode.window.showErrorMessage('Formatting failed. Please refer to LaTeX Workshop Output for details.')
                    return resolve()
                }

                if (stdout !== '') {
                    const edit = [vscode.TextEdit.replace(fullRange(document), stdout)]
                    try {
                        fs.unlinkSync(path.dirname(document.fileName) + path.sep + 'indent.log')
                    } catch (ignored) {
                    }

                    this.extension.logger.addLogMessage('Formatted ' + document.fileName)
                    return resolve(edit)
                }

                return resolve()
            })
        })

    }
}

export class LatexFormatterProvider implements vscode.DocumentFormattingEditProvider {
    private formatter: LaTexFormatter

    constructor(extension: Extension) {
        this.formatter = new LaTexFormatter(extension)
    }

    public provideDocumentFormattingEdits(document: vscode.TextDocument, _options: vscode.FormattingOptions, _token: vscode.CancellationToken) :
        vscode.ProviderResult<vscode.TextEdit[]> {
            return document.save().then(() => {
                return this.formatter.formatDocument(document)
            })
    }

}
