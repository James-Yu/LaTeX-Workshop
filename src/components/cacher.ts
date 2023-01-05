import * as vscode from 'vscode'

import type { CmdEnvSuggestion } from '../providers/completer/completerutils'
import type { CiteSuggestion } from '../providers/completer/citation'
import type { GlossarySuggestion } from '../providers/completer/glossary'
import type { ICompletionItem } from '../providers/completion'

import { Extension } from '../main'
import * as eventbus from './eventbus'

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
}
