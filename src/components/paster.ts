import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as fse from 'fs-extra'
import { spawn } from 'child_process'
import * as moment from 'moment'

import { Extension } from '../main'

// credit to https://github.com/mushanshitiancai/vscode-paste-image/
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

    public paste() {
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

                    imagePath = this.renderFilePath(this.basePathConfig, imagePath)

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

    public renderFilePath(basePath: string, imageFilePath: string) : string {
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
