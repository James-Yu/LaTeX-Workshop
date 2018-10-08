import * as vscode from 'vscode'
import * as fs from 'fs-extra'
import * as path from 'path'

import {Extension} from '../../main'

export class Input {
    extension: Extension
    provideRefreshTime: number

    constructor(extension: Extension) {
        this.extension = extension
    }

    provide(payload) : vscode.CompletionItem[] {
        const mode = payload[0]
        const currentFile = payload[1]
        const typedFolder = payload[2]
        const suggestions: vscode.CompletionItem[] = []
        let baseDir
        if (mode === 'include') {
            baseDir = path.dirname(currentFile)
        } else {
            baseDir = path.dirname(this.extension.manager.rootFile)
        }
        if (typedFolder !== '') {
            baseDir = path.join(baseDir, typedFolder)
        }
        try {
            const files = fs.readdirSync(baseDir)
            files.forEach(file => {
                if (fs.lstatSync(path.join(baseDir, file)).isDirectory()) {
                    const item = new vscode.CompletionItem(`${file}${path.sep}`, vscode.CompletionItemKind.Folder)
                    item.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
                    suggestions.push(item)
                } else {
                    suggestions.push(new vscode.CompletionItem(file, vscode.CompletionItemKind.File))
                }
            })
        } catch (error) {}
        return suggestions
    }
}
