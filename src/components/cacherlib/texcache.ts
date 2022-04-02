import * as fs from 'fs'
import {latexParser} from 'latex-utensils'

import {Cacher} from './cache'

export class TexCacher extends Cacher<TexCache> {

    /**
     * Parse the AST and cache a tex-like file from disk content.
     * @param file Path to the tex-like file to be parsed
     * @returns parsed `TexCache`
     */
    async parse(file: string): Promise<TexCache> {
        const cache = this.cache[file] || Object.create(null) as TexCache
        // 1. Update cached content
        const content = fs.readFileSync(file).toString()
        cache.contentSaved = content
        cache.linesSaved = content.split('\n')

        // 2. Update ast based on saved file
        cache.astSaved = await this.extension.pegParser.parseLatex(content)
        .catch((e) => {
            if (latexParser.isSyntaxError(e)) {
                const line = e.location.start.line
                this.extension.logger.addLogMessage(`Error parsing LaTeX: line ${line} in ${file}.`)
                this.extension.logger.addLogMessage(`Error: ${JSON.stringify(e)}`)
            }
            return undefined
        })

        // TODO: Call auto-build on file change
        // this.extension.manager.buildOnFileChanged(file, true)

        return cache
    }

    async parseDirty(file: string, content: string): Promise<TexCache> {
        const cache = this.cache[file] || Object.create(null) as TexCache
        // 1. Update cached dirty content with input
        cache.contentDirty = content
        cache.linesDirty = content.split('\n')

        // 2. Update ast based on saved file
        cache.astSaved = await this.extension.pegParser.parseLatex(content)
        .catch((e) => {
            if (latexParser.isSyntaxError(e)) {
                const line = e.location.start.line
                this.extension.logger.addLogMessage(`Error parsing dirty LaTeX: line ${line} in ${file}.`)
                this.extension.logger.addLogMessage(`Error: ${JSON.stringify(e)}`)
            }
            return undefined
        })

        // TODO: Call auto-build on file change
        // this.extension.manager.buildOnFileChanged(file, true)

        return cache
    }
}

type TexCache = {
    // The dirty content in vscode
    contentDirty: string,

    // The saved content on disk
    contentSaved: string,

    // Dirty content split into lines
    linesDirty: string[],

    // Saved content split into lines
    linesSaved: string[],

    // AST parsed from saved content. Undefined means parser error
    astDirty: latexParser.LatexAst | undefined,

    // AST parsed from saved content. Undefined means parser error
    astSaved: latexParser.LatexAst | undefined
}
