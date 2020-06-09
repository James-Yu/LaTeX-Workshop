import * as vscode from 'vscode'
import * as cp from 'child_process'
import * as cs from 'cross-spawn'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

import { Extension } from '../main'
import {Mutex} from '../lib/await-semaphore'
import {replaceArgumentPlaceholders} from '../utils/utils'

const fullRange = (doc: vscode.TextDocument) => doc.validateRange(new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE))

export class OperatingSystem {
    public name: string
    public fileExt: string
    public checker: string

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
    private currentOs?: OperatingSystem
    private formatter: string = ''
    private formatterArgs: string[] = []
    private formatMutex: Mutex = new Mutex()

    constructor(extension: Extension) {
        this.extension = extension
        this.machineOs = os.platform()
        if (this.machineOs === windows.name) {
            this.currentOs = windows
        } else if (this.machineOs === linux.name) {
            this.currentOs = linux
        } else if (this.machineOs === mac.name) {
            this.currentOs = mac
        } else {
            this.extension.logger.addLogMessage('LaTexFormatter: Unsupported OS')
        }
    }

    public async formatDocument(document: vscode.TextDocument, range?: vscode.Range): Promise<vscode.TextEdit[]> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useDocker = configuration.get('docker.enabled') as boolean
        const pathMeta = configuration.get('latexindent.path') as string
        this.formatterArgs = configuration.get('latexindent.args') as string[]
        const releaseMutex = await this.formatMutex.acquire()
        try {
            if (!this.currentOs) {
                return []
            }
            if (pathMeta !== this.formatter) {
                this.formatter = pathMeta
                const latexindentPresent = await this.checkPath(this.currentOs.checker, useDocker)
                if (!latexindentPresent) {
                    this.extension.logger.addLogMessage('Can not find latexindent in PATH!')
                    this.extension.logger.showErrorMessage('Can not find latexindent in PATH!')
                    return []
                }
            }
            const edit = await this.format(document, range)
            return edit
        } finally {
            releaseMutex()
        }
    }

    private checkPath(checker: string, useDocker: boolean): Thenable<boolean> {
        if (useDocker) {
            if (process.platform === 'win32') {
                this.formatter = path.resolve(this.extension.extensionRoot, './scripts/latexindent.bat')
            } else {
                this.formatter = path.resolve(this.extension.extensionRoot, './scripts/latexindent')
                fs.chmodSync(this.formatter, 0o755)
            }
            return Promise.resolve(true)
        }

        return new Promise((resolve, _reject) => {
            cp.exec(checker + ' ' + this.formatter, (err, _stdout, _stderr) => {
                if (err) {
                    if (!this.currentOs) {
                        return
                    }
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

    private format(document: vscode.TextDocument, range?: vscode.Range): Thenable<vscode.TextEdit[]> {
        return new Promise((resolve, _reject) => {
            const configuration = vscode.workspace.getConfiguration('latex-workshop')
            const useDocker = configuration.get('docker.enabled') as boolean

            if (!vscode.window.activeTextEditor) {
                return
            }
            const options = vscode.window.activeTextEditor.options
            const tabSize = options.tabSize ? +options.tabSize : 4
            const useSpaces = options.insertSpaces

            const indent = useSpaces ? ' '.repeat(tabSize): '\\t'

            const documentDirectory = path.dirname(document.fileName)

            // The version of latexindent shipped with current latex distributions doesn't support piping in the data using stdin, support was
            // only added on 2018-01-13 with version 3.4 so we have to create a temporary file
            const textToFormat = document.getText(range)
            const temporaryFile = documentDirectory + path.sep + '__latexindent_temp.tex'
            fs.writeFileSync(temporaryFile, textToFormat)

            // generate command line arguments
            const rootFile = this.extension.manager.rootFile ? this.extension.manager.rootFile : document.fileName
            const args = this.formatterArgs.map(arg => { return replaceArgumentPlaceholders(rootFile, this.extension.builder.tmpDir)(arg)
                // latexformatter.ts specific tokens
                .replace(/%TMPFILE%/g, useDocker ? path.basename(temporaryFile) : temporaryFile.split(path.sep).join('/'))
                .replace(/%INDENT%/g, indent)
            })

            this.extension.logger.addLogMessage(`Formatting with command ${this.formatter} ${args}`)
            this.extension.manager.setEnvVar()
            const worker = cs.spawn(this.formatter, args, { stdio: 'pipe', cwd: documentDirectory })
            // handle stdout/stderr
            const stdoutBuffer: string[] = []
            const stderrBuffer: string[] = []
            worker.stdout.on('data', chunk => stdoutBuffer.push(chunk.toString()))
            worker.stderr.on('data', chunk => stderrBuffer.push(chunk.toString()))
            worker.on('error', err => {
                this.extension.logger.showErrorMessage('Formatting failed. Please refer to LaTeX Workshop Output for details.')
                this.extension.logger.addLogMessage(`Formatting failed: ${err.message}`)
                this.extension.logger.addLogMessage(`stderr: ${stderrBuffer.join('')}`)
                resolve()
            })
            worker.on('close', code => {
                if (code !== 0) {
                    this.extension.logger.showErrorMessage('Formatting failed. Please refer to LaTeX Workshop Output for details.')
                    this.extension.logger.addLogMessage(`Formatting failed with exit code ${code}`)
                    this.extension.logger.addLogMessage(`stderr: ${stderrBuffer.join('')}`)
                    return resolve()
                }
                const stdout = stdoutBuffer.join('')
                if (stdout !== '') {
                    const edit = [vscode.TextEdit.replace(range ? range : fullRange(document), stdout)]
                    try {
                        fs.unlinkSync(temporaryFile)
                        fs.unlinkSync(documentDirectory + path.sep + 'indent.log')
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

export class LatexFormatterProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    private formatter: LaTexFormatter

    constructor(extension: Extension) {
        this.formatter = new LaTexFormatter(extension)
    }

    public provideDocumentFormattingEdits(document: vscode.TextDocument, _options: vscode.FormattingOptions, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
        return this.formatter.formatDocument(document)
    }

    public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, _options: vscode.FormattingOptions, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
        return this.formatter.formatDocument(document, range)
    }

}
