import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as fse from 'fs-extra'
import { spawn } from 'child_process'
import * as moment from 'moment'

import { Extension } from '../main'

// Adapted from https://github.com/mushanshitiancai/vscode-paste-image/
// Copyright 2016 mushanshitiancai
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

export class Paster {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    PATH_VARIABLE_GRAPHICS_PATH = /\$\{graphicsPath\}/g
    PATH_VARIABLE_CURRNET_FILE_DIR = /\$\{currentFileDir\}/g
    PATH_VARIABLE_PROJECT_ROOT = /\$\{projectRoot\}/g
    PATH_VARIABLE_CURRNET_FILE_NAME = /\$\{currentFileName\}/g
    PATH_VARIABLE_CURRNET_FILE_NAME_WITHOUT_EXT = /\$\{currentFileNameWithoutExt\}/g

    PATH_VARIABLE_IMAGE_FILE_PATH = /\$\{imageFilePath\}/g
    PATH_VARIABLE_IMAGE_ORIGINAL_FILE_PATH = /\$\{imageOriginalFilePath\}/g
    PATH_VARIABLE_IMAGE_FILE_NAME = /\$\{imageFileName\}/g
    PATH_VARIABLE_IMAGE_FILE_NAME_WITHOUT_EXT = /\$\{imageFileNameWithoutExt\}/g

    FILE_PATH_CONFIRM_INPUTBOX_MODE_ONLY_NAME = 'onlyName'
    FILE_PATH_CONFIRM_INPUTBOX_MODE_PULL_PATH = 'fullPath'

    defaultNameConfig: string
    folderPathConfig: string
    basePathConfig: string
    encodePathConfig: string
    namePrefixConfig: string
    nameSuffixConfig: string
    pasteTemplate: string
    graphicsPathFallback: string
    showFilePathConfirmInputBox: boolean
    filePathConfirmInputBoxMode: string

    public async paste() {
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
        if (fileUri.scheme === 'untitled') {
            vscode.window.showInformationMessage('Before paste image, you need to save current edit file first.')
            return
        }

        const clipboardContents = await vscode.env.clipboard.readText()
        // if no text, then try an image
        if (clipboardContents === '') {
            this.pasteImg(editor, fileUri)
        } else {
            if (clipboardContents.split('\n').length === 1) {
                const fpath = path.resolve(fileUri.fsPath, clipboardContents)
                if (fs.existsSync(fpath)) {
                    this.pasteFile(editor, fileUri.fsPath, clipboardContents)
                    return
                }
            }
            // if not pasting file
            try {
                this.pasteTable(editor, clipboardContents)
            } catch (error) {
                this.pasteNormal(editor, this.reformatText.completeReformat(clipboardContents))
            }
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
            const projectPath = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : path.dirname(file)
            this.loadImageConfig(projectPath, file)

            const imagePath = this.renderImagePath(baseFile, file)

            editor.edit(edit => {
                const current = editor.selection

                if (current.isEmpty) {
                    edit.insert(current.start, imagePath)
                } else {
                    edit.replace(current, imagePath)
                }
            })
        } else if (TABLE_FORMATS.indexOf(extension) !== -1) {
            const contents = fs.readFileSync(path.resolve(baseFile, file), 'utf8')
            if (extension === '.csv') {
                // from: https://stackoverflow.com/a/41563966/3026698
                let p = ''
                let row = ['']
                let i = 0
                let r = 0
                let s = !0
                let l
                const ret = [row]
                for (l of contents) {
                    if ('"' === l) {
                        if (s && l === p) {
                            row[i] += l
                        }
                        s = !s
                    } else if (',' === l && s) {
                        l = row[++i] = ''
                    } else if ('\n' === l && s) {
                        if ('\r' === p) {
                            row[i] = row[i].slice(0, -1)
                        }
                        row = ret[++r] = [(l = '')]
                        i = 0
                    } else {
                        row[i] += l
                    }
                    p = l
                }
                const rows = ret.map(r => r.join('\t'))
                const body = rows.join('\n')
                this.pasteTable(editor, body)
            }
        }
    }

    public pasteTable(editor: vscode.TextEditor, content: string) {
        this.extension.logger.addLogMessage('Pasting: Table')
        // trim surrounding whitespace
        content = content.replace(/^\s*/, '').replace(/\s*$/, '')
        content = this.reformatText.completeReformat(content, false)
        const lines = content.split('\n')
        const cells = lines.map(l => l.split('\t'))
        // determine if all rows have same number of cells
        const isConsistent = cells.reduce((accumulator, current, index, array) => {
            if (current.length === array[0].length) {
                return accumulator
            } else {
                return false
            }
        }, true)
        if (!isConsistent || (cells.length === 1 && cells[0].length === 1)) {
            throw new Error('Table is not consistent')
        }
        const columnType: string = vscode.workspace.getConfiguration('latex-workshop.formattedPaste')['tableColumnType']
        const booktabs: boolean = vscode.workspace.getConfiguration('latex-workshop.formattedPaste')['tableBooktabsStyle']
        const headerRows: number = vscode.workspace.getConfiguration('latex-workshop.formattedPaste')['tableHeaderRows']
        const tabularRows = cells.map(row => '\t' + row.join(' & '))
        if (headerRows && tabularRows.length > headerRows) {
            const headSep = booktabs ? '\t\\midrule\n' : '\t\\hline\n'
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

    public reformatText = {
        escape: (text: string) => {
            text = text.replace(/\\/g, '\\textbackslash')
            text = text.replace(/&/g, '\\&')
            text = text.replace(/%/g, '\\%')
            text = text.replace(/\$/g, '\\$')
            text = text.replace(/#/g, '\\#')
            text = text.replace(/_/g, '\\_')
            text = text.replace(/\^/g, '\\textasciicircum')
            text = text.replace(/{/g, '\\{')
            text = text.replace(/}/g, '\\}')
            text = text.replace(/~/g, '\\textasciitilde')
            return text
        },
        convertQuotes: (text: string) => {
            text = text.replace(/"([^"]+)"/g, "``$1''")
            text = text.replace(/'([^']+)'/g, "`$1'")
            // 'smart' quotes
            text = text.replace(/“/g, '``')
            text = text.replace(/”/g, "''")
            text = text.replace(/‘/g, '`')
            text = text.replace(/’/g, "'")
            return text
        },
        // symbols that have latex equivilents
        unicodeSymbols: (text: string) => {
            text = text.replace(/—/g, '---') // em dash
            text = text.replace(/–/g, '--') // en dash
            text = text.replace(/–/g, '-') // minus sign
            text = text.replace(/…/g, '\\ldots') // elipses
            text = text.replace(/‐/g, '-') // hyphen
            text = text.replace(/‐/g, '-') // hyphen-
            text = text.replace(/™/g, '\\texttrademark') // trade mark
            text = text.replace(/®/g, '\\textregistered') // registered trade mark
            text = text.replace(/©/g, '\\textcopyright') // copyright
            text = text.replace(/¢/g, '\\cent') // copyright
            text = text.replace(/£/g, '\\pound') // copyright
            return text
        },
        unicodeMath: (text: string) => {
            text = text.replace(/×/g, '\\(\\times \\)')
            text = text.replace(/÷/g, '\\(\\div \\)')
            text = text.replace(/…/g, '\\(\\ldots \\)')
            text = text.replace(/±/g, '\\(\\pm \\)')
            text = text.replace(/→/g, '\\(\\to \\)')
            text = text.replace(/°/g, '\\(^\\circ \\)')
            text = text.replace(/≤/g, '\\(\\leq \\)')
            text = text.replace(/≥/g, '\\(\\geq \\)')
            return text
        },
        typographicApproximations: (text: string) => {
            text = text.replace(/\.\.\./g, '\\ldots')
            text = text.replace(/-{20,}/g, '\\hline')
            text = text.replace(/-{2,3}>/g, '\\(\\longrightarrow \\)')
            text = text.replace(/->/g, '\\(\\to \\)')
            text = text.replace(/<-{2,3}/g, '\\(\\longleftarrow \\)')
            text = text.replace(/<-/g, '\\(\\leftarrow \\)')
            return text
        },
        removeBonusWhitespace: (text: string) => {
            text = text.replace(/\n\n/g, '\uE000')
            text = text.replace(/\s+/g, ' ')
            text = text.replace(/\uE000/g, '\n\n')
            return text
        },
        completeReformat: (content: string, removeBonusWhitespace = true) => {
            content = this.reformatText.escape(content)
            if (removeBonusWhitespace) {
                content = this.reformatText.removeBonusWhitespace(content)
            }
            content = this.reformatText.unicodeSymbols(content)
            content = this.reformatText.convertQuotes(content)
            content = this.reformatText.unicodeMath(content)
            content = this.reformatText.typographicApproximations(content)
            return content
        }
    }

    public loadImageConfig(projectPath, filePath) {
        // load config latex-workshop.formattedPaste.defaultName
        this.defaultNameConfig = vscode.workspace.getConfiguration('latex-workshop.formattedPaste')['defaultName']
        if (!this.defaultNameConfig) {
            this.defaultNameConfig = 'Y-MM-DD-HH-mm-ss'
        }

        // load config latex-workshop.formattedPaste.path
        this.folderPathConfig = vscode.workspace.getConfiguration('latex-workshop.formattedPaste')['path']
        if (!this.folderPathConfig) {
            this.folderPathConfig = '${graphicsPath}'
        }
        if (this.folderPathConfig.length !== this.folderPathConfig.trim().length) {
            vscode.window.showErrorMessage(
                `The config latex-workshop.formattedPaste.path = '${this.folderPathConfig}' is invalid. please check your config.`
            )
            return
        }
        // load config latex-workshop.formattedPaste.basePath
        this.basePathConfig = vscode.workspace.getConfiguration('latex-workshop.formattedPaste')['basePath']
        if (!this.basePathConfig) {
            this.basePathConfig = ''
        }
        if (this.basePathConfig.length !== this.basePathConfig.trim().length) {
            vscode.window.showErrorMessage(
                `The config latex-workshop.formattedPaste.path = '${this.basePathConfig}' is invalid. please check your config.`
            )
            return
        }
        // load other config
        this.encodePathConfig = vscode.workspace.getConfiguration('latex-workshop.formattedPaste')['encodePath']
        this.namePrefixConfig = vscode.workspace.getConfiguration('latex-workshop.formattedPaste')['namePrefix']
        this.nameSuffixConfig = vscode.workspace.getConfiguration('latex-workshop.formattedPaste')['nameSuffix']
        this.graphicsPathFallback = vscode.workspace.getConfiguration('latex-workshop.formattedPaste')['graphicsPathFallback']
        const pasteTemplate = vscode.workspace.getConfiguration('latex-workshop.formattedPaste')['template']
        if (typeof pasteTemplate === 'string') {
            this.pasteTemplate = pasteTemplate
        } else {
            // is array
            this.pasteTemplate = pasteTemplate.join('\n')
        }
        this.showFilePathConfirmInputBox =
            vscode.workspace.getConfiguration('latex-workshop.formattedPaste')['showFilePathConfirmInputBox'] || false
        this.filePathConfirmInputBoxMode = vscode.workspace.getConfiguration('latex-workshop.formattedPaste')[
            'filePathConfirmInputBoxMode'
        ]

        // replace variable in config
        this.defaultNameConfig = this.replacePathVariable(this.defaultNameConfig, projectPath, filePath, x => `[${x}]`)
        this.folderPathConfig = this.replacePathVariable(this.folderPathConfig, projectPath, filePath)
        this.basePathConfig = this.replacePathVariable(this.basePathConfig, projectPath, filePath)
        this.namePrefixConfig = this.replacePathVariable(this.namePrefixConfig, projectPath, filePath)
        this.nameSuffixConfig = this.replacePathVariable(this.nameSuffixConfig, projectPath, filePath)
        this.pasteTemplate = this.replacePathVariable(this.pasteTemplate, projectPath, filePath)
    }

    public pasteImg(editor: vscode.TextEditor, fileUri: vscode.Uri) {
        this.extension.logger.addLogMessage('Pasting: Image')
        const filePath = fileUri.fsPath
        const folderPath = path.dirname(filePath)
        const projectPath = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : folderPath

        // get selection as image file name, need check
        const selection = editor.selection
        const selectText = editor.document.getText(selection)
        if (selectText && /[\\:*?<>|]/.test(selectText)) {
            vscode.window.showInformationMessage('Your selection is not a valid file name!')
            return
        }

        this.loadImageConfig(projectPath, filePath)

        // "this" is lost when coming back from the callback, thus we need to store it here.
        const instance = this
        this.getImagePath(
            filePath,
            selectText,
            this.folderPathConfig,
            this.showFilePathConfirmInputBox,
            this.filePathConfirmInputBoxMode,
            (err, imagePath) => {
                try {
                    // is the file existed?
                    const existed = fs.existsSync(imagePath)
                    if (existed) {
                        vscode.window
                            .showInformationMessage(`File ${imagePath} existed.Would you want to replace?`, 'Replace', 'Cancel')
                            .then(choose => {
                                if (choose !== 'Replace') {
                                    return
                                }

                                instance.saveAndPaste(editor, imagePath)
                            })
                    } else {
                        instance.saveAndPaste(editor, imagePath)
                    }
                } catch (err) {
                    vscode.window.showErrorMessage(`fs.existsSync(${imagePath}) fail. message=${err.message}`)
                    return
                }
            }
        )
    }

    public saveAndPaste(editor: vscode.TextEditor, imagePath) {
        this.createImageDirWithImagePath(imagePath)
            .then(imagePath => {
                // save image and insert to current edit file
                this.saveClipboardImageToFileAndGetPath(imagePath, (imagePath, imagePathReturnByScript) => {
                    if (!imagePathReturnByScript) {
                        return
                    }
                    if (imagePathReturnByScript === 'no image') {
                        vscode.window.showInformationMessage('There is not a image in clipboard.')
                        return
                    }

                    imagePath = this.renderImagePath(this.basePathConfig, imagePath)

                    editor.edit(edit => {
                        const current = editor.selection

                        if (current.isEmpty) {
                            edit.insert(current.start, imagePath)
                        } else {
                            edit.replace(current, imagePath)
                        }
                    })
                })
            })
            .catch(err => {
                vscode.window.showErrorMessage(`Failed make folder. message=${err.message}`)
                return
            })
    }

    public getImagePath(
        filePath: string,
        selectText: string,
        folderPathFromConfig: string,
        showFilePathConfirmInputBox: boolean,
        filePathConfirmInputBoxMode: string,
        callback: (err, imagePath: string) => void
    ) {
        // image file name
        let imageFileName = ''
        if (!selectText) {
            imageFileName = this.namePrefixConfig + moment().format(this.defaultNameConfig) + this.nameSuffixConfig + '.png'
            // no moment alternative
            // date format: "2019-06-19-9-04"
            // new Date().toISOString().replace(/(T0|:)/g, '-').replace(/-\d+\..*$/, '')
        } else {
            imageFileName = this.namePrefixConfig + selectText + this.nameSuffixConfig + '.png'
        }

        let filePathOrName
        if (filePathConfirmInputBoxMode === this.FILE_PATH_CONFIRM_INPUTBOX_MODE_PULL_PATH) {
            filePathOrName = makeImagePath(imageFileName)
        } else {
            filePathOrName = imageFileName
        }

        if (showFilePathConfirmInputBox) {
            vscode.window
                .showInputBox({
                    prompt: 'Please specify the filename of the image.',
                    value: filePathOrName,
                    valueSelection: [filePathOrName.length - imageFileName.length, filePathOrName.length - 4]
                })
                .then(result => {
                    if (result) {
                        if (!result.endsWith('.png')) {
                            result += '.png'
                        }

                        if (filePathConfirmInputBoxMode === this.FILE_PATH_CONFIRM_INPUTBOX_MODE_ONLY_NAME) {
                            result = makeImagePath(result)
                        }

                        callback(null, result)
                    }
                    return
                })
        } else {
            callback(null, makeImagePath(imageFileName))
            return
        }

        function makeImagePath(fileName) {
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

    /**
     * create directory for image when directory does not exist
     */
    private createImageDirWithImagePath(imagePath: string) {
        return new Promise((resolve, reject) => {
            const imageDir = path.dirname(imagePath)

            fs.stat(imageDir, (error, stats) => {
                if (error === null) {
                    if (stats.isDirectory()) {
                        resolve(imagePath)
                    } else {
                        reject(new Error(`The image dest directory '${imageDir}' is a file. please check your 'pasteImage.path' config.`))
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

    private saveClipboardImageToFileAndGetPath(imagePath, cb: (imagePath: string, imagePathFromScript: string) => void) {
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
            powershell.on('exit', (code, signal) => {
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
            ascript.on('exit', (code, signal) => {
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
            ascript.on('exit', (code, signal) => {
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

    public renderImagePath(basePath: string, imageFilePath: string) : string {
        if (basePath) {
            imageFilePath = path.relative(basePath, imageFilePath)
        }

        const originalImagePath = imageFilePath
        const ext = path.extname(originalImagePath)
        const fileName = path.basename(originalImagePath)
        const fileNameWithoutExt = path.basename(originalImagePath, ext)

        if (this.encodePathConfig === 'urlEncode') {
            imageFilePath = encodeURI(imageFilePath)
        } else if (this.encodePathConfig === 'urlEncodeSpace') {
            imageFilePath = imageFilePath.replace(/ /g, '%20')
        }

        let result = this.pasteTemplate

        result = result.replace(this.PATH_VARIABLE_IMAGE_FILE_PATH, imageFilePath)
        result = result.replace(this.PATH_VARIABLE_IMAGE_ORIGINAL_FILE_PATH, originalImagePath)
        result = result.replace(this.PATH_VARIABLE_IMAGE_FILE_NAME, fileName)
        result = result.replace(this.PATH_VARIABLE_IMAGE_FILE_NAME_WITHOUT_EXT, fileNameWithoutExt)

        return result
    }

    public replacePathVariable(
        pathStr: string,
        projectRoot: string,
        curFilePath: string,
        postFunction: (string) => string = x => x
    ) : string {
        const currentFileDir = path.dirname(curFilePath)
        const ext = path.extname(curFilePath)
        const fileName = path.basename(curFilePath)
        const fileNameWithoutExt = path.basename(curFilePath, ext)
        let graphicsPath: string | string[] = this.extension.completer.input.graphicsPath
        if (graphicsPath.length === 0) {
            graphicsPath = this.graphicsPathFallback
        } else {
            graphicsPath = graphicsPath[0]
        }
        graphicsPath = path.resolve(currentFileDir, graphicsPath)

        pathStr = pathStr.replace(this.PATH_VARIABLE_GRAPHICS_PATH, postFunction(graphicsPath))
        pathStr = pathStr.replace(this.PATH_VARIABLE_CURRNET_FILE_DIR, postFunction(currentFileDir))
        pathStr = pathStr.replace(this.PATH_VARIABLE_CURRNET_FILE_NAME, postFunction(fileName))
        pathStr = pathStr.replace(this.PATH_VARIABLE_CURRNET_FILE_NAME_WITHOUT_EXT, postFunction(fileNameWithoutExt))
        return pathStr
    }
}
