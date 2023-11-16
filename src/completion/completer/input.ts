import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as micromatch from 'micromatch'
import * as lw from '../../lw'
import type { IProvider, IProviderArgs } from '../latex'

import { getLogger } from '../../utils/logging/logger'
import type { Cache } from '../../core/cache'

const logger = getLogger('Intelli', 'Input')

const ignoreFiles = ['**/.vscode', '**/.vscodeignore', '**/.gitignore']

abstract class InputAbstract implements IProvider {
    graphicsPath: Set<string> = new Set()

    /**
     * Compute the base directory for file completion
     *
     * @param currentFile current file path
     * @param importFromDir `From` argument of the import command
     * @param command The command which triggered the completion
     */
    abstract getBaseDir(currentFile: string, importFromDir: string, command: string): string[]

    /**
     * Do we only list directories?
     *
     * @param importFromDir `From` argument of the import command
     */
    abstract provideDirOnly(importFromDir: string): boolean


    /**
     * Filter a list of completion paths
     *
     * @param document The textDocumt from which the filtering was launch
     * @param files The list of files to filter
     * @param baseDir The base directory to resolve paths from
     */
    private filterIgnoredFiles(uri: vscode.Uri, files: string[], baseDir: string): string[] {
        const excludeGlob = (Object.keys(vscode.workspace.getConfiguration('files', null).get('exclude') || {})).concat(vscode.workspace.getConfiguration('latex-workshop', uri).get('intellisense.file.exclude') || [] ).concat(ignoreFiles)
        return files.filter(file => {
            const filePath = path.resolve(baseDir, file)
            return !micromatch.isMatch(filePath, excludeGlob, {basename: true})
        })
    }

    /**
     * Set the graphics path
     */
    parseGraphicsPath(cache: Cache) {
        const regex = /\\graphicspath{[\s\n]*((?:{[^{}]*}[\s\n]*)*)}/g
        let result: string[] | null
        while (true) {
            result = regex.exec(cache.contentTrimmed)
            if (result === null) {
                break
            }
            result[1].split(/\{|\}/).filter(s => s.replace(/^\s*$/, '')).forEach(dir => this.graphicsPath.add(dir))
        }
    }

    reset() {
        this.graphicsPath.clear()
    }

    provideFrom(result: RegExpMatchArray, args: IProviderArgs) {
        const command = result[1]
        const payload = [...result.slice(2).reverse()]
        return this.provide(args.uri, args.line, args.position, command, payload)
    }

    /**
     * Provide file name intellisense
     *
     * @param payload an array of string
     *      payload[0]: The already typed path
     *      payload[1]: The path from which completion is triggered, may be empty
     */
    private provide(uri: vscode.Uri, line: string, position: vscode.Position, command: string, payload: string[]): vscode.CompletionItem[] {
        const currentFile = uri.fsPath
        const typedFolder = payload[0]
        const importFromDir = payload[1]
        const startPos = Math.max(line.lastIndexOf('{', position.character), line.lastIndexOf('/', position.character))
        const range: vscode.Range | undefined = startPos >= 0 ? new vscode.Range(position.line, startPos + 1, position.line, position.character) : undefined
        const baseDir: string[] = this.getBaseDir(currentFile, importFromDir, command)
        const provideDirOnly: boolean = this.provideDirOnly(importFromDir)

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
                files = this.filterIgnoredFiles(uri, files, dir)

                files.forEach(file => {
                    const filePath = path.resolve(dir, file)
                    if (dir === '/') {
                        // Keep the leading '/' to have an absolute path
                        file = '/' + file
                    }

                    if (fs.lstatSync(filePath).isDirectory()) {
                        const item = new vscode.CompletionItem(`${file}/`, vscode.CompletionItemKind.Folder)
                        item.range = range
                        item.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' }
                        item.detail = dir
                        suggestions.push(item)
                    } else if (! provideDirOnly) {
                        const item = new vscode.CompletionItem(file, vscode.CompletionItemKind.File)
                        const preview = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.includegraphics.preview.enabled') as boolean
                        if (preview && ['includegraphics', 'includesvg'].includes(command)) {
                            item.documentation = filePath
                        }
                        item.range = range
                        item.detail = dir
                        if (['include', 'includeonly', 'excludeonly'].includes(command)) {
                            item.insertText = path.parse(file).name
                        }
                        suggestions.push(item)
                    }
                })
            } catch (error) {}
        })
        return suggestions
    }
}

export class Input extends InputAbstract {
    provideDirOnly(_importFromDir: string): boolean {
        return false
    }

    getBaseDir(currentFile: string, _importFromDir: string, command: string): string[] {
        let baseDir: string[] = []
        if (lw.manager.rootDir === undefined) {
            logger.log(`No root dir can be found. The current root file should be undefined, is ${lw.manager.rootFile}. How did you get here?`)
            return []
        }
        // If there is no root, 'root relative' and 'both' should fall back to 'file relative'
        const rootDir = lw.manager.rootDir
        if (['includegraphics', 'includesvg'].includes(command) && this.graphicsPath.size > 0) {
            baseDir = Array.from(this.graphicsPath).map(dir => path.join(rootDir, dir))
        } else {
            const baseConfig = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(currentFile)).get('intellisense.file.base')
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
        return baseDir
    }
}

export class Import extends InputAbstract {
    provideDirOnly(importFromDir: string): boolean {
        return (!importFromDir)
    }

    getBaseDir(_currentFile: string, importFromDir: string, _command: string): string[] {
        if (importFromDir) {
            return [importFromDir]
        } else {
            return ['/']
        }
    }
}


export class SubImport extends InputAbstract {
    provideDirOnly(importFromDir: string): boolean {
        return (!importFromDir)
    }


    getBaseDir(currentFile: string, importFromDir: string, _command: string): string[] {
        if (importFromDir) {
            return [path.join(path.dirname(currentFile), importFromDir)]
        } else {
            return [path.dirname(currentFile)]
        }
    }
}
