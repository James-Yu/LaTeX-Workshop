import * as vscode from 'vscode'
import { EOL } from 'os'
import type { Extension } from '../main'
import * as path from 'path'

export class TeXMagician {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    getFileName(file: string): string {
        const segments = file.replace(/\\/g, '/').match(/([^/]+$)/)
        if (segments) {
            return segments[0]
        }
        return ''
    }

    addTexRoot() {
        // taken from here: https://github.com/DonJayamanne/listFilesVSCode/blob/master/src/extension.ts (MIT licensed, should be fine)
        void vscode.workspace.findFiles('**/*.{tex}').then(files => {
            const displayFiles = files.map(file => {
                return { description: file.fsPath, label: this.getFileName(file.fsPath), filePath: file.fsPath }
            })
            void vscode.window.showQuickPick(displayFiles).then(val => {
                const editor = vscode.window.activeTextEditor
                if (!(val && editor)) {
                    return
                }
                const relativePath = path.relative(path.dirname(editor.document.fileName), val.filePath)
                const magicComment = `% !TeX root = ${relativePath}`
                const line0 = editor.document.lineAt(0).text
                const edits = [(line0.match(/^\s*%\s*!TeX root/gmi)) ?
                    vscode.TextEdit.replace(new vscode.Range(0, 0, 0, line0.length), magicComment)
                :
                    vscode.TextEdit.insert(new vscode.Position(0, 0), magicComment + EOL)
                ]
                // Insert the text
                const uri = editor.document.uri
                const edit = new vscode.WorkspaceEdit()
                edit.set(uri, edits)
                void vscode.workspace.applyEdit(edit)
            })
        })
    }
}
