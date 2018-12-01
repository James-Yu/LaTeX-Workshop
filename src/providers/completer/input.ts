import * as vscode from 'vscode'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as micromatch from 'micromatch'
import * as cp from 'child_process'

import {Extension} from '../../main'

const ignoreFiles = ['**/.vscode', '**/.vscodeignore', '**/.gitignore']

export class Input {
    extension: Extension
    provideRefreshTime: number

    constructor(extension: Extension) {
        this.extension = extension
    }

    provide(payload: string[]) : vscode.CompletionItem[] {
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
            const excludeGlob = (Object.keys(vscode.workspace.getConfiguration('files', null).get('exclude') || {})).concat(ignoreFiles)
            let gitIgnoredFiles: string[] = []
            /* Check .gitignore if needed */
            if (vscode.workspace.getConfiguration('search', null).get('useIgnoreFiles')) {
                try {
                    gitIgnoredFiles = (cp.execSync('git check-ignore ' + files.join(' '), {cwd: baseDir})).toString().split('\n')
                } catch (ex) { }
            }

            files.forEach(file => {
                const filePath = path.join(baseDir, file)
                /* Check if the file should be ignored */
                if ((gitIgnoredFiles.indexOf(file) > -1) || micromatch.any(filePath, excludeGlob, {basename: true})) {
                    return
                }

                if (fs.lstatSync(filePath).isDirectory()) {
                    const item = new vscode.CompletionItem(`${file}/`, vscode.CompletionItemKind.Folder)
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
