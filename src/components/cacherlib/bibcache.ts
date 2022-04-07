import * as vscode from 'vscode'
import * as fs from 'fs'
import {bibtexParser} from 'latex-utensils'
import * as chokidar from 'chokidar'

import type {Extension} from '../../main'
import {Cacher} from './cache'
import { Section } from '../../providers/structure'
import { SectionNodeProvider } from '../../providers/structure'

export class BibCacher extends Cacher<BibCache> {

    private readonly sectionNodeProvider: SectionNodeProvider

    constructor(extension: Extension, watcher: chokidar.FSWatcher, tag: string) {
        super(extension, watcher, tag)
        this.sectionNodeProvider = new SectionNodeProvider(extension)
    }

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

    protected async toSections(file: string): Promise<Section[] | undefined> {
        const cache = this.cache[file]
        if (cache && cache.astSaved) {
            cache.secSaved = await this.sectionNodeProvider.buildBibTeXModel(file)
            return cache.secSaved
        }
        return undefined
    }
}

export type BibCache = {
    // The saved content on disk
    contentSaved: string,

    // Saved content split into lines
    linesSaved: string[],

    // AST parsed from saved content. Undefined means over-sized bib file
    astSaved: bibtexParser.BibtexAst | undefined,

    // Outline sections parsed from saved content.
    secSaved: Section[] | undefined
}
