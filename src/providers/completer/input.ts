import * as vscode from 'vscode'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as micromatch from 'micromatch'
import * as cp from 'child_process'
import * as utils from '../../utils/utils'

import {Extension} from '../../main'
import {IProvider} from './interface'

const ignoreFiles = ['**/.vscode', '**/.vscodeignore', '**/.gitignore']

export class Input implements IProvider {
    private extension: Extension
    graphicsPath: string[] = []

    constructor(extension: Extension) {
        this.extension = extension
    }

    private filterIgnoredFiles(files: string[], baseDir: string): string[] {
        const excludeGlob = (Object.keys(vscode.workspace.getConfiguration('files', null).get('exclude') || {})).concat(vscode.workspace.getConfiguration('latex-workshop').get('intellisense.file.exclude') || [] ).concat(ignoreFiles)
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
            if ((gitIgnoredFiles.includes(file)) || micromatch.any(filePath, excludeGlob, {basename: true})) {
                return false
            } else {
                return true
            }
        })
    }

    getGraphicsPath(filePath: string) {
        const content = utils.stripComments(fs.readFileSync(filePath, 'utf-8'), '%')
        const regex = /\\graphicspath{[\s\n]*((?:{[^{}]*}[\s\n]*)*)}/g
        let result: string[] | null
        do {
            result = regex.exec(content)
            if (result) {
                for (const dir of result[1].split(/\{|\}/).filter(s => s.replace(/^\s*$/, ''))) {
                    if (this.graphicsPath.includes(dir)) {
                        continue
                    }
                    this.graphicsPath.push(dir)
                }
            }
        } while (result)
    }

    reset() {
        this.graphicsPath = []
    }

    provideFrom(type: string, result: RegExpMatchArray, args: {document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext}) {
        const payload = [type, args.document.fileName, result[1], ...result.slice(2).reverse()]
        return this.provide(payload)
    }

    /**
     * Provide file name intellissense
     *
     * @param payload an array of string
     *      payload[0]: the input command type  (input, import, subimport, includeonly)
     *      payload[1]: the current file name
     *      payload[2]: When defined, the path from which completion is triggered
     *      payload[3]: The already typed path
     */
    private provide(payload: string[]): vscode.CompletionItem[] {
        let provideDirOnly = false
        let baseDir: string[] = []
        const mode = payload[0]
        const currentFile = payload[1]
        const command = payload[2]
        const typedFolder = payload[3]
        const importfromDir = payload[4]
        switch (mode) {
            case 'import':
                if (importfromDir) {
                    baseDir = [importfromDir]
                } else {
                    baseDir = ['/']
                    provideDirOnly = true
                }
                break
            case 'subimport':
                if (importfromDir) {
                    baseDir = [path.join(path.dirname(currentFile), importfromDir)]
                } else {
                    baseDir = [path.dirname(currentFile)]
                    provideDirOnly = true
                }
                break
            case 'includeonly':
            case 'input': {
                if (this.extension.manager.rootDir === undefined) {
                    this.extension.logger.addLogMessage(`No root dir can be found. The current root file should be undefined, is ${this.extension.manager.rootFile}. How did you get here?`)
                    break
                }
                // If there is no root, 'root relative' and 'both' should fall back to 'file relative'
                const rootDir = this.extension.manager.rootDir
                if (command === 'includegraphics' && this.graphicsPath.length > 0) {
                    baseDir = this.graphicsPath.map(dir => path.join(rootDir, dir))
                } else {
                    const baseConfig = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.file.base')
                    const baseDirCurrentFile = path.dirname(currentFile)
                    switch (baseConfig) {
                        case 'root relative':
                            baseDir = [rootDir]
                            break
                        case 'file relative':
                            baseDir = [baseDirCurrentFile]
                            break
                        case 'both':
                            if (baseDirCurrentFile !== rootDir) {
                                baseDir = [baseDirCurrentFile, rootDir]
                            } else {
                                baseDir = [rootDir]
                            }
                            break
                        default:
                    }
                }
                break
            }
            default:
                return []
        }

        const suggestions: vscode.CompletionItem[] = []
        baseDir.forEach(dir => {
            if (typedFolder !== '') {
                let currentFolder = typedFolder
                if (! typedFolder.endsWith('/')) {
                    currentFolder = path.dirname(typedFolder)
                }
                dir = path.resolve(dir, currentFolder)
            }
            try {
                let files = fs.readdirSync(dir)
                files = this.filterIgnoredFiles(files, dir)

                files.forEach(file => {
                    const filePath = path.resolve(dir, file)
                    if (dir === '/') {
                        // Keep the leading '/' to have an absolute path
                        file = '/' + file
                    }

                    if (fs.lstatSync(filePath).isDirectory()) {
                        const item = new vscode.CompletionItem(`${file}/`, vscode.CompletionItemKind.Folder)
                        item.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
                        item.detail = dir
                        suggestions.push(item)
                    } else if (! provideDirOnly) {
                        const item = new vscode.CompletionItem(file, vscode.CompletionItemKind.File)
                        const preview = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.includegraphics.preview.enabled') as boolean
                        if (preview && command === 'includegraphics') {
                            item.documentation = filePath
                        }
                        item.detail = dir
                        suggestions.push(item)
                    }
                })
            } catch (error) {}
        })
        return suggestions
    }
}
