import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

import type { CmdEnvSuggestion } from '../providers/completer/completerutils'
import type { CiteSuggestion } from '../providers/completer/citation'
import type { GlossarySuggestion } from '../providers/completer/glossary'
import type { ICompletionItem } from '../providers/completion'

import { Extension } from '../main'
import * as eventbus from './eventbus'
import * as utils from '../utils/utils'
import { InputFileRegExp } from '../utils/inputfilepath'

/**
 * The content cache for each LaTeX file `filepath`.
 */
export interface Content {
    [filepath: string]: { // The path of a LaTeX file.
        /**
         * The dirty (under editing) content of the LaTeX file if opened in vscode,
         * the content on disk otherwise.
         */
        content: string | undefined,
        /**
         * Completion item and other items for the LaTeX file.
         */
        element: {
            reference?: ICompletionItem[],
            glossary?: GlossarySuggestion[],
            environment?: CmdEnvSuggestion[],
            bibitem?: CiteSuggestion[],
            command?: CmdEnvSuggestion[],
            package?: {[packageName: string]: string[]}
        },
        /**
         * The sub-files of the LaTeX file. They should be tex or plain files.
         */
        children: {
            /**
             * The index of character sub-content is inserted
             */
            index: number,
            /**
             * The path of the sub-file
             */
            file: string
        }[],
        /**
         * The array of the paths of `.bib` files referenced from the LaTeX file.
         */
        bibs: string[]
    }
}

export class Cacher {
    /**
     * The content cache for each LaTeX file.
     */
    private readonly cachedContent = Object.create(null) as Content

    constructor(private readonly extension: Extension) {
    }

    /**
     * Get the buffer content of a file if it is opened in vscode. Otherwise, read the file from disk
     */
    getDirtyContent(file: string): string | undefined {
        const cache = this.cachedContent[file]
        if (cache !== undefined) {
            if (cache.content) {
                return cache.content
            }
        }
        const fileContent = this.extension.lwfs.readFileSyncGracefully(file)
        if (fileContent === undefined) {
            this.extension.logger.addLogMessage(`Cannot read dirty content of unknown ${file}`)
        }
        this.cachedContent[file] = {content: fileContent, element: {}, children: [], bibs: []}
        return fileContent
    }

    getCachedContent(filePath: string): Content[string] {
        if (!(filePath in this.cachedContent)) {
            this.getDirtyContent(filePath)
        }
        return this.cachedContent[filePath]
    }

    removeCachedContent(filePath: string) {
        if (filePath in this.cachedContent) {
            delete this.cachedContent[filePath]
        }
    }

    get cachedFilePaths() {
        return Object.keys(this.cachedContent)
    }

    updateCachedContent(document: vscode.TextDocument) {
        const cache = this.getCachedContent(document.fileName)
        if (cache !== undefined) {
            cache.content = document.getText()
        }
        this.extension.eventBus.fire(eventbus.CacheUpdated)
    }

    /**
     * Return a string array which holds all imported bib files
     * from the given tex `file`. If `file` is `undefined`, traces from the
     * root file, or return empty array if the root file is `undefined`
     *
     * @param file The path of a LaTeX file
     */
    getIncludedBib(file?: string, includedBib: string[] = [], children: string[] = []): string[] {
        if (file === undefined) {
            file = this.extension.manager.rootFile
        }
        if (file === undefined) {
            return []
        }
        if (!this.cachedFilePaths.includes(file)) {
            return []
        }
        children.push(file)
        const cache = this.getCachedContent(file)
        includedBib.push(...cache.bibs)
        for (const child of cache.children) {
            if (children.includes(child.file)) {
                // Already parsed
                continue
            }
            this.getIncludedBib(child.file, includedBib)
        }
        // Make sure to return an array with unique entries
        return Array.from(new Set(includedBib))
    }

    /**
     * Return a string array which holds all imported tex files
     * from the given `file` including the `file` itself.
     * If `file` is `undefined`, trace from the * root file,
     * or return empty array if the root file is `undefined`
     *
     * @param file The path of a LaTeX file
     */
    getIncludedTeX(file?: string, includedTeX: string[] = []): string[] {
        if (file === undefined) {
            file = this.extension.manager.rootFile
        }
        if (file === undefined) {
            return []
        }
        if (!this.cachedFilePaths.includes(file)) {
            return []
        }
        includedTeX.push(file)
        for (const child of this.getCachedContent(file).children) {
            if (includedTeX.includes(child.file)) {
                // Already included
                continue
            }
            this.getIncludedTeX(child.file, includedTeX)
        }
        return includedTeX
    }

    /**
     * Return the list of files (recursively) included in `file`
     *
     * @param file The file in which children are recursively computed
     * @param baseFile The file currently considered as the rootFile
     * @param children The list of already computed children
     * @param content The content of `file`. If undefined, it is read from disk
     */
    getTeXChildren(file: string, baseFile: string, children: string[], content?: string): string[] {
        if (content === undefined) {
            content = utils.stripCommentsAndVerbatim(fs.readFileSync(file).toString())
        }

        // Update children of current file
        if (!this.cachedFilePaths.includes(file)) {
            this.getDirtyContent(file)
            const cache = this.getCachedContent(file)
            cache.content = content
            const inputFileRegExp = new InputFileRegExp()
            while (true) {
                const result = inputFileRegExp.exec(content, file, baseFile)
                if (!result) {
                    break
                }

                if (!fs.existsSync(result.path) ||
                    path.relative(result.path, baseFile) === '') {
                    continue
                }

                cache.children.push({
                    index: result.match.index,
                    file: result.path
                })
            }
        }

        this.getCachedContent(file).children.forEach(child => {
            if (children.includes(child.file)) {
                // Already included
                return
            }
            children.push(child.file)
            this.getTeXChildren(child.file, baseFile, children)
        })
        return children
    }
}
