import * as vscode from 'vscode'
import {EOL} from 'os'
import {Extension} from '../main'

export class TeXMagician {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    getFileName(file: string) : string {
        return file.replace(/\\/g, '/').match(/([^\/]+$)/)[0]
    }

    getRelativePath(file: string, currentFile: string) : string {
        // replace '\' in windows paths with '/'
        file = file.replace(/\\/g, '/')
        // get path of current folder, including to the last '/'
        let currentFolder = currentFile.replace(/\\/g, '/').replace(/[^\/]+$/gi, '')
        // find index up to which paths match
        let i = 0
        while ( file.charAt(i) === currentFolder.charAt(i)) {
            i++
        }
        // select nonmatching substring
        file = file.substring(i)
        currentFolder = currentFolder.substring(i)
        // replace each '/foldername/' in path with '/../'
        currentFolder = currentFolder.replace(/[^/]+/g, '..')
        return './' + currentFolder + file
    }

    addroot() {
        // taken from here: https://github.com/DonJayamanne/listFilesVSCode/blob/master/src/extension.ts (MIT licensed, should be fine)
        vscode.workspace.findFiles('**/*.{tex}').then(files => {
            const displayFiles = files.map(file => {
                return { description: file.fsPath, label: this.getFileName(file.fsPath), filePath: file.fsPath }
            })
            vscode.window.showQuickPick(displayFiles).then(val => {
                const editor = vscode.window.activeTextEditor
                if (val != null && editor != null) {
                    const relativePath = this.getRelativePath(val.filePath, editor.document.fileName)
                    const edits = [vscode.TextEdit.insert(new vscode.Position(0, 0), `% !TeX root = ${relativePath}${EOL}`)]
                    // Insert the text
                    const uri = editor.document.uri
                    const edit = new vscode.WorkspaceEdit()
                    edit.set(uri, edits)
                    vscode.workspace.applyEdit(edit)
                }
            })
        })
    }
}
