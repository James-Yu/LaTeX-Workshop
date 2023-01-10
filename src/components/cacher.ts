import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { latexParser } from 'latex-utensils'
import * as lw from '../lw'
import * as eventbus from './eventbus'
import * as utils from '../utils/utils'
import type { CmdEnvSuggestion } from '../providers/completer/completerutils'
import type { CiteSuggestion } from '../providers/completer/citation'
import type { GlossarySuggestion } from '../providers/completer/glossary'
import type { ICompletionItem } from '../providers/completion'
import { InputFileRegExp } from '../utils/inputfilepath'
import { CacherUtils } from './cacherlib/cacherutils'
import { PathUtils } from './cacherlib/pathutils'
import { Watcher } from './cacherlib/texwatcher'
import { PdfWatcher } from './cacherlib/pdfwatcher'
import { BibWatcher } from './cacherlib/bibwatcher'

import { getLogger } from './logger'
import { UtensilsParser } from './parser/syntax'

const logger = getLogger('Cacher')

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
    private readonly watcher: Watcher = new Watcher(this)
    private readonly pdfWatcher: PdfWatcher = new PdfWatcher()
    private readonly bibWatcher: BibWatcher = new BibWatcher()

    add(filePath: string) {
        if (CacherUtils.isExcluded(filePath)) {
            logger.log(`Ignored ${filePath} .`)
            return
        }
        if (!this.watcher.has(filePath)) {
            logger.log(`Adding ${filePath} .`)
            this.watcher.add(filePath)
        }
    }

    remove(filePath: string) {
        if (!(filePath in this.contexts)) {
            return
        }
        delete this.contexts[filePath]
        logger.log(`Removed ${filePath} .`)
    }

    has(filePath: string) {
        return Object.keys(this.contexts).includes(filePath)
    }

    get(filePath: string): Context {
        return this.contexts[filePath]
    }

    get allPaths() {
        return Object.keys(this.contexts)
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
        if (CacherUtils.isExcluded(filePath)) {
            logger.log(`Ignored ${filePath} .`)
            return
        }
        if (!CacherUtils.canContext(filePath)) {
            return
        }
        logger.log(`Caching ${filePath} .`)
        const content = lw.lwfs.readFileSyncGracefully(filePath)
        this.contexts[filePath] = {content, elements: {}, children: [], bibfiles: []}
        if (content === undefined) {
            logger.log(`Cannot read ${filePath} .`)
            return
        }
        const contentTrimmed = utils.stripCommentsAndVerbatim(content)
        rootPath = rootPath || lw.manager.rootFile
        this.updateChildren(filePath, rootPath, contentTrimmed)
        await this.updateElements(filePath, content, contentTrimmed)
        await this.updateBibfiles(filePath, contentTrimmed)
        logger.log(`Cached ${filePath} .`)
        lw.eventBus.fire(eventbus.FileParsed, filePath)
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
            logger.log(`Input ${result.path} from ${filePath} .`)

            if (this.watcher.has(result.path)) {
                continue
            }
            this.add(result.path)
            void this.refreshContext(result.path, rootPath)
        }

        logger.log(`Updated inputs of ${filePath} .`)
    }

    private async updateElements(filePath: string, content: string, contentTrimmed: string) {
        lw.completer.citation.update(filePath, content)
        const languageId: string | undefined = vscode.window.activeTextEditor?.document.languageId
        let latexAst: latexParser.AstRoot | latexParser.AstPreamble | undefined = undefined
        if (!languageId || languageId !== 'latex-expl3') {
            latexAst = await UtensilsParser.parseLatex(content)
        }

        if (latexAst) {
            const nodes = latexAst.content
            const lines = content.split('\n')
            lw.completer.reference.update(filePath, nodes, lines)
            lw.completer.glossary.update(filePath, nodes)
            lw.completer.environment.update(filePath, nodes, lines)
            lw.completer.command.update(filePath, nodes)
        } else {
            logger.log(`Cannot parse AST, use RegExp on ${filePath} .`)
            lw.completer.reference.update(filePath, undefined, undefined, contentTrimmed)
            lw.completer.glossary.update(filePath, undefined, contentTrimmed)
            lw.completer.environment.update(filePath, undefined, undefined, contentTrimmed)
            lw.completer.command.update(filePath, undefined, contentTrimmed)
        }
        lw.duplicateLabels.run(filePath)
        logger.log(`Updated elements of ${filePath} .`)
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
                const bibPath = PathUtils.resolveBibPath(bib, path.dirname(filePath))
                if (bibPath === undefined) {
                    continue
                }
                this.contexts[filePath].bibfiles.push(bibPath)
                logger.log(`Bib ${bibPath} from ${filePath} .`)
                await this.bibWatcher.watchBibFile(bibPath)
            }
        }
        logger.log(`Updated bibs of ${filePath} .`)
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
     * @param filePath The path of a LaTeX file.
     */
    async loadFlsFile(filePath: string) {
        const flsPath = PathUtils.getFlsFilePath(filePath)
        if (flsPath === undefined) {
            return
        }
        logger.log(`Parsing .fls ${flsPath} .`)
        const rootDir = path.dirname(filePath)
        const outDir = lw.manager.getOutDir(filePath)
        const ioFiles = CacherUtils.parseFlsContent(fs.readFileSync(flsPath).toString(), rootDir)

        for (const inputFile of ioFiles.input) {
            // Drop files that are also listed as OUTPUT or should be ignored
            if (ioFiles.output.includes(inputFile) ||
                CacherUtils.isExcluded(inputFile) ||
                !fs.existsSync(inputFile)) {
                continue
            }
            if (inputFile === filePath || this.watched(inputFile)) {
                // Drop the current rootFile often listed as INPUT
                // Drop any file that is already watched as it is handled by
                // onWatchedFileChange.
                continue
            }
            if (path.extname(inputFile) === '.tex') {
                if (!this.has(filePath)) {
                    await this.refreshContext(filePath)
                }
                // Parse tex files as imported subfiles.
                this.contexts[filePath].children.push({
                    index: Number.MAX_VALUE,
                    file: inputFile
                })
                this.add(inputFile)
                logger.log(`Found ${inputFile} from .fls ${flsPath} .`)
                await this.refreshContext(inputFile, filePath)
            } else if (!this.watched(inputFile)) {
                // Watch non-tex files.
                this.add(inputFile)
            }
        }

        for (const outputFile of ioFiles.output) {
            if (path.extname(outputFile) === '.aux' && fs.existsSync(outputFile)) {
                logger.log(`Found .aux ${filePath} from .fls ${flsPath} , parsing.`)
                await this.parseAuxFile(outputFile, path.dirname(outputFile).replace(outDir, rootDir))
                logger.log(`Parsed .aux ${filePath} .`)
            }
        }
        logger.log(`Parsed .fls ${flsPath} .`)
    }

    private async parseAuxFile(filePath: string, srcDir: string) {
        const content = fs.readFileSync(filePath).toString()
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
                const bibPath = PathUtils.resolveBibPath(bib, srcDir)
                if (bibPath === undefined) {
                    continue
                }
                const rootFile = lw.manager.rootFile
                if (rootFile && !this.get(rootFile).bibfiles.includes(bibPath)) {
                    this.get(rootFile).bibfiles.push(bibPath)
                    logger.log(`Found .bib ${bibPath} from .aux ${filePath} .`)
                }
                await this.bibWatcher.watchBibFile(bibPath)
            }
        }
    }

    getTeXChildrenFromFls(texFile: string) {
        const flsFile = PathUtils.getFlsFilePath(texFile)
        if (flsFile === undefined) {
            return []
        }
        const rootDir = path.dirname(texFile)
        const ioFiles = CacherUtils.parseFlsContent(fs.readFileSync(flsFile).toString(), rootDir)
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
            file = lw.manager.rootFile
        }
        if (file === undefined) {
            return []
        }
        if (!this.has(file)) {
            return []
        }
        children.push(file)
        const cache = this.get(file)
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
            file = lw.manager.rootFile
        }
        if (file === undefined) {
            return []
        }
        if (!this.has(file)) {
            return []
        }
        includedTeX.push(file)
        for (const child of this.get(file).children) {
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
     */
    async getTeXChildren(file: string, baseFile: string, children: string[]) {
        if (!this.has(file)) {
            await this.refreshContext(file, baseFile)
        }

        this.get(file).children.forEach(async child => {
            if (children.includes(child.file)) {
                // Already included
                return
            }
            children.push(child.file)
            await this.getTeXChildren(child.file, baseFile, children)
        })
        return children
    }

    ignorePdfFile(rootFile: string) {
        const pdfFilePath = lw.manager.tex2pdf(rootFile)
        const pdfFileUri = vscode.Uri.file(pdfFilePath)
        this.pdfWatcher.ignorePdfFile(pdfFileUri)
    }

    watchPdfFile(pdfFileUri: vscode.Uri) {
        this.pdfWatcher.watchPdfFile(pdfFileUri)
    }
}
