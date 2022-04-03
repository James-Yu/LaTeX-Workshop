import * as vscode from 'vscode'
import * as fs from 'fs'
import {bibtexParser} from 'latex-utensils'

import {Cacher} from './cache'

export class BibCacher extends Cacher<BibCache> {

    /**
     * Parse the AST and cache a bib file from disk content.
     * @param file Path to the bib file to be parsed
     * @returns parsed `BibCache`
     */
    async parse(file: string): Promise<BibCache> {
        const cache = this.cache[file] || Object.create(null) as BibCache
        // 1. Update cached content
        const content = fs.readFileSync(file).toString()
        cache.contentSaved = content
        cache.linesSaved = content.split('\n')

        // 2. Check the file size to avoid long parsing time, then update ast
        cache.astSaved = undefined
        const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(file))
        const maxFileSize = configuration.get('bibtex.maxFileSize') as number
        const fileSize = fs.statSync(file).size / 1024 / 1024
        if (fileSize > maxFileSize) {
            this.extension.logger.addLogMessage(`Bib file size ${fileSize.toFixed(2)}MB > ${maxFileSize}MB: ${file}`)
        } else {
            cache.astSaved = await this.extension.pegParser.parseBibtex(content)
            .catch((e) => {
                if (bibtexParser.isSyntaxError(e)) {
                    const line = e.location.start.line
                    this.extension.logger.addLogMessage(`Error parsing BibTeX: line ${line} in ${file}.`)
                    this.extension.logger.addLogMessage(`Error: ${JSON.stringify(e)}`)
                }
                return undefined
            })
        }

        // TODO: Call auto-build on file change
        // this.extension.manager.buildOnFileChanged(file, true)

        return cache
    }
}

export type BibCache = {
    // The dirty content in vscode
    // contentDirty: string,

    // The saved content on disk
    contentSaved: string,

    // Dirty content split into lines
    // linesDirty: string[],

    // Saved content split into lines
    linesSaved: string[],

    // AST parsed from saved content. Undefined means over-sized bib file
    astSaved: bibtexParser.BibtexAst | undefined
}
