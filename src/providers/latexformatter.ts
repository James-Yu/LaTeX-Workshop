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
        this.formatter = 'latexindent'
    }

    public formatDocument(document: vscode.TextDocument) : Thenable<vscode.TextEdit[]> {
        return new Promise((resolve, reject) => {
            const formatter = 'latexindent'
            const filename = document.fileName

            if (this.machineOs === windows.name) {
                this.currentOs = windows
            } else if (this.machineOs === linux.name) {
                this.currentOs = linux
            }  else if (this.machineOs === mac.name) {
                this.currentOs = mac
            }

            this.checkPath(this.currentOs.checker).then((latexindentPresent) => {
                if (!latexindentPresent) {
                    this.extension.logger.addLogMessage('Can not find latexindent in PATH!')
                    vscode.window.showErrorMessage('Can not find latexindent in PATH!')
                    return resolve()
                }
                this.format(filename, document).then((edit) => {
                    return resolve(edit)
                })

            })
        })
    }

    private checkPath(checker: string) : Thenable<boolean> {
        return new Promise((resolve, reject) => {
            cp.exec(checker + ' ' + this.formatter, (err, stdout, stderr) => {
                if (stdout === '') {
                    this.formatter += this.currentOs.fileExt
                    this.checkPath(checker).then((res) => {
                        if (res) {
                            resolve(true)
                        } else {
                            resolve(false)
                        }
                    })
                }
                resolve(true)
            })
        })

    }

    private format(filename: string, document: vscode.TextDocument) : Thenable<vscode.TextEdit[]> {
        return new Promise((resolve, reject) => {
            cp.exec(this.formatter + ' "' + filename + '"', (err, stdout, stderr) => {
                if (stdout !== '') {
                    const edit = [vscode.TextEdit.replace(fullRange(document), stdout)]
                    try {
                        fs.unlinkSync(path.dirname(filename) + path.sep + 'indent.log')
                    } catch (ignored) {
                    }
                    return resolve(edit)
                }
                return resolve()
            })
        })

    }
}

export class LatexFormatterProvider implements vscode.DocumentFormattingEditProvider {
    private formatter: LaTexFormatter
    private extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
        this.formatter = new LaTexFormatter(extension)
    }

    public provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken) :
        vscode.ProviderResult<vscode.TextEdit[]> {
            return document.save().then(() => {
                return this.formatter.formatDocument(document)
            })
    }

}
