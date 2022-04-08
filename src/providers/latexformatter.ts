import * as vscode from 'vscode'
import * as cp from 'child_process'
import * as cs from 'cross-spawn'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

import type { Extension } from '../main'
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
    private readonly extension: Extension
    private readonly machineOs: string
    private readonly currentOs?: OperatingSystem
    private readonly formatMutex: Mutex = new Mutex()
    private formatter: string = ''
    private formatterArgs: string[] = []

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
        const configuration = vscode.workspace.getConfiguration('latex-workshop', document.uri)
        const pathMeta = configuration.get('latexindent.path') as string
        this.formatterArgs = configuration.get('latexindent.args') as string[]
        this.extension.logger.addLogMessage('Start formatting with latexindent.')
        const releaseMutex = await this.formatMutex.acquire()
        try {
            if (pathMeta !== this.formatter) {
                this.formatter = pathMeta
                const latexindentPresent = await this.checkPath()
                if (!latexindentPresent) {
                    this.extension.logger.addLogMessage(`Can not find latexindent in PATH: ${this.formatter}`)
                    this.extension.logger.addLogMessage(`PATH: ${process.env.PATH}`)
                    void this.extension.logger.showErrorMessage('Can not find latexindent in PATH.')
                    return []
                }
            }
            const edit = await this.format(document, range)
            return edit
        } finally {
            releaseMutex()
        }
    }

    private checkPath(): Thenable<boolean> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useDocker = configuration.get('docker.enabled') as boolean
        if (useDocker) {
            this.extension.logger.addLogMessage('Use Docker to invoke the command.')
            if (process.platform === 'win32') {
                this.formatter = path.resolve(this.extension.extensionRoot, './scripts/latexindent.bat')
            } else {
                this.formatter = path.resolve(this.extension.extensionRoot, './scripts/latexindent')
                fs.chmodSync(this.formatter, 0o755)
            }
            return Promise.resolve(true)
        }

        if (path.isAbsolute(this.formatter)) {
            if (fs.existsSync(this.formatter)) {
                return Promise.resolve(true)
            } else {
                this.extension.logger.addLogMessage(`The path of latexindent is absolute and not found: ${this.formatter}`)
                return Promise.resolve(false)
            }
        }

        if (!this.currentOs) {
            this.extension.logger.addLogMessage('The current platform is undefined.')
            return Promise.resolve(false)
        }
        const checker = this.currentOs.checker
        const fileExt = this.currentOs.fileExt

        return new Promise((resolve, _reject) => {
            this.extension.logger.addLogMessage(`Checking latexindent: ${checker} ${this.formatter}`)
            const check1 = cp.spawn(checker, [this.formatter])
            let stdout1: string = ''
            let stderr1: string = ''
            check1.stdout.setEncoding('utf8')
            check1.stderr.setEncoding('utf8')
            check1.stdout.on('data', d => { stdout1 += d})
            check1.stderr.on('data', d => { stderr1 += d})
            check1.on('close', code1 => {
                if (code1) {
                    this.extension.logger.addLogMessage(`Error when checking latexindent: ${stderr1}`)
                    this.formatter += fileExt
                    this.extension.logger.addLogMessage(`Checking latexindent: ${checker} ${this.formatter}`)
                    const check2 = cp.spawn(checker, [this.formatter])
                    let stdout2: string = ''
                    let stderr2: string = ''
                    check2.stdout.setEncoding('utf8')
                    check2.stderr.setEncoding('utf8')
                    check2.stdout.on('data', d => { stdout2 += d})
                    check2.stderr.on('data', d => { stderr2 += d})
                    check2.on('close', code2 => {
                        if (code2) {
                            resolve(false)
                            this.extension.logger.addLogMessage(`Error when checking latexindent: ${stderr2}`)
                        } else {
                            this.extension.logger.addLogMessage(`Checking latexindent is ok: ${stdout2}`)
                            resolve(true)
                        }
                    })
                } else {
                    this.extension.logger.addLogMessage(`Checking latexindent is ok: ${stdout1}`)
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
                this.extension.logger.addLogMessage('Exit formatting. The active textEditor is undefined.')
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

            const removeTemporaryFiles = () => {
                try {
                    fs.unlinkSync(temporaryFile)
                    fs.unlinkSync(documentDirectory + path.sep + 'indent.log')
                } catch (ignored) {
                }
            }

            // generate command line arguments
            const rootFile = this.extension.manager.rootFile ? this.extension.manager.rootFile : document.fileName
            const args = this.formatterArgs.map(arg => { return replaceArgumentPlaceholders(rootFile, this.extension.builder.tmpDir)(arg)
                // latexformatter.ts specific tokens
                .replace(/%TMPFILE%/g, useDocker ? path.basename(temporaryFile) : temporaryFile.split(path.sep).join('/'))
                .replace(/%INDENT%/g, indent)
            })

            this.extension.logger.logCommand('Format with command', this.formatter, this.formatterArgs)
            const worker = cs.spawn(this.formatter, args, { stdio: 'pipe', cwd: documentDirectory })
            // handle stdout/stderr
            const stdoutBuffer: string[] = []
            const stderrBuffer: string[] = []
            worker.stdout.on('data', (chunk: Buffer | string) => stdoutBuffer.push(chunk.toString()))
            worker.stderr.on('data', (chunk: Buffer | string) => stderrBuffer.push(chunk.toString()))
            worker.on('error', err => {
                removeTemporaryFiles()
                void this.extension.logger.showErrorMessage('Formatting failed. Please refer to LaTeX Workshop Output for details.')
                this.extension.logger.addLogMessage(`Formatting failed: ${err.message}`)
                this.extension.logger.addLogMessage(`stderr: ${stderrBuffer.join('')}`)
                resolve([])
            })
            worker.on('close', code => {
                removeTemporaryFiles()
                if (code !== 0) {
                    void this.extension.logger.showErrorMessage('Formatting failed. Please refer to LaTeX Workshop Output for details.')
                    this.extension.logger.addLogMessage(`Formatting failed with exit code ${code}`)
                    this.extension.logger.addLogMessage(`stderr: ${stderrBuffer.join('')}`)
                    return resolve([])
                }
                const stdout = stdoutBuffer.join('')
                if (stdout !== '') {
                    const edit = [vscode.TextEdit.replace(range ? range : fullRange(document), stdout)]
                    this.extension.logger.addLogMessage('Formatted ' + document.fileName)
                    return resolve(edit)
                }

                return resolve([])
            })
        })

    }
}

export class LatexFormatterProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    private readonly formatter: LaTexFormatter

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
