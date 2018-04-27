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
    private formatterArgs: string[]

    constructor(extension: Extension) {
        this.extension = extension
        this.machineOs = os.platform()
    }

    public formatDocument(document: vscode.TextDocument, range?: vscode.Range) : Thenable<vscode.TextEdit[]> {
        return new Promise((resolve, _reject) => {
            if (this.machineOs === windows.name) {
                this.currentOs = windows
            } else if (this.machineOs === linux.name) {
                this.currentOs = linux
            }  else if (this.machineOs === mac.name) {
                this.currentOs = mac
            }

            const configuration = vscode.workspace.getConfiguration('latex-workshop')
            this.formatter = configuration.get<string>('latexindent.path') || 'latexindent'
            if (configuration.get('docker.enabled')) {
                if (process.platform === 'win32') {
                    this.formatter = path.join(this.extension.extensionRoot, 'scripts/latexindent.bat')
                } else {
                    this.formatter = path.join(this.extension.extensionRoot, 'scripts/latexindent')
                    fs.chmodSync(this.formatter, 0o777)
                }
            }
            this.formatterArgs = configuration.get<string[]>('latexindent.args')
                || [ '-c', '%DIR%/', '%TMPFILE%', '-y="defaultIndent: \'%INDENT%\'"' ]
            const pathMeta = configuration.inspect('latexindent.path')

            if (pathMeta && pathMeta.defaultValue && pathMeta.defaultValue !== this.formatter) {
                this.format(document, range).then((edit) => {
                    return resolve(edit)
                })
            } else {
                this.checkPath(this.currentOs.checker).then((latexindentPresent) => {
                    if (!latexindentPresent) {
                        this.extension.logger.addLogMessage('Can not find latexindent in PATH!')
                        vscode.window.showErrorMessage('Can not find latexindent in PATH!')
                        return resolve()
                    }
                    this.format(document, range).then((edit) => {
                        return resolve(edit)
                    })
                })
            }
        })
    }

    private checkPath(checker: string) : Thenable<boolean> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('docker.enabled')) {
            return Promise.resolve(true)
        }
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

    private format(document: vscode.TextDocument, range?: vscode.Range) : Thenable<vscode.TextEdit[]> {
        return new Promise((resolve, _reject) => {
            const latexSettings = vscode.workspace.getConfiguration('[latex]', document.uri)
            const configuration = vscode.workspace.getConfiguration('editor', document.uri)

            let useSpaces = configuration.get<boolean>('insertSpaces')
            if (latexSettings.hasOwnProperty('editor.insertSpaces')) {
                useSpaces = latexSettings['editor.insertSpaces']
            }

            let tabSize = configuration.get<number>('tabSize') || 4
            if (latexSettings.hasOwnProperty('editor.tabSize')) {
                tabSize = latexSettings['editor.tabSize']
            }
            const indent = useSpaces ? ' '.repeat(tabSize) : '\\t'

            const documentDirectory = path.dirname(document.fileName)

            // The version of latexindent shipped with current latex distributions doesn't support piping in the data using stdin, support was
            // only added on 2018-01-13 with version 3.4 so we have to create a temporary file
            const textToFormat = document.getText(range)
            const temporaryFile = documentDirectory + path.sep + '__latexindent_temp.tex'
            fs.writeFileSync(temporaryFile, textToFormat)

            const doc = document.fileName.replace(/\.tex$/, '').split(path.sep).join('/')
            const docfile = path.basename(document.fileName, '.tex').split(path.sep).join('/')
            // generate command line arguments
            const args = this.formatterArgs.map(arg => arg
                // taken from ../components/builder.ts
                .replace('%DOC%', configuration.get('docker.enabled') ? docfile : doc)
                .replace('%DOCFILE%', docfile)
                .replace('%DIR%', path.dirname(document.fileName).split(path.sep).join('/'))
                // latexformatter.ts specific tokens
                .replace('%TMPFILE%', temporaryFile.split(path.sep).join('/'))
                .replace('%INDENT%', indent))

            const worker = cp.spawn(this.formatter, args, { stdio: 'pipe', cwd: path.dirname(document.fileName) })
            // handle stdout/stderr
            const stdoutBuffer = [] as string[]
            const stderrBuffer = [] as string[]
            worker.stdout.on('data', chunk => stdoutBuffer.push(chunk.toString()))
            worker.stderr.on('data', chunk => stderrBuffer.push(chunk.toString()))
            worker.on('error', err => {
                vscode.window.showErrorMessage('Formatting failed. Please refer to LaTeX Workshop Output for details.')
                this.extension.logger.addLogMessage(`Formatting failed: ${err.message}`)
                this.extension.logger.addLogMessage(`stderr: ${stderrBuffer.join('')}`)
                resolve()
            })
            worker.on('close', code => {
                if (code !== 0) {
                    vscode.window.showErrorMessage('Formatting failed. Please refer to LaTeX Workshop Output for details.')
                    this.extension.logger.addLogMessage(`Formatting failed with exit code ${code}`)
                    this.extension.logger.addLogMessage(`stderr: ${stderrBuffer.join('')}`)
                    return resolve()
                }
                const stdout = stdoutBuffer.join('')
                if (stdout !== '') {
                    const edit = [vscode.TextEdit.replace(range ? range : fullRange(document), stdout)]
                    try {
                        fs.unlink(temporaryFile)
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

    public provideDocumentFormattingEdits(document: vscode.TextDocument, _options: vscode.FormattingOptions, _token: vscode.CancellationToken) :
        vscode.ProviderResult<vscode.TextEdit[]> {
            return document.save().then(() => {
                return this.formatter.formatDocument(document)
            })
    }

    public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, _options: vscode.FormattingOptions,
                                               _token: vscode.CancellationToken) : vscode.ProviderResult<vscode.TextEdit[]> {
        return document.save().then(() => {
            return this.formatter.formatDocument(document, range)
        })
    }

}
