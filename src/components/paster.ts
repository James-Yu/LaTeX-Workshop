import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as fse from 'fs-extra'
import { spawn } from 'child_process'
import * as csv from 'csv-parser'

import { Extension } from '../main'
import { promisify } from 'util'

const fsCopy = promisify(fs.copyFile)

export class Paster {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    public async pasteFormatted() {
        this.extension.logger.addLogMessage('Performing formatted paste')

        // get current edit file path
        const editor = vscode.window.activeTextEditor
        if (!editor) {
            return
        }

        const fileUri = editor.document.uri
        if (!fileUri) {
            return
        }

        const clipboardContents = await vscode.env.clipboard.readText()

        // if empty try pasting an image from clipboard
        if (clipboardContents === '') {
            if (fileUri.scheme === 'untitled') {
                vscode.window.showInformationMessage('You need to the save the current editor before pasting an image')

                return
            }
            this.pasteImage(editor, fileUri.fsPath)
        }

        if (clipboardContents.split('\n').length === 1) {
            let filePath: string
            let basePath: string
            if (fileUri.scheme === 'untitled') {
                filePath = clipboardContents
                basePath = ''
            } else {
                filePath = path.resolve(fileUri.fsPath, clipboardContents)
                basePath = fileUri.fsPath
            }

            if (fs.existsSync(filePath)) {
                this.pasteFile(editor, basePath, clipboardContents)

                return
            }
        }
        // if not pasting file
        try {
            this.pasteTable(editor, clipboardContents)
        } catch (error) {
            this.pasteNormal(editor, this.reformatText(clipboardContents))
        }
    }

    public pasteNormal(editor: vscode.TextEditor, content: string) {
        editor.edit(edit => {
            const current = editor.selection

            if (current.isEmpty) {
                edit.insert(current.start, content)
            } else {
                edit.replace(current, content)
            }
        })
    }

    public pasteFile(editor: vscode.TextEditor, baseFile: string, file: string) {
        const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.eps', '.pdf']
        const TABLE_FORMATS = ['.csv']
        const extension = path.extname(file)

        if (IMAGE_EXTENSIONS.indexOf(extension) !== -1) {
            this.pasteImage(editor, baseFile, file)
        } else if (TABLE_FORMATS.indexOf(extension) !== -1) {
            if (extension === '.csv') {
                const rows: string[] = []

                fs.createReadStream(path.resolve(baseFile, file))
                    .pipe(csv())
                    .on('data', (data) => rows.push(Object.values(data).join('\t')))
                    .on('end', () => {
                        const body = rows.join('\n')
                        this.pasteTable(editor, body)
                    })
            }
        }
    }

    public pasteTable(editor: vscode.TextEditor, content: string) {
        this.extension.logger.addLogMessage('Pasting: Table')
        const trimUnwantedWhitespace = (s: string) =>
            s.replace(/^[^\S\t]+|[^\S\t]+$/gm, '').replace(/^[\uFEFF\xA0]+|[\uFEFF\xA0]+$/gm, '')
        content = trimUnwantedWhitespace(content)
        content = this.reformatText(content, false)
        const lines = content.split('\n')
        const cells = lines.map(l => l.split('\t'))

        // determine if all rows have same number of cells
        const isConsistent = cells.reduce((accumulator, current, _index, array) => {
            if (current.length === array[0].length) {
                return accumulator
            } else {
                return false
            }
        }, true)
        if (!isConsistent) {
            throw new Error('Table is not consistent')
        } else if (cells.length === 1 && cells[0].length === 1) {
            this.pasteNormal(editor, content)

            return
        }

        const configuration = vscode.workspace.getConfiguration('latex-workshop.formattedPaste')

        const columnType: string = configuration.tableColumnType
        const booktabs: boolean = configuration.tableBooktabsStyle
        const headerRows: number = configuration.tableHeaderRows

        const tabularRows = cells.map(row => '\t' + row.join(' & '))

        if (headerRows && tabularRows.length > headerRows) {
            const eol = editor.document.eol === vscode.EndOfLine.LF ? '\n' : '\r\n'
            const headSep = '\t' + (booktabs ? '\\midrule' : '\\hline') + eol
            tabularRows[headerRows] = headSep + tabularRows[headerRows]
        }
        let tabularContents = tabularRows.join(' \\\\\n')
        if (booktabs) {
            tabularContents = '\t\\toprule\n' + tabularContents + ' \\\\\n\t\\bottomrule'
        }
        const tabular = `\\begin{tabular}{${columnType.repeat(cells[0].length)}}\n${tabularContents}\n\\end{tabular}`

        editor.edit(edit => {
            const current = editor.selection

            if (current.isEmpty) {
                edit.insert(current.start, tabular)
            } else {
                edit.replace(current, tabular)
            }
        })
    }

    public reformatText(text: string, removeBonusWhitespace = true) {
        function doRemoveBonusWhitespace(str: string) {
            str = str.replace(/\u200B/g, '') // get rid of zero-width spaces
            str = str.replace(/\n{2,}/g, '\uE000') // 'save' multi-newlines to private use character
            str = str.replace(/\s+/g, ' ') // replace all whitespace with normal space
            str = str.replace(/\uE000/g, '\n\n')

            return str
        }

        if (removeBonusWhitespace) {
            text = doRemoveBonusWhitespace(text)
        }

        const textReplacements = {
            // escape latex special characters
            '\\\\': '\\textbackslash',
            '&/': '\\&',
            '%/': '\\%',
            '$/': '\\$',
            '#/': '\\#',
            '_/': '\\_',
            '^/': '\\textasciicircum',
            '{/': '\\{',
            '}/': '\\}',
            '~/': '\\textasciitilde',
            // dumb quotes
            '"([^"]+)"': "``$1''",
            "'([^']+)'": "`$1'",
            // 'smart' quotes
            '“': '``',
            '”': "''",
            '‘': '`',
            '’': "'",
            // unicode symbols
            '—': '---', // em dash
            '–': '--', // en dash
            '−': '-', // minus sign
            '…': '\\ldots', // elipses
            '‐': '-', // hyphen
            '™': '\\texttrademark', // trade mark
            '®': '\\textregistered', // registered trade mark
            '©': '\\textcopyright', // copyright
            '¢': '\\cent', // copyright
            '£': '\\pound', // copyright
            // unicode math
            '×': '\\(\\times \\)',
            '÷': '\\(\\div \\)',
            '±': '\\(\\pm \\)',
            '→': '\\(\\to \\)',
            '°': '\\(^\\circ \\)',
            '≤': '\\(\\leq \\)',
            '≥': '\\(\\geq \\)',
            // typographic approximations
            '\\.\\.\\.': '\\ldots',
            '-{20,}': '\\hline',
            '-{2,3}>': '\\(\\longrightarrow \\)',
            '->': '\\(\\to \\)',
            '<-{2,3}': '\\(\\longleftarrow \\)',
            '<-': '\\(\\leftarrow \\)'
        }

        for (const pattern in textReplacements) {
            text = text.replace(new RegExp(pattern, 'g'), textReplacements[pattern])
        }

        return text
    }

    // Image pasting code below from https://github.com/mushanshitiancai/vscode-paste-image/
    // Copyright 2016 mushanshitiancai
    // Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
    // The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

    PATH_VARIABLE_GRAPHICS_PATH = /\$\{graphicsPath\}/g
    PATH_VARIABLE_CURRNET_FILE_DIR = /\$\{currentFileDir\}/g
    PATH_VARIABLE_PROJECT_ROOT = /\$\{projectRoot\}/g
    PATH_VARIABLE_CURRNET_FILE_NAME = /\$\{currentFileName\}/g
    PATH_VARIABLE_CURRNET_FILE_NAME_WITHOUT_EXT = /\$\{currentFileNameWithoutExt\}/g

    PATH_VARIABLE_IMAGE_FILE_PATH = /\$\{imageFilePath\}/g
    PATH_VARIABLE_IMAGE_ORIGINAL_FILE_PATH = /\$\{imageOriginalFilePath\}/g
    PATH_VARIABLE_IMAGE_FILE_NAME = /\$\{imageFileName\}/g
    PATH_VARIABLE_IMAGE_FILE_NAME_WITHOUT_EXT = /\$\{imageFileNameWithoutExt\}/g

    pasteTemplate: string
    basePathConfig = '${graphicsPath}'
    graphicsPathFallback = '${currentFileDir}'

    public pasteImage(editor: vscode.TextEditor, baseFile: string, imgFile?: string) {
        this.extension.logger.addLogMessage('Pasting: Image')

        const folderPath = path.dirname(baseFile)
        const projectPath = vscode.workspace.workspaceFolders
            ? vscode.workspace.workspaceFolders[0].uri.fsPath
            : folderPath

        // get selection as image file name, need check
        const selection = editor.selection
        const selectText = editor.document.getText(selection)
        if (selectText && /\x00|\//.test(selectText)) {
            vscode.window.showInformationMessage('Your selection is not a valid file name!')

            return
        }

        this.loadImageConfig(projectPath, baseFile)

        if (imgFile && !selectText) {
            const imagePath = this.renderImagePaste(path.dirname(baseFile), imgFile)

            editor.edit(edit => {
                edit.insert(editor.selection.start, imagePath)
            })

            return
        }

        this.getImagePath(baseFile, imgFile, selectText, this.basePathConfig, (_err: Error, imagePath) => {
            try {
                // does the file exist?
                const existed = fs.existsSync(imagePath)
                if (existed) {
                    vscode.window
                        .showInformationMessage(
                            `File ${imagePath} exists. Would you want to replace?`,
                            'Replace',
                            'Cancel'
                        )
                        .then(choose => {
                            if (choose !== 'Replace') {
                                return
                            }

                            this.saveAndPaste(editor, imagePath, imgFile)
                        })
                } else {
                    this.saveAndPaste(editor, imagePath, imgFile)
                }
            } catch (err) {
                vscode.window.showErrorMessage(`fs.existsSync(${imagePath}) fail. message=${err.message}`)

                return
            }
        })
    }

    public loadImageConfig(projectPath: string, filePath: string) {
        const config = vscode.workspace.getConfiguration('latex-workshop.formattedPaste.image')

        // load other config
        const pasteTemplate = config.template
        if (typeof pasteTemplate === 'string') {
            this.pasteTemplate = pasteTemplate
        } else {
            // is multiline string represented by array
            this.pasteTemplate = pasteTemplate.join('\n')
        }

        this.graphicsPathFallback = this.replacePathVariables(this.graphicsPathFallback, projectPath, filePath)
        this.basePathConfig = this.replacePathVariables(this.basePathConfig, projectPath, filePath)
        this.pasteTemplate = this.replacePathVariables(this.pasteTemplate, projectPath, filePath)
    }

    public getImagePath(
        filePath: string,
        imagePathCurrent: string = '',
        selectText: string,
        folderPathFromConfig: string,
        callback: (err: Error | null, imagePath: string) => void
    ) {
        const graphicsPath = this.replacePathVariables('${graphicsPath}', folderPathFromConfig, filePath)
        const imgPostfixNumber =
            Math.max(
                0,
                ...fs
                    .readdirSync(graphicsPath)
                    .map(imagePath => parseInt(imagePath.replace(/^image(\d+)\.\w+/, '$1')))
                    .filter(num => !isNaN(num))
            ) + 1
        const imgExtension = path.extname(imagePathCurrent) ? path.extname(imagePathCurrent) : '.png'
        const imageFileName = selectText ? selectText + imgExtension : `image${imgPostfixNumber}` + imgExtension

        vscode.window
            .showInputBox({
                prompt: 'Please specify the filename of the image.',
                value: imageFileName,
                valueSelection: [imageFileName.length - imageFileName.length, imageFileName.length - 4]
            })
            .then(result => {
                if (result) {
                    if (!result.endsWith(imgExtension)) {
                        result += imgExtension
                    }

                    result = makeImagePath(result)

                    callback(null, result)
                }

                return
            })

        function makeImagePath(fileName: string) {
            // image output path
            const folderPath = path.dirname(filePath)
            let imagePath = ''

            // generate image path
            if (path.isAbsolute(folderPathFromConfig)) {
                imagePath = path.join(folderPathFromConfig, fileName)
            } else {
                imagePath = path.join(folderPath, folderPathFromConfig, fileName)
            }

            return imagePath
        }
    }

    public async saveAndPaste(editor: vscode.TextEditor, imgPath: string, oldPath?: string) {
        this.ensureImgDirExists(imgPath)
            .then((imagePath: string) => {
                // save image and insert to current edit file

                if (oldPath) {
                    fsCopy(oldPath, imagePath)
                    const imageString = this.renderImagePaste(this.basePathConfig, imagePath)

                    editor.edit(edit => {
                        const current = editor.selection

                        if (current.isEmpty) {
                            edit.insert(current.start, imageString)
                        } else {
                            edit.replace(current, imageString)
                        }
                    })
                } else {
                    this.saveClipboardImageToFileAndGetPath(imagePath, (_imagePath, imagePathReturnByScript) => {
                        if (!imagePathReturnByScript) {
                            return
                        }
                        if (imagePathReturnByScript === 'no image') {
                            vscode.window.showInformationMessage('No image in clipboard')

                            return
                        }

                        const imageString = this.renderImagePaste(this.basePathConfig, imagePath)

                        editor.edit(edit => {
                            const current = editor.selection

                            if (current.isEmpty) {
                                edit.insert(current.start, imageString)
                            } else {
                                edit.replace(current, imageString)
                            }
                        })
                    })
                }
            })
            .catch(err => {
                vscode.window.showErrorMessage(`Failed make folder. message=${err.message}`)

                return
            })
    }

    private ensureImgDirExists(imagePath: string) {
        return new Promise((resolve, reject) => {
            const imageDir = path.dirname(imagePath)

            fs.stat(imageDir, (error, stats) => {
                if (error === null) {
                    if (stats.isDirectory()) {
                        resolve(imagePath)
                    } else {
                        reject(new Error(`The image destination directory '${imageDir}' is a file.`))
                    }
                } else if (error.code === 'ENOENT') {
                    fse.ensureDir(imageDir, undefined, err => {
                        if (err) {
                            reject(err)

                            return undefined
                        }
                        resolve(imagePath)

                        return undefined
                    })
                } else {
                    reject(error)
                }
            })
        })
    }

    // TODO: turn into async function, and raise errors internally
    private saveClipboardImageToFileAndGetPath(
        imagePath,
        cb: (imagePath: string, imagePathFromScript: string) => void
    ) {
        if (!imagePath) {
            return
        }

        const platform = process.platform
        if (platform === 'win32') {
            // Windows
            const scriptPath = path.join(this.extension.extensionRoot, './scripts/saveclipimg-pc.ps1')

            let command = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
            const powershellExisted = fs.existsSync(command)
            if (!powershellExisted) {
                command = 'powershell'
            }

            const powershell = spawn(command, [
                '-noprofile',
                '-noninteractive',
                '-nologo',
                '-sta',
                '-executionpolicy',
                'unrestricted',
                '-windowstyle',
                'hidden',
                '-file',
                scriptPath,
                imagePath
            ])
            powershell.on('error', e => {
                if (e.name === 'ENOENT') {
                    vscode.window.showErrorMessage(
                        `The powershell command is not in you PATH environment variables.Please add it and retry.`
                    )
                } else {
                    console.log(e)
                    vscode.window.showErrorMessage(e.message)
                }
            })
            powershell.on('exit', (_code, _signal) => {
                // console.log('exit', code, signal);
            })
            powershell.stdout.on('data', (data: Buffer) => {
                cb(imagePath, data.toString().trim())
            })
        } else if (platform === 'darwin') {
            // Mac
            const scriptPath = path.join(this.extension.extensionRoot, './scripts/saveclipimg-mac.applescript')

            const ascript = spawn('osascript', [scriptPath, imagePath])
            ascript.on('error', e => {
                console.log(e)
                vscode.window.showErrorMessage(e.message)
            })
            ascript.on('exit', (_code, _signal) => {
                // console.log('exit',code,signal);
            })
            ascript.stdout.on('data', (data: Buffer) => {
                cb(imagePath, data.toString().trim())
            })
        } else {
            // Linux

            const scriptPath = path.join(this.extension.extensionRoot, './scripts/saveclipimg-linux.sh')

            const ascript = spawn('sh', [scriptPath, imagePath])
            ascript.on('error', e => {
                console.log(e)
                vscode.window.showErrorMessage(e.message)
            })
            ascript.on('exit', (_code, _signal) => {
                // console.log('exit',code,signal);
            })
            ascript.stdout.on('data', (data: Buffer) => {
                const result = data.toString().trim()
                if (result === 'no xclip') {
                    vscode.window.showErrorMessage('You need to install xclip command first.')

                    return
                }
                cb(imagePath, result)
            })
        }
    }

    public renderImagePaste(basePath: string, imageFilePath: string) : string {
        if (basePath) {
            imageFilePath = path.relative(basePath, imageFilePath)
        }

        const originalImagePath = imageFilePath
        const ext = path.extname(originalImagePath)
        const fileName = path.basename(originalImagePath)
        const fileNameWithoutExt = path.basename(originalImagePath, ext)

        let result = this.pasteTemplate

        result = result.replace(this.PATH_VARIABLE_IMAGE_FILE_PATH, imageFilePath)
        result = result.replace(this.PATH_VARIABLE_IMAGE_ORIGINAL_FILE_PATH, originalImagePath)
        result = result.replace(this.PATH_VARIABLE_IMAGE_FILE_NAME, fileName)
        result = result.replace(this.PATH_VARIABLE_IMAGE_FILE_NAME_WITHOUT_EXT, fileNameWithoutExt)

        return result
    }

    public replacePathVariables(
        pathStr: string,
        _projectRoot: string,
        curFilePath: string,
        postFunction: (str: string) => string = x => x
    ) : string {
        const currentFileDir = path.dirname(curFilePath)
        const ext = path.extname(curFilePath)
        const fileName = path.basename(curFilePath)
        const fileNameWithoutExt = path.basename(curFilePath, ext)
        let graphicsPath: string | string[] = this.extension.completer.input.graphicsPath
        graphicsPath = graphicsPath.length !== 0 ? graphicsPath[0] : this.graphicsPathFallback
        graphicsPath = path.resolve(currentFileDir, graphicsPath)

        pathStr = pathStr.replace(this.PATH_VARIABLE_GRAPHICS_PATH, postFunction(graphicsPath))
        pathStr = pathStr.replace(this.PATH_VARIABLE_CURRNET_FILE_DIR, postFunction(currentFileDir))
        pathStr = pathStr.replace(this.PATH_VARIABLE_CURRNET_FILE_NAME, postFunction(fileName))
        pathStr = pathStr.replace(this.PATH_VARIABLE_CURRNET_FILE_NAME_WITHOUT_EXT, postFunction(fileNameWithoutExt))

        return pathStr
    }
}
