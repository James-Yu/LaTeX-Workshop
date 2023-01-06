import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { latexParser } from 'latex-utensils'

import type { CmdEnvSuggestion } from '../providers/completer/completerutils'
import type { CiteSuggestion } from '../providers/completer/citation'
import type { GlossarySuggestion } from '../providers/completer/glossary'
import type { ICompletionItem } from '../providers/completion'

import { Extension } from '../main'
import * as eventbus from './eventbus'
import * as utils from '../utils/utils'
import { InputFileRegExp } from '../utils/inputfilepath'
import { canContext, isExcluded, parseFlsContent } from './cacherlib/cacherutils'
import { PathUtils } from './cacherlib/pathutils'
import { Watcher } from './cacherlib/texwatcher'
import { PdfWatcher } from './cacherlib/pdfwatcher'
import { BibWatcher } from './cacherlib/bibwatcher'

export interface Context {
    /**
     * The dirty (under editing) content of the LaTeX file if opened in vscode,
     * the content on disk otherwise.
     */
    content: string | undefined,
    /**
     * Completion item and other items for the LaTeX file.
     */
    elements: {
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
    bibfiles: string[]
}

export class Cacher {
    private readonly contexts: {[filePath: string]: Context} = {}
    private readonly watcher: Watcher = new Watcher(this.extension, this)
    private readonly pdfWatcher: PdfWatcher = new PdfWatcher(this.extension)
    private readonly bibWatcher: BibWatcher = new BibWatcher(this.extension)
    private readonly pathUtils: PathUtils = new PathUtils(this.extension)

    constructor(private readonly extension: Extension) {}

    add(filePath: string) {
        if (isExcluded(filePath)) {
            this.extension.logger.addLogMessage(`[Cacher] Ignored ${filePath}.`)
            return
        }
        if (!this.watcher.has(filePath)) {
            this.extension.logger.addLogMessage(`[Cacher] Adding ${filePath}.`)
            this.watcher.add(filePath)
        }
    }

    has(filePath: string) {
        return Object.keys(this.contexts).includes(filePath)
    }

    watched(filePath: string) {
        return this.watcher.has(filePath)
    }

    async resetWatcher() {
        await this.watcher.reset()
    }

    async dispose() {
        await this.watcher.watcher.close()
        await this.pdfWatcher.dispose()
        await this.bibWatcher.dispose()
    }

    async refreshContext(filePath: string, rootPath?: string) {
        if (isExcluded(filePath)) {
            this.extension.logger.addLogMessage(`[Cacher] Ignored ${filePath}.`)
            return
        }
        if (!canContext(filePath)) {
            return
        }
        const content = this.extension.lwfs.readFileSyncGracefully(filePath)
        this.contexts[filePath] = {content, elements: {}, children: [], bibfiles: []}
        if (content === undefined) {
            this.extension.logger.addLogMessage(`[Cacher] Cannot read ${filePath}.`)
            return
        }
        const contentTrimmed = utils.stripCommentsAndVerbatim(content)
        rootPath = rootPath || this.extension.manager.rootFile
        this.updateChildren(filePath, rootPath, contentTrimmed)
        await this.updateElements(filePath, content, contentTrimmed)
        await this.updateBibfiles(filePath, contentTrimmed)
        this.extension.eventBus.fire(eventbus.FileParsed, filePath)
    }

    private updateChildren(filePath: string, rootPath: string | undefined, contentTrimmed: string) {
        rootPath = rootPath || filePath

        const inputFileRegExp = new InputFileRegExp()
        while (true) {
            const result = inputFileRegExp.exec(contentTrimmed, filePath, rootPath)
            if (!result) {
                break
            }

            if (!fs.existsSync(result.path) || path.relative(result.path, rootPath) === '') {
                continue
            }

            this.contexts[rootPath].children.push({
                index: result.match.index,
                file: result.path
            })
            this.extension.logger.addLogMessage(`[Cacher] Input ${result.path} from ${filePath}.`)

            if (this.watcher.has(result.path)) {
                continue
            }
            this.add(result.path)
            void this.refreshContext(result.path, rootPath)
        }

        this.extension.logger.addLogMessage(`[Cacher] Updated inputs of ${filePath}.`)
        this.extension.eventBus.fire(eventbus.FileParsed, filePath)
    }

    private async updateElements(filePath: string, content: string, contentTrimmed: string) {
        this.extension.completer.citation.update(filePath, content)
        const languageId: string | undefined = vscode.window.activeTextEditor?.document.languageId
        let latexAst: latexParser.AstRoot | latexParser.AstPreamble | undefined = undefined
        if (!languageId || languageId !== 'latex-expl3') {
            latexAst = await this.extension.pegParser.parseLatex(content)
        }

        if (latexAst) {
            const nodes = latexAst.content
            const lines = content.split('\n')
            this.extension.completer.reference.update(filePath, nodes, lines)
            this.extension.completer.glossary.update(filePath, nodes)
            this.extension.completer.environment.update(filePath, nodes, lines)
            this.extension.completer.command.update(filePath, nodes)
        } else {
            this.extension.logger.addLogMessage(`[Cacher] Cannot parse AST, use RegExp on ${filePath}.`)
            this.extension.completer.reference.update(filePath, undefined, undefined, contentTrimmed)
            this.extension.completer.glossary.update(filePath, undefined, contentTrimmed)
            this.extension.completer.environment.update(filePath, undefined, undefined, contentTrimmed)
            this.extension.completer.command.update(filePath, undefined, contentTrimmed)
        }
        this.extension.duplicateLabels.run(filePath)
        this.extension.logger.addLogMessage(`[Cacher] Updated elements of ${filePath}.`)
    }

    private async updateBibfiles(filePath: string, contentTrimmed: string) {
        const bibReg = /(?:\\(?:bibliography|addbibresource)(?:\[[^[\]{}]*\])?){(.+?)}|(?:\\putbib)\[(.+?)\]/g
        while (true) {
            const result = bibReg.exec(contentTrimmed)
            if (!result) {
                break
            }

            const bibs = (result[1] ? result[1] : result[2]).split(',').map(bib => bib.trim())

            for (const bib of bibs) {
                const bibPath = this.pathUtils.resolveBibPath(bib, path.dirname(filePath))
                if (bibPath === undefined) {
                    continue
                }
                this.contexts[filePath].bibfiles.push(bibPath)
                this.extension.logger.addLogMessage(`[Cacher] Bib ${bibPath} from ${filePath}.`)
                await this.bibWatcher.watchBibFile(bibPath)
            }
        }
        this.extension.logger.addLogMessage(`[Cacher] Updated bibs of ${filePath}.`)
    }

    //////////////////////////////////////

    /**
     * Get the buffer content of a file if it is opened in vscode. Otherwise, read the file from disk
     */
    getDirtyContent(file: string): string | undefined {
        const cache = this.contexts[file]
        if (cache !== undefined) {
            if (cache.content) {
                return cache.content
            }
        }
        const fileContent = this.extension.lwfs.readFileSyncGracefully(file)
        if (fileContent === undefined) {
            this.extension.logger.addLogMessage(`Cannot read dirty content of unknown ${file}`)
        }
        this.contexts[file] = {content: fileContent, elements: {}, children: [], bibfiles: []}
        return fileContent
    }

    getCachedContent(filePath: string): Context {
        if (!(filePath in this.contexts)) {
            this.getDirtyContent(filePath)
        }
        return this.contexts[filePath]
    }

    removeCachedContent(filePath: string) {
        if (filePath in this.contexts) {
            delete this.contexts[filePath]
        }
    }

    get cachedFilePaths() {
        return Object.keys(this.contexts)
    }

    updateCachedContent(document: vscode.TextDocument) {
        const cache = this.getCachedContent(document.fileName)
        if (cache !== undefined) {
            cache.content = document.getText()
        }
        this.extension.eventBus.fire(eventbus.CacheUpdated)
    }

    /**
     * Parses the content of a `.fls` file attached to the given `srcFile`.
     * All `INPUT` files are considered as subfiles/non-tex files included in `srcFile`,
     * and all `OUTPUT` files will be checked if they are `.aux` files.
     * If so, the `.aux` files are parsed for any possible `.bib` files.
     *
     * This function is called after a successful build, when looking for the root file,
     * and to compute the cachedContent tree.
     *
     * @param texFile The path of a LaTeX file.
     */
    async loadFlsFile(texFile: string) {
        this.extension.logger.addLogMessage('Parse fls file.')
        const flsFile = this.pathUtils.getFlsFilePath(texFile)
        if (flsFile === undefined) {
            return
        }
        const rootDir = path.dirname(texFile)
        const outDir = this.extension.manager.getOutDir(texFile)
        const ioFiles = parseFlsContent(fs.readFileSync(flsFile).toString(), rootDir)

        for (const inputFile of ioFiles.input) {
            // Drop files that are also listed as OUTPUT or should be ignored
            if (ioFiles.output.includes(inputFile) ||
                isExcluded(inputFile) ||
                !fs.existsSync(inputFile)) {
                continue
            }
            if (inputFile === texFile || this.watched(inputFile)) {
                // Drop the current rootFile often listed as INPUT
                // Drop any file that is already watched as it is handled by
                // onWatchedFileChange.
                continue
            }
            if (path.extname(inputFile) === '.tex') {
                // In rare cases, the cache was cleared
                this.getDirtyContent(texFile)
                // Parse tex files as imported subfiles.
                this.getCachedContent(texFile).children.push({
                    index: Number.MAX_VALUE,
                    file: inputFile
                })
                this.add(inputFile)
                await this.refreshContext(inputFile, texFile)
            } else if (!this.watched(inputFile)) {
                // Watch non-tex files.
                this.add(inputFile)
            }
        }

        for (const outputFile of ioFiles.output) {
            if (path.extname(outputFile) === '.aux' && fs.existsSync(outputFile)) {
                this.extension.logger.addLogMessage(`[Cacher] Auxfile: ${outputFile}`)
                await this.parseAuxFile(fs.readFileSync(outputFile).toString(), path.dirname(outputFile).replace(outDir, rootDir))
            }
        }
    }

    private async parseAuxFile(content: string, srcDir: string) {
        const regex = /^\\bibdata{(.*)}$/gm
        while (true) {
            const result = regex.exec(content)
            if (!result) {
                return
            }
            const bibs = (result[1] ? result[1] : result[2]).split(',').map((bib) => {
                return bib.trim()
            })
            for (const bib of bibs) {
                const bibPath = this.pathUtils.resolveBibPath(bib, srcDir)
                if (bibPath === undefined) {
                    continue
                }
                const rootFile = this.extension.manager.rootFile
                if (rootFile && !this.getCachedContent(rootFile).bibfiles.includes(bibPath)) {
                    this.getCachedContent(rootFile).bibfiles.push(bibPath)
                }
                await this.bibWatcher.watchBibFile(bibPath)
            }
        }
    }

    getTeXChildrenFromFls(texFile: string) {
        const flsFile = this.pathUtils.getFlsFilePath(texFile)
        if (flsFile === undefined) {
            return []
        }
        const rootDir = path.dirname(texFile)
        const ioFiles = parseFlsContent(fs.readFileSync(flsFile).toString(), rootDir)
        return ioFiles.input
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
        if (!this.has(file)) {
            return []
        }
        children.push(file)
        const cache = this.getCachedContent(file)
        includedBib.push(...cache.bibfiles)
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
        if (!this.has(file)) {
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
        if (!this.has(file)) {
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

    ignorePdfFile(rootFile: string) {
        const pdfFilePath = this.extension.manager.tex2pdf(rootFile)
        const pdfFileUri = vscode.Uri.file(pdfFilePath)
        this.pdfWatcher.ignorePdfFile(pdfFileUri)
    }

    watchPdfFile(pdfFileUri: vscode.Uri) {
        this.pdfWatcher.watchPdfFile(pdfFileUri)
    }
}
