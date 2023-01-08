import * as vscode from 'vscode'
import * as cs from 'cross-spawn'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as lw from '../lw'
import {replaceArgumentPlaceholders} from '../utils/utils'
import { getLogger } from '../components/logger'

const logger = getLogger('Format', 'TeX')

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

export class LaTeXFormatter {
    private static currentOs?: OperatingSystem
    private static formatter: string = ''
    private static formatterArgs: string[] = []
    private static formatting: boolean = false

    static initialize() {
        const machineOs = os.platform()
        if (machineOs === windows.name) {
            LaTeXFormatter.currentOs = windows
        } else if (machineOs === linux.name) {
            LaTeXFormatter.currentOs = linux
        } else if (machineOs === mac.name) {
            LaTeXFormatter.currentOs = mac
        } else {
            logger.log('LaTexFormatter: Unsupported OS')
        }
    }

    static async formatDocument(document: vscode.TextDocument, range?: vscode.Range): Promise<vscode.TextEdit[]> {
        if (LaTeXFormatter.formatting) {
            logger.log('Formatting in progress. Aborted.')
        }
        LaTeXFormatter.formatting = true
        const configuration = vscode.workspace.getConfiguration('latex-workshop', document.uri)
        const pathMeta = configuration.get('latexindent.path') as string
        LaTeXFormatter.formatterArgs = configuration.get('latexindent.args') as string[]
        logger.log('Start formatting with latexindent.')
        try {
            if (pathMeta !== LaTeXFormatter.formatter) {
                LaTeXFormatter.formatter = pathMeta
                const latexindentPresent = await LaTeXFormatter.checkPath()
                if (!latexindentPresent) {
                    logger.log(`Can not find latexindent in PATH: ${LaTeXFormatter.formatter}`)
                    logger.log(`PATH: ${process.env.PATH}`)
                    void logger.showErrorMessage('Can not find latexindent in PATH.')
                    return []
                }
            }
            const edit = await LaTeXFormatter.format(document, range)
            return edit
        } finally {
            LaTeXFormatter.formatting = false
        }
    }

    private static checkPath(): Thenable<boolean> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const useDocker = configuration.get('docker.enabled') as boolean
        if (useDocker) {
            logger.log('Use Docker to invoke the command.')
            if (process.platform === 'win32') {
                LaTeXFormatter.formatter = path.resolve(lw.extensionRoot, './scripts/latexindent.bat')
            } else {
                LaTeXFormatter.formatter = path.resolve(lw.extensionRoot, './scripts/latexindent')
                fs.chmodSync(LaTeXFormatter.formatter, 0o755)
            }
            return Promise.resolve(true)
        }

        if (path.isAbsolute(LaTeXFormatter.formatter)) {
            if (fs.existsSync(LaTeXFormatter.formatter)) {
                return Promise.resolve(true)
            } else {
                logger.log(`The path of latexindent is absolute and not found: ${LaTeXFormatter.formatter}`)
                return Promise.resolve(false)
            }
        }

        if (!LaTeXFormatter.currentOs) {
            logger.log('The current platform is undefined.')
            return Promise.resolve(false)
        }
        const checker = LaTeXFormatter.currentOs.checker
        const fileExt = LaTeXFormatter.currentOs.fileExt

        return new Promise((resolve, _reject) => {
            logger.log(`Checking latexindent: ${checker} ${LaTeXFormatter.formatter}`)
            const check1 = cs.spawn(checker, [LaTeXFormatter.formatter])
            let stdout1: string = ''
            let stderr1: string = ''
            check1.stdout.setEncoding('utf8')
            check1.stderr.setEncoding('utf8')
            check1.stdout.on('data', d => { stdout1 += d})
            check1.stderr.on('data', d => { stderr1 += d})
            check1.on('close', code1 => {
                if (code1) {
                    logger.log(`Error when checking latexindent: ${stderr1}`)
                    LaTeXFormatter.formatter += fileExt
                    logger.log(`Checking latexindent: ${checker} ${LaTeXFormatter.formatter}`)
                    const check2 = cs.spawn(checker, [LaTeXFormatter.formatter])
                    let stdout2: string = ''
                    let stderr2: string = ''
                    check2.stdout.setEncoding('utf8')
                    check2.stderr.setEncoding('utf8')
                    check2.stdout.on('data', d => { stdout2 += d})
                    check2.stderr.on('data', d => { stderr2 += d})
                    check2.on('close', code2 => {
                        if (code2) {
                            resolve(false)
                            logger.log(`Error when checking latexindent: ${stderr2}`)
                        } else {
                            logger.log(`Checking latexindent is ok: ${stdout2}`)
                            resolve(true)
                        }
                    })
                } else {
                    logger.log(`Checking latexindent is ok: ${stdout1}`)
                    resolve(true)
                }
            })
        })
    }

    private static format(document: vscode.TextDocument, range?: vscode.Range): Thenable<vscode.TextEdit[]> {
        return new Promise((resolve, _reject) => {
            const configuration = vscode.workspace.getConfiguration('latex-workshop')
            const useDocker = configuration.get('docker.enabled') as boolean

            if (!vscode.window.activeTextEditor) {
                logger.log('Exit formatting. The active textEditor is undefined.')
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
            const temporaryFile = documentDirectory + path.sep + '__latexindent_temp_' + path.basename(document.fileName)
            fs.writeFileSync(temporaryFile, textToFormat)

            const removeTemporaryFiles = () => {
                try {
                    fs.unlinkSync(temporaryFile)
                    fs.unlinkSync(documentDirectory + path.sep + 'indent.log')
                } catch (ignored) {
                }
            }

            // generate command line arguments
            const rootFile = lw.manager.rootFile ? lw.manager.rootFile : document.fileName
            const args = LaTeXFormatter.formatterArgs.map(arg => { return replaceArgumentPlaceholders(rootFile, lw.manager.tmpDir)(arg)
                // latexformatter.ts specific tokens
                .replace(/%TMPFILE%/g, useDocker ? path.basename(temporaryFile) : temporaryFile.split(path.sep).join('/'))
                .replace(/%INDENT%/g, indent)
            })

            logger.logCommand('Format with command', LaTeXFormatter.formatter, LaTeXFormatter.formatterArgs)
            logger.log(`Format args: ${JSON.stringify(args)}`)
            const worker = cs.spawn(LaTeXFormatter.formatter, args, { stdio: 'pipe', cwd: documentDirectory })
            // handle stdout/stderr
            const stdoutBuffer: string[] = []
            const stderrBuffer: string[] = []
            worker.stdout.on('data', (chunk: Buffer | string) => stdoutBuffer.push(chunk.toString()))
            worker.stderr.on('data', (chunk: Buffer | string) => stderrBuffer.push(chunk.toString()))
            worker.on('error', err => {
                removeTemporaryFiles()
                void logger.showErrorMessage('Formatting failed. Please refer to LaTeX Workshop Output for details.')
                logger.log(`Formatting failed: ${err.message}`)
                logger.log(`stderr: ${stderrBuffer.join('')}`)
                resolve([])
            })
            worker.on('close', code => {
                removeTemporaryFiles()
                if (code !== 0) {
                    void logger.showErrorMessage('Formatting failed. Please refer to LaTeX Workshop Output for details.')
                    logger.log(`Formatting failed with exit code ${code}`)
                    logger.log(`stderr: ${stderrBuffer.join('')}`)
                    return resolve([])
                }
                const stdout = stdoutBuffer.join('')
                if (stdout !== '') {
                    const edit = [vscode.TextEdit.replace(range ? range : fullRange(document), stdout)]
                    logger.log('Formatted ' + document.fileName)
                    return resolve(edit)
                }

                return resolve([])
            })
        })
    }
}

export class LatexFormatterProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    public provideDocumentFormattingEdits(document: vscode.TextDocument, _options: vscode.FormattingOptions, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
        return LaTeXFormatter.formatDocument(document)
    }

    public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, _options: vscode.FormattingOptions, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
        return LaTeXFormatter.formatDocument(document, range)
    }

}
