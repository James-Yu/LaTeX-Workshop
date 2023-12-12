import * as vscode from 'vscode'
import * as cs from 'cross-spawn'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { lw } from '../lw'
import { replaceArgumentPlaceholders } from '../utils/utils'

const logger = lw.log('Format', 'TeX')

export {
    formattingProvider as formatter
}

const fullRange = (doc: vscode.TextDocument) => doc.validateRange(new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE))

type OperatingSystem = {
    name: string,
    fileExt: string,
    checker: string
}

let currentOs: OperatingSystem | undefined
let formatter: string = ''
let formatterArgs: string[] = []
let formatting: boolean = false

async function formatDocument(document: vscode.TextDocument, range?: vscode.Range): Promise<vscode.TextEdit[]> {
    if (formatting) {
        logger.log('Formatting in progress. Aborted.')
    }
    formatting = true
    const configuration = vscode.workspace.getConfiguration('latex-workshop', document.uri)
    const pathMeta = configuration.get('latexindent.path') as string
    formatterArgs = configuration.get('latexindent.args') as string[]
    logger.log('Start formatting with latexindent.')
    try {
        if (formatter === '') {
            formatter = pathMeta
            const latexindentPresent = await checkPath()
            if (!latexindentPresent) {
                formatter = ''
                logger.log(`Can not find ${formatter} in PATH: ${process.env.PATH}`)
                void logger.showErrorMessage('Can not find latexindent in PATH.')
                return []
            }
        }
        const edit = await format(document, range)
        return edit
    } finally {
        formatting = false
    }
}

function checkPath(): Thenable<boolean> {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const useDocker = configuration.get('docker.enabled') as boolean
    if (useDocker) {
        logger.log('Use Docker to invoke the command.')
        if (process.platform === 'win32') {
            formatter = path.resolve(lw.extensionRoot, './scripts/latexindent.bat')
        } else {
            formatter = path.resolve(lw.extensionRoot, './scripts/latexindent')
            fs.chmodSync(formatter, 0o755)
        }
        return Promise.resolve(true)
    }

    if (path.isAbsolute(formatter)) {
        if (fs.existsSync(formatter)) {
            return Promise.resolve(true)
        } else {
            logger.log(`The path of latexindent is absolute and not found: ${formatter}`)
            return Promise.resolve(false)
        }
    }

    if (!currentOs) {
        logger.log('The current platform is undefined.')
        return Promise.resolve(false)
    }
    const checker = currentOs.checker
    const fileExt = currentOs.fileExt

    const checkFormatter = (resolve: (value: boolean) => void, isFirstTry: boolean = true) => {
        const check = cs.spawn(checker, [formatter])
        let stdout: string = ''
        let stderr: string = ''
        check.stdout.setEncoding('utf8')
        check.stderr.setEncoding('utf8')
        check.stdout.on('data', d => { stdout += d})
        check.stderr.on('data', d => { stderr += d})
        check.on('close', code => {
            if (code && isFirstTry) {
                logger.log(`Error when checking latexindent: ${stderr}`)
                formatter += fileExt
                logger.log(`Checking latexindent: ${checker} ${formatter}`)
                checkFormatter(resolve, false)
            } else if (code) {
                logger.log(`Error when checking latexindent: ${stderr}`)
                resolve(false)
            } else {
                logger.log(`Checking latexindent is ok: ${stdout}`)
                resolve(true)
            }
        })
    }

    return new Promise((resolve, _) => {
        logger.log(`Checking latexindent: ${checker} ${formatter}`)
        checkFormatter(resolve)
    })
}

function format(document: vscode.TextDocument, range?: vscode.Range): Thenable<vscode.TextEdit[]> {
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
        const rootFile = lw.root.file.path || document.fileName
        const args = formatterArgs.map(arg => { return replaceArgumentPlaceholders(rootFile, lw.file.tmpDirPath)(arg)
            // ts specific tokens
            .replace(/%TMPFILE%/g, useDocker ? path.basename(temporaryFile) : temporaryFile.split(path.sep).join('/'))
            .replace(/%INDENT%/g, indent)
        })

        logger.logCommand('Formatting LaTeX.', formatter, args)
        const worker = cs.spawn(formatter, args, { stdio: 'pipe', cwd: documentDirectory })
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
                const edit = [vscode.TextEdit.replace(range || fullRange(document), stdout)]
                logger.log('Formatted ' + document.fileName)
                return resolve(edit)
            }

            return resolve([])
        })
    })
}

class FormattingProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    constructor() {
        const machineOs = os.platform()
        const oss: OperatingSystem[] = [
            { name: 'win32', fileExt: '.exe', checker: 'where' },
            { name: 'linux', fileExt: '.pl', checker: 'which' },
            { name: 'darwin', fileExt: '.pl', checker: 'which' }
        ]
        currentOs = oss.find(system => system.name === machineOs)
        if (!currentOs) {
            logger.log('LaTexFormatter: Unsupported OS')
        }
        lw.onConfigChange('latexindent.path', () => formatter = '')
    }

    public provideDocumentFormattingEdits(document: vscode.TextDocument, _options: vscode.FormattingOptions, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
        return formatDocument(document)
    }

    public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, _options: vscode.FormattingOptions, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
        return formatDocument(document, range)
    }

}

const formattingProvider = new FormattingProvider()
