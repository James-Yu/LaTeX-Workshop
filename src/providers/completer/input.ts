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

    filterIgnoredFiles(files: string[], baseDir: string) : string[] {
        const excludeGlob = (Object.keys(vscode.workspace.getConfiguration('files', null).get('exclude') || {})).concat(ignoreFiles)
        let gitIgnoredFiles: string[] = []
        /* Check .gitignore if needed */
        if (vscode.workspace.getConfiguration('search', null).get('useIgnoreFiles')) {
            try {
                gitIgnoredFiles = (cp.execSync('git check-ignore ' + files.join(' '), {cwd: baseDir})).toString().split('\n')
            } catch (ex) { }
        }
        return files.filter(file => {
            const filePath = path.resolve(baseDir, file)
            /* Check if the file should be ignored */
            if ((gitIgnoredFiles.indexOf(file) > -1) || micromatch.any(filePath, excludeGlob, {basename: true})) {
                return false
            } else {
                return true
            }
        })
    }

    provide(payload: string[]) : vscode.CompletionItem[] {
        let baseDir: string = ''
        const mode = payload[0]
        const currentFile = payload[1]
        const importfromDir = payload[2]
        const typedFolder = payload[3]
        if (mode.match(/^(?:import|includefrom|inputfrom)\*?$/)) {
            if(importfromDir) {
                baseDir = importfromDir
            } else {
                baseDir = '/'
            }
        } else if (mode.match(/^(?:sub)(?:import|includefrom|inputfrom)\*?$/)) {
            if(importfromDir) {
                baseDir = path.join(path.dirname(currentFile), importfromDir)
            } else {
                baseDir = path.dirname(currentFile)
            }
        } else if (mode.match(/^(?:input|include|subfile|includegraphics)$/)) {
            baseDir = path.dirname(this.extension.manager.rootFile)
        }
        const suggestions: vscode.CompletionItem[] = []
        if (typedFolder !== '') {
            baseDir = path.resolve(baseDir, typedFolder)
        }
        try {
            let files = fs.readdirSync(baseDir)
            files = this.filterIgnoredFiles(files, baseDir)

            files.forEach(file => {
                const filePath = path.resolve(baseDir, file)
                if (baseDir === '/') {
                    // Keep the leading '/' to have an absolute path
                    file = '/' + file
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
