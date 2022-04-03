import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import {latexParser} from 'latex-utensils'
import * as chokidar from 'chokidar'

import type {Extension} from '../../main'
import {Cacher} from './cache'
import * as utils from '../../utils/utils'
import {PathUtils} from '../managerlib/pathutils'

export class TexCacher extends Cacher<TexCache> {

    private readonly pathUtils: PathUtils

    constructor(extension: Extension, watcher: chokidar.FSWatcher, tag: string) {
        super(extension, watcher, tag)
        this.pathUtils = new PathUtils(extension)
    }

    protected async onChanged(file: string): Promise<void> {
        await super.onChanged(file)
        await this.parseFrom(file)
    }

    /**
     * Parse the AST and cache a tex-like file from disk content.
     * @param file Path to the tex-like file to be parsed
     * @returns parsed `TexCache`
     */
    async parse(file: string): Promise<TexCache> {
        const cache = this.cache[file] || new TexCache()
        // 1. Update cached content
        const content = fs.readFileSync(file).toString()
        cache.setContent(content)

        // 2. Update ast based on saved file
        const ast = await this.extension.pegParser.parseLatex(content)
        .catch((e) => {
            if (latexParser.isSyntaxError(e)) {
                const line = e.location.start.line
                this.extension.logger.addLogMessage(`Error parsing LaTeX: line ${line} in ${file}.`)
                this.extension.logger.addLogMessage(`Error: ${JSON.stringify(e)}`)
            }
            return undefined
        })
        cache.setAST(ast)

        // TODO: Call auto-build on file change
        // this.extension.manager.buildOnFileChanged(file, true)

        return cache
    }

    /**
     * Parse the AST and cache a tex-like file from vscode editor. This function
     * should be called sparsely as it parses AST of temporary content. However,
     * this function will check if the dirty content is changed to save effort.
     * @param file Path to the tex-like file to be parsed
     * @param content The dirty content to be parsed
     * @returns parsed `TexCache`
     */
    async parseDirty(file: string, content: string): Promise<TexCache> {
        const cache = this.cache[file] || Object.create(null) as TexCache
        // 0. If dirty content is not changed, just skip
        if (cache.getContent(true) === content) {
            return cache
        }

        // 1. Update cached dirty content with input
        cache.setContent(content, true)

        // 2. Update ast based on dirty content file
        const ast = await this.extension.pegParser.parseLatex(content)
        .catch((e) => {
            if (latexParser.isSyntaxError(e)) {
                const line = e.location.start.line
                this.extension.logger.addLogMessage(`Error parsing dirty LaTeX: line ${line} in ${file}.`)
                this.extension.logger.addLogMessage(`Error: ${JSON.stringify(e)}`)
            }
            return undefined
        })
        cache.setAST(ast, true)

        return cache
    }

    /**
     * This function parses a (sub-)doc tree from a given file. It can be the
     * root file or any tex-like file in the doc tree. This is done by
     * recursively calling `parseSubs` function, and orphaned tex-like files
     * are removed from cacher.
     * @param file The tex-like file to start parsing.
     */
    async parseFrom(file: string) {
        const filesParsed = new Set<string>()
        const filesToParse = [file]

        // Find all sub-files recursively. Here the sub-files are added to a
        // same list for processing. In this process, the sub-file hierarchy is
        // also updated.
        while(true) {
            const fileToParse = filesToParse.shift()
            if (!fileToParse) {
                break
            }
            if (filesParsed.has(fileToParse)) {
                continue
            }
            await this.parseSubs(fileToParse)
            filesParsed.add(fileToParse)
            this.cache[fileToParse].subFiles.forEach((sub) => filesToParse.push(sub))
        }

        // Recursively remove orphaned files. This is to handle cases with
        // independent sub-tree, where one-pass will only remove the top-level
        // one, and the total number of passes are undefined.
        let hasFileRemoved = true
        while(hasFileRemoved) {
            hasFileRemoved = false
            Object.keys(this.cache).forEach(candidate => {
                // Don't parse the starting file, which can be a root.
                if (candidate === file) {
                    return
                }
                if (this.cache[candidate].fromFiles.size === 0) {
                    // First remove the corresponding fromFile in sub-files
                    this.cache[candidate].subFiles.forEach((sub) => {
                        this.cache[sub].fromFiles.delete(candidate)
                    })
                    // Then remove the file from cache (and therefore watcher)
                    this.remove(candidate)
                    hasFileRemoved = true
                }
            })
        }
    }

    /**
     * This function parses a tex-like file and check its sub-files, including
     * tex-like files and bib files. For sub-files that have not been cached,
     * this function also caches them. This function is not a recursive one,
     * i.e., only the provided file will be checked.
     * @param file The file whose sub-files are being parsed
     */
    async parseSubs(file: string) {
        // If the file has not been cached, cache and parse AST
        if (!this.isCached(file)) {
            await this.add(file)
        }
        const ast = this.cache[file].getAST()
        if (!ast) {
            return
        }
        const flatAst = this.extension.pegParser.flatten(ast)

        // Populate the sub-file list
        const newSubFiles = new Set<string>()
        flatAst.map((node) => this.parseSubsFromNode(file, node))
        .forEach((candidate) => {
            if (candidate) {
                newSubFiles.add(candidate)
            }})

        // Populate the bib-file list
        this.cache[file].bibFiles.clear()
        flatAst.map((node) => this.parseBibsFromNode(file, node))
        .forEach((candidates) => {
            candidates?.forEach((candidate) => {
                if (candidate) {
                    this.cache[file].bibFiles.add(candidate)
                    this.extension.cacher.bib.add(candidate).catch(() => {})
                }})
        })

        // Add this file to the fromFile set of all sub-files. Here, those sub-
        // files that have not been cached will be cached.
        for (const sub of newSubFiles) {
            const cache = await this.get(sub, true)
            if (!cache) {
                return
            }
            cache.fromFiles.add(file)
        }

        // Compare new sub files and remove parents of whom misses
        for (const prevSubFile of this.cache[file].subFiles) {
            if (!newSubFiles.has(prevSubFile) && this.cache[prevSubFile]) {
                this.cache[prevSubFile].fromFiles.delete(file)
            }
        }
        this.cache[file].subFiles = newSubFiles

        // We don't uncache tex-like files with an empty parent list here. This
        // is because of the possibility that the list will be later populated
        // by other files.
    }

    private commandToArgs(node: latexParser.Command): string[] {
        const args: string[] = []
        node.args.forEach((arg) => {
            if (latexParser.isOptionalArg(arg)) {
                return
            }
            const argContent = arg.content[0]
            if (latexParser.isTextString(argContent)) {
                args.push(argContent.content)
            }
        })
        return args
    }

    private commandToOptionalArgs(node: latexParser.Command): string[] {
        const args: string[] = []
        node.args.forEach((arg) => {
            if (!latexParser.isOptionalArg(arg)) {
                return
            }
            const argContent = arg.content[0]
            if (latexParser.isTextString(argContent)) {
                args.push(argContent.content)
            }
        })
        return args
    }

    private parseSubsFromNode(file: string, node: latexParser.Node) {
        if (!latexParser.isCommand(node)) {
            return
        }
        const cmdArgs = this.commandToArgs(node)
        const texDirs = vscode.workspace.getConfiguration('latex-workshop').get('latex.texDirs') as string[]
        let candidate: string | undefined
        // \input{sub.tex}
        if (['input', 'InputIfFileExists', 'include', 'SweaveInput',
             'subfile', 'loadglsentries'].indexOf(node.name) > -1) {
            candidate = utils.resolveFile(
                [path.dirname(file),
                 path.dirname(this.extension.manager.rootFile || ''),
                 ...texDirs],
                cmdArgs[0])
        }
        // \import{sections/}{section1.tex}
        if (['import', 'inputfrom', 'includefrom'].indexOf(node.name) > -1) {
            candidate = utils.resolveFile(
                [cmdArgs[0],
                 path.join(
                    path.dirname(this.extension.manager.rootFile || ''),
                    cmdArgs[0])],
                cmdArgs[1])
        }
        // \subimport{01-IntroDir/}{01-Intro.tex}
        if (['subimport', 'subinputfrom', 'subincludefrom'].indexOf(node.name) > -1) {
            candidate = utils.resolveFile(
                [path.dirname(file)],
                path.join(cmdArgs[0], cmdArgs[1]))
        }

        return candidate
    }

    private parseBibsFromNode(file: string, node: latexParser.Node) {
        if (!latexParser.isCommand(node)) {
            return
        }
        const candidates: string[] = []
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const bibDirs = configuration.get('latex.bibDirs') as string[]
        const candidateDirs = [path.dirname(file), ...bibDirs]
        if (this.extension.manager.rootDir) {
            candidateDirs.push(this.extension.manager.rootDir)
        }
        let args: string[] = []
        // \bibliography{bib1, bib2}
        if (['bibliography', 'addbibresource'].indexOf(node.name) > -1) {
            args = this.commandToArgs(node)
        }
        // \putbib[bib1,bib2]
        if (['putbib'].indexOf(node.name) > -1) {
            args = this.commandToOptionalArgs(node)
        }
        if (args.length === 0) {
            return undefined
        }
        args[0].split(',').forEach((bib) => {
            const candidate = this.pathUtils.resolveBibPath(bib, path.dirname(file))
            if (candidate) {
                candidates.push(candidate)
            }
        })

        return candidates
    }
}

class TexCache {
    // The dirty content in vscode. Undefined means no dirty content.
    private contentDirty: string | undefined

    // The saved content on disk
    private contentSaved: string = ''

    // Dirty content split into lines. Undefined means no dirty content.
    private linesDirty: string[] | undefined

    // Saved content split into lines
    private linesSaved: string[] = ['']

    // AST parsed from dirty content. Undefined means parser error or no dirty.
    private astDirty: latexParser.LatexAst | undefined

    // AST parsed from saved content. Undefined means parser error.
    private astSaved: latexParser.LatexAst | undefined

    // The other tex-likes that includes this tex-like.
    readonly fromFiles = new Set<string>()

    // The other tex-likes that this file includes.
    subFiles = new Set<string>()

    // The other bib files that this file includes.
    readonly bibFiles = new Set<string>()

    /**
     * @param content The content to be cached
     * @param dirty Whether the content is saved or dirty in editor
     */
    setContent(content: string, dirty: boolean = false) {
        if (dirty) {
            this.contentDirty = content
            this.linesDirty = content.split('\n')
        } else {
            this.contentSaved = content
            this.linesSaved = content.split('\n')
        }
    }
    getContent(dirty: boolean = false) {
        return dirty ? this.contentDirty : this.contentSaved
    }
    getLines(dirty: boolean = false) {
        return dirty ? this.linesDirty : this.linesSaved
    }

    /**
     * @param ast The AST to be cached
     * @param dirty Whether the AST is based on saved or dirty content in editor
     */
    setAST(ast: latexParser.LatexAst | undefined, dirty: boolean = false) {
        if (dirty) {
            this.astDirty = ast
        } else {
            this.astSaved = ast
        }
    }
    getAST(dirty: boolean = false) {
        return dirty ? this.astDirty : this.astSaved
    }

    /**
     * Reset the dirty content of a tex-like file. This function should be
     * called when the dirty content is discarded or saved.
     * @param file Path to the tex-like file whose dirty content is to be reset
     */
    resetDirty() {
        this.contentDirty = undefined
        this.linesDirty = undefined
        this.astDirty = undefined
    }
}
