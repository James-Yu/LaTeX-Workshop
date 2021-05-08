import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as chokidar from 'chokidar'
import * as micromatch from 'micromatch'
import type {latexParser} from 'latex-utensils'
import * as utils from '../utils/utils'

import type {Extension} from '../main'
import type {Suggestion as CiteEntry} from '../providers/completer/citation'
import type {Suggestion as CmdEntry} from '../providers/completer/command'
import type {Suggestion as EnvEntry} from '../providers/completer/environment'
import type {Suggestion as GlossEntry} from 'src/providers/completer/glossary'

import {PdfWatcher} from './managerlib/pdfwatcher'
import {BibWatcher} from './managerlib/bibwatcher'
import {FinderUtils} from './managerlib/finderutils'
import {PathUtils, PathRegExp} from './managerlib/pathutils'
import type {MatchPath} from './managerlib/pathutils'
import {IntellisenseWatcher} from './managerlib/intellisensewatcher'

/**
 * The content cache for each LaTeX file `filepath`.
 */
interface Content {
    [filepath: string]: { // The path of a LaTeX file.
        /**
         * The dirty (under editing) content of the LaTeX file.
         */
        content: string,
        /**
         * Completion item and other items for the LaTeX file.
         */
        element: {
            reference?: vscode.CompletionItem[],
            glossary?: GlossEntry[],
            environment?: EnvEntry[],
            bibitem?: CiteEntry[],
            command?: CmdEntry[],
            package?: Set<string>
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

export const enum BuildEvents {
    never = 'never',
    onSave = 'onSave',
    onFileChange = 'onFileChange'
}

type RootFileType = {
    type: 'filePath',
    filePath: string
} | {
    type: 'uri',
    uri: vscode.Uri
}

export class Manager {
    /**
     * The content cache for each LaTeX file.
     */
    readonly cachedContent: Content = {}

    private readonly localRootFiles: { [key: string]: string | undefined } = {}
    private readonly rootFilesLanguageIds: { [key: string]: string | undefined } = {}
    // Store one root file for each workspace.
    private readonly rootFiles: { [key: string]: RootFileType | undefined } = {}
    private workspaceRootDirUri: string = ''

    private readonly extension: Extension
    private fileWatcher?: chokidar.FSWatcher
    private readonly pdfWatcher: PdfWatcher
    private readonly bibWatcher: BibWatcher
    private readonly intellisenseWatcher: IntellisenseWatcher
    private readonly finderUtils: FinderUtils
    private readonly pathUtils: PathUtils
    private filesWatched: string[] = []
    private readonly watcherOptions: chokidar.WatchOptions
    private readonly rsweaveExt: string[] = ['.rnw', '.Rnw', '.rtex', '.Rtex', '.snw', '.Snw']
    private readonly jlweaveExt: string[] = ['.jnw', '.jtexw']
    private readonly weaveExt: string[] = []

    constructor(extension: Extension) {
        this.extension = extension
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const usePolling = configuration.get('latex.watch.usePolling') as boolean
        const interval = configuration.get('latex.watch.interval') as number
        const delay = configuration.get('latex.watch.delay') as number
        this.weaveExt = this.jlweaveExt.concat(this.rsweaveExt)
        this.watcherOptions = {
            useFsEvents: false,
            usePolling,
            interval,
            binaryInterval: Math.max(interval, 1000),
            awaitWriteFinish: {stabilityThreshold: delay}
        }
        this.pdfWatcher = new PdfWatcher(extension)
        this.bibWatcher = new BibWatcher(extension)
        this.intellisenseWatcher = new IntellisenseWatcher()
        this.finderUtils = new FinderUtils(extension)
        this.pathUtils = new PathUtils(extension)
    }

    /**
     * Returns the output directory developed according to the input tex path
     * and 'latex.outDir' config. If `texPath` is `undefined`, the default root
     * file is used. If there is not root file, returns './'.
     * The returned path always uses `/` even on Windows.
     *
     * @param texPath The path of a LaTeX file.
     */
    getOutDir(texPath?: string) {
        if (texPath === undefined) {
            texPath = this.rootFile
        }
        // rootFile is also undefined
        if (texPath === undefined) {
            return './'
        }

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const outDir = configuration.get('latex.outDir') as string
        const out = utils.replaceArgumentPlaceholders(texPath, this.extension.builder.tmpDir)(outDir)
        return path.normalize(out).split(path.sep).join('/')
    }

    /**
     * The path of the directory of the root file.
     */
    get rootDir() {
        return this.rootFile ? path.dirname(this.rootFile) : undefined
    }

    /**
     * The path of the root LaTeX file of the current workspace.
     * It is `undefined` before `findRoot` called.
     */
    get rootFile(): string | undefined {
        const ret = this.rootFiles[this.workspaceRootDirUri]
        if (ret) {
            if (ret.type === 'filePath') {
                return ret.filePath
            } else {
                if (ret.uri.scheme === 'file') {
                    return ret.uri.fsPath
                } else {
                    return
                }
            }
        } else {
            return
        }
    }

    set rootFile(root: string | undefined) {
        if (root) {
            this.rootFiles[this.workspaceRootDirUri] = { type: 'filePath', filePath: root }
        } else {
            this.rootFiles[this.workspaceRootDirUri] = undefined
        }
    }

    get rootFileUri(): vscode.Uri | undefined {
        const root = this.rootFiles[this.workspaceRootDirUri]
        if (root) {
            if (root.type === 'filePath') {
                return vscode.Uri.file(root.filePath)
            } else {
                return root.uri
            }
        } else {
            return
        }
    }

    set rootFileUri(root: vscode.Uri | undefined) {
        let rootFile: RootFileType | undefined
        if (root) {
            if (root.scheme === 'file') {
                rootFile = { type: 'filePath', filePath: root.fsPath }
            } else {
                rootFile = { type: 'uri', uri: root }
            }
        }
        this.rootFiles[this.workspaceRootDirUri] = rootFile
    }

    get localRootFile() {
        return this.localRootFiles[this.workspaceRootDirUri]
    }

    set localRootFile(localRoot: string | undefined) {
        this.localRootFiles[this.workspaceRootDirUri] = localRoot
    }

    get rootFileLanguageId() {
        return this.rootFilesLanguageIds[this.workspaceRootDirUri]
    }

    set rootFileLanguageId(id: string | undefined) {
        this.rootFilesLanguageIds[this.workspaceRootDirUri] = id
    }

    private inferLanguageId(filename: string): string | undefined {
        const ext = path.extname(filename).toLocaleLowerCase()
        if (ext === '.tex') {
            return 'latex'
        } else if (this.jlweaveExt.includes(ext)) {
            return 'jlweave'
        } else if (this.rsweaveExt.includes(ext)) {
            return 'rsweave'
        } else {
            return undefined
        }
    }

    /**
     * Returns the path of a PDF file with respect to `texPath`.
     *
     * @param texPath The path of a LaTeX file.
     * @param respectOutDir If `true`, the 'latex.outDir' config is respected.
     */
    tex2pdf(texPath: string, respectOutDir: boolean = true) {
        let outDir = './'
        if (respectOutDir) {
            outDir = this.getOutDir(texPath)
        }
        return path.resolve(path.dirname(texPath), outDir, path.basename(`${texPath.substr(0, texPath.lastIndexOf('.'))}.pdf`))
    }

    /**
     * Returns `true` if the language of `id` is one of supported languages.
     *
     * @param id The identifier of language.
     */
    hasTexId(id: string) {
        return ['tex', 'latex', 'latex-expl3', 'doctex', 'jlweave', 'rsweave'].includes(id)
    }

    private findWorkspace() {
        const workspaceFolders = vscode.workspace.workspaceFolders
        const firstDir = workspaceFolders && workspaceFolders[0]
        // If no workspace is opened.
        if (workspaceFolders === undefined || !firstDir) {
            this.workspaceRootDirUri = ''
            return
        }
        // If we don't have an active text editor, we can only make a guess.
        // Let's guess the first one.
        if (!vscode.window.activeTextEditor) {
            this.workspaceRootDirUri = firstDir.uri.toString(true)
            return
        }
        // Get the workspace folder which contains the active document.
        const activeFileUri = vscode.window.activeTextEditor.document.uri
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeFileUri)
        if (workspaceFolder) {
            this.workspaceRootDirUri = workspaceFolder.uri.toString(true)
            return
        }
        // Guess that the first workspace is the chosen one.
        this.workspaceRootDirUri = firstDir.uri.toString(true)
    }

    /**
     * Finds the root file with respect to the current workspace and returns it.
     * The found root is also set to `rootFile`.
     */
    async findRoot(): Promise<string | undefined> {
        this.findWorkspace()
        const wsfolders = vscode.workspace.workspaceFolders?.map(e => e.uri.toString(true))
        this.extension.logger.addLogMessage(`Current workspace folders: ${JSON.stringify(wsfolders)}`)
        this.extension.logger.addLogMessage(`Current workspaceRootDir: ${this.workspaceRootDirUri}`)
        this.localRootFile = undefined
        const findMethods = [
            () => this.finderUtils.findRootFromMagic(),
            () => this.findRootFromActive(),
            () => this.findRootFromCurrentRoot(),
            () => this.findRootInWorkspace()
        ]
        for (const method of findMethods) {
            const rootFile = await method()
            if (rootFile === undefined) {
                continue
            }
            if (this.rootFile !== rootFile) {
                this.extension.logger.addLogMessage(`Root file changed: from ${this.rootFile} to ${rootFile}`)
                this.extension.logger.addLogMessage('Start to find all dependencies.')
                this.rootFile = rootFile
                this.rootFileLanguageId = this.inferLanguageId(rootFile)
                this.extension.logger.addLogMessage(`Root file languageId: ${this.rootFileLanguageId}`)
                this.initiateFileWatcher()
                this.bibWatcher.initiateBibWatcher()
                this.parseFileAndSubs(this.rootFile, this.rootFile) // Finishing the parsing is required for subsequent refreshes.
                this.extension.structureProvider.refresh()
                this.extension.structureProvider.update()
            } else {
                this.extension.logger.addLogMessage(`Keep using the same root file: ${this.rootFile}`)
            }
            return rootFile
        }
        return undefined
    }

    private findRootFromCurrentRoot(): string | undefined {
        if (!vscode.window.activeTextEditor || this.rootFile === undefined) {
            return undefined
        }
        if (!this.extension.lwfs.isLocalUri(vscode.window.activeTextEditor.document.uri)) {
            return undefined
        }
        if (this.getIncludedTeX().includes(vscode.window.activeTextEditor.document.fileName)) {
            return this.rootFile
        }
        return undefined
    }

    private findRootFromActive(): string | undefined {
        if (!vscode.window.activeTextEditor) {
            return undefined
        }
        if (!this.extension.lwfs.isLocalUri(vscode.window.activeTextEditor.document.uri)) {
            return undefined
        }
        const regex = /\\begin{document}/m
        const content = utils.stripComments(vscode.window.activeTextEditor.document.getText())
        const result = content.match(regex)
        if (result) {
            const rootSubFile = this.finderUtils.findSubFiles(content)
            const file = vscode.window.activeTextEditor.document.fileName
            if (rootSubFile) {
               this.localRootFile = file
               return rootSubFile
            } else {
                this.extension.logger.addLogMessage(`Found root file from active editor: ${file}`)
                return file
            }
        }
        return undefined
    }

    private async findRootInWorkspace(): Promise<string | undefined> {
        const regex = /\\begin{document}/m

        if (!this.workspaceRootDirUri) {
            return undefined
        }

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const rootFilesIncludePatterns = configuration.get('latex.search.rootFiles.include') as string[]
        const rootFilesIncludeGlob = '{' + rootFilesIncludePatterns.join(',') + '}'
        const rootFilesExcludePatterns = configuration.get('latex.search.rootFiles.exclude') as string[]
        const rootFilesExcludeGlob = rootFilesExcludePatterns.length > 0 ? '{' + rootFilesExcludePatterns.join(',') + '}' : undefined
        try {
            const files = await vscode.workspace.findFiles(rootFilesIncludeGlob, rootFilesExcludeGlob)
            const candidates: string[] = []
            for (const file of files) {
                if (!this.extension.lwfs.isLocalUri(file)) {
                    continue
                }
                const flsChildren = this.getTeXChildrenFromFls(file.fsPath)
                if (vscode.window.activeTextEditor && flsChildren.includes(vscode.window.activeTextEditor.document.fileName)) {
                    this.extension.logger.addLogMessage(`Found root file from '.fls': ${file.fsPath}`)
                    return file.fsPath
                }
                const content = utils.stripComments(fs.readFileSync(file.fsPath).toString())
                const result = content.match(regex)
                if (result) {
                    // Can be a root
                    const children = this.getTeXChildren(file.fsPath, file.fsPath, [], content)
                    if (vscode.window.activeTextEditor && children.includes(vscode.window.activeTextEditor.document.fileName)) {
                        this.extension.logger.addLogMessage(`Found root file from parent: ${file.fsPath}`)
                        return file.fsPath
                    }
                    // Not including the active file, yet can still be a root candidate
                    candidates.push(file.fsPath)
                }
            }
            if (candidates.length > 0) {
                this.extension.logger.addLogMessage(`Found files that might be root, choose the first one: ${candidates}`)
                return candidates[0]
            }
        } catch (e) {}
        return undefined
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
            file = this.rootFile
        }
        if (file === undefined) {
            return []
        }
        if (!(file in this.extension.manager.cachedContent)) {
            return []
        }
        children.push(file)
        includedBib.push(...this.extension.manager.cachedContent[file].bibs)
        for (const child of this.extension.manager.cachedContent[file].children) {
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
            file = this.rootFile
        }
        if (file === undefined) {
            return []
        }
        if (!(file in this.extension.manager.cachedContent)) {
            return []
        }
        includedTeX.push(file)
        for (const child of this.extension.manager.cachedContent[file].children) {
            if (includedTeX.includes(child.file)) {
                // Already included
                continue
            }
            this.getIncludedTeX(child.file, includedTeX)
        }
        return includedTeX
    }

    private getDirtyContent(file: string, reload: boolean = false): string {
        for (const cachedFile of Object.keys(this.cachedContent)) {
            if (reload) {
                break
            }
            if (path.relative(cachedFile, file) !== '') {
                continue
            }
            return this.cachedContent[cachedFile].content
        }
        const fileContent = utils.stripComments(fs.readFileSync(file).toString())
        this.cachedContent[file] = {content: fileContent, element: {}, children: [], bibs: []}
        return fileContent
    }

    private isExcluded(file: string): boolean {
        const globsToIgnore = vscode.workspace.getConfiguration('latex-workshop').get('latex.watch.files.ignore') as string[]
        const format = (str: string): string => {
            if (os.platform() === 'win32') {
                return str.replace(/\\/g, '/')
            }
            return str
        }
        return micromatch.some(file, globsToIgnore, { format })
    }

    /**
     * Searches the subfiles, `\input` siblings, `.bib` files, and related `.fls` file
     * to construct a file dependency data structure related to `file` in `this.cachedContent`.
     *
     * This function is called when the root file is found or a watched file is changed.
     *
     * @param file The path of a LaTeX file. It is added to the watcher if not being watched.
     * @param baseFile The file currently considered as the rootFile. If undefined, we use `file`
     * @param onChange If `true`, the content of `file` is read from the file system. If `false`, the cache of `file` is used.
     */
    parseFileAndSubs(file: string, baseFile: string | undefined, onChange: boolean = false) {
        if (this.isExcluded(file)) {
            this.extension.logger.addLogMessage(`Ignoring: ${file}`)
            return
        }
        if (baseFile === undefined) {
            baseFile = file
        }
        this.extension.logger.addLogMessage(`Parsing a file and its subfiles: ${file}`)
        if (this.fileWatcher && !this.filesWatched.includes(file)) {
            // The file is first time considered by the extension.
            this.fileWatcher.add(file)
            this.filesWatched.push(file)
        }
        const content = this.getDirtyContent(file, onChange)
        this.cachedContent[file].children = []
        this.cachedContent[file].bibs = []
        this.cachedFullContent = undefined
        this.parseInputFiles(content, file, baseFile)
        this.parseBibFiles(content, file)
        // We need to parse the fls to discover file dependencies when defined by TeX macro
        // It happens a lot with subfiles, https://tex.stackexchange.com/questions/289450/path-of-figures-in-different-directories-with-subfile-latex
        this.parseFlsFile(file)
    }

    private cachedFullContent: string | undefined
    /**
     * Returns the flattened content from the given `file`,
     * typically the root file.
     *
     * @param file The path of a LaTeX file.
     */
    getContent(file?: string, fileTrace: string[] = []): string {
        // Here we make a copy, so that the tree structure of tex dependency
        // Can be maintained. For instance, main -> s1 and s2, both of which
        // has s3 as a subfile. This subtrace will allow s3 to be expanded in
        // both s1 and s2.
        if (file === undefined) {
            file = this.rootFile
        }
        if (file === undefined) {
            return ''
        }
        if (this.cachedFullContent && file === this.rootFile) {
            return this.cachedFullContent
        }
        const subFileTrace = Array.from(fileTrace)
        subFileTrace.push(file)
        if (this.cachedContent[file].children.length === 0) {
            if (file === this.rootFile) {
                this.cachedFullContent = this.cachedContent[file].content
            }
            return this.cachedContent[file].content
        }
        let content = this.cachedContent[file].content
        // Do it reverse, so that we can directly insert the new content without
        // messing up the previous line numbers.
        for (let index = this.cachedContent[file].children.length - 1; index >=0; index--) {
            const child = this.cachedContent[file].children[index]
            if (subFileTrace.includes(child.file)) {
                continue
            }
            // As index can be 1E307 (included by fls file), here we need a min.
            const pos = Math.min(content.length, child.index)
            content = [content.slice(0, pos), this.getContent(child.file, subFileTrace), content.slice(pos)].join('')
        }
        if (file === this.rootFile) {
            this.cachedFullContent = content
        }
        return content
    }

    /**
     * Return the list of files (recursively) included in `file`
     *
     * @param file The file in which children are recursively computed
     * @param baseFile The file currently considered as the rootFile
     * @param children The list of already computed children
     * @param content The content of `file`. If undefined, it is read from disk
     */
    private getTeXChildren(file: string, baseFile: string, children: string[], content?: string): string[] {
        if (content === undefined) {
            content = utils.stripComments(fs.readFileSync(file).toString())
        }

        // Update children of current file
        if (this.cachedContent[file] === undefined) {
            this.cachedContent[file] = {content, element: {}, bibs: [], children: []}
            const pathRegexp = new PathRegExp()
            while (true) {
                const result: MatchPath | undefined = pathRegexp.exec(content)
                if (!result) {
                    break
                }

                const inputFile = pathRegexp.parseInputFilePath(result, file, baseFile)

                if (!inputFile ||
                    !fs.existsSync(inputFile) ||
                    path.relative(inputFile, baseFile) === '') {
                    continue
                }

                this.cachedContent[file].children.push({
                    index: result.index,
                    file: inputFile
                })
            }
        }

        this.cachedContent[file].children.forEach(child => {
            if (children.includes(child.file)) {
                // Already included
                return
            }
            children.push(child.file)
            this.getTeXChildren(child.file, baseFile, children)
        })
        return children
    }

    private getTeXChildrenFromFls(texFile: string) {
        const flsFile = this.pathUtils.getFlsFilePath(texFile)
        if (flsFile === undefined) {
            return []
        }
        const rootDir = path.dirname(texFile)
        const ioFiles = this.pathUtils.parseFlsContent(fs.readFileSync(flsFile).toString(), rootDir)
        return ioFiles.input
    }

    private parseInputFiles(content: string, currentFile: string, baseFile: string) {
        const pathRegexp = new PathRegExp()
        while (true) {
            const result: MatchPath | undefined = pathRegexp.exec(content)
            if (!result) {
                break
            }
            const inputFile = pathRegexp.parseInputFilePath(result, currentFile, baseFile)

            if (!inputFile ||
                !fs.existsSync(inputFile) ||
                path.relative(inputFile, baseFile) === '') {
                continue
            }

            this.cachedContent[baseFile].children.push({
                index: result.index,
                file: inputFile
            })

            if (this.filesWatched.includes(inputFile)) {
                /* We already watch this file, no need to enforce a new parsing */
                continue
            }
            this.parseFileAndSubs(inputFile, baseFile)
        }
    }

    private parseBibFiles(content: string, baseFile: string) {
        const bibReg = /(?:\\(?:bibliography|addbibresource)(?:\[[^[\]{}]*\])?){(.+?)}|(?:\\putbib)\[(.+?)\]/g
        while (true) {
            const result = bibReg.exec(content)
            if (!result) {
                break
            }
            const bibs = (result[1] ? result[1] : result[2]).split(',').map((bib) => {
                return bib.trim()
            })
            for (const bib of bibs) {
                const bibPath = this.pathUtils.resolveBibPath(bib, path.dirname(baseFile))
                if (bibPath === undefined) {
                    continue
                }
                this.cachedContent[baseFile].bibs.push(bibPath)
                this.bibWatcher.watchBibFile(bibPath)
            }
        }
    }

    /**
     * Parses the content of a `.fls` file attached to the given `srcFile`.
     * All `INPUT` files are considered as subfiles/non-tex files included in `srcFile`,
     * and all `OUTPUT` files will be checked if they are `.aux` files.
     * If so, the `.aux` files are parsed for any possible `.bib` files.
     *
     * @param texFile The path of a LaTeX file.
     */
    parseFlsFile(texFile: string) {
        this.extension.logger.addLogMessage('Parse fls file.')
        const flsFile = this.pathUtils.getFlsFilePath(texFile)
        if (flsFile === undefined) {
            return
        }
        const rootDir = path.dirname(texFile)
        const outDir = this.getOutDir(texFile)
        const ioFiles = this.pathUtils.parseFlsContent(fs.readFileSync(flsFile).toString(), rootDir)

        ioFiles.input.forEach((inputFile: string) => {
            // Drop files that are also listed as OUTPUT or should be ignored
            if (ioFiles.output.includes(inputFile) ||
                this.isExcluded(inputFile) ||
                !fs.existsSync(inputFile)) {
                return
            }
            // Drop the current rootFile often listed as INPUT and drop any file that is already in the texFileTree
            if (texFile === inputFile || inputFile in this.cachedContent) {
                return
            }
            if (path.extname(inputFile) === '.tex') {
                // Parse tex files as imported subfiles.
                this.cachedContent[texFile].children.push({
                    index: Number.MAX_VALUE,
                    file: inputFile
                })
                this.parseFileAndSubs(inputFile, texFile)
            } else if (this.fileWatcher && !this.filesWatched.includes(inputFile)) {
                // Watch non-tex files.
                this.fileWatcher.add(inputFile)
                this.filesWatched.push(inputFile)
            }
        })

        ioFiles.output.forEach((outputFile: string) => {
            if (path.extname(outputFile) === '.aux' && fs.existsSync(outputFile)) {
                this.extension.logger.addLogMessage(`Parse aux file: ${outputFile}`)
                this.parseAuxFile(fs.readFileSync(outputFile).toString(),
                                  path.dirname(outputFile).replace(outDir, rootDir))
            }
        })
    }

    private parseAuxFile(content: string, srcDir: string) {
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
                if (this.rootFile && !this.cachedContent[this.rootFile].bibs.includes(bibPath)) {
                    this.cachedContent[this.rootFile].bibs.push(bibPath)
                }
                this.bibWatcher.watchBibFile(bibPath)
            }
        }
    }

    private initiateFileWatcher() {
        if (this.fileWatcher !== undefined &&
            this.rootFile !== undefined &&
            !this.filesWatched.includes(this.rootFile)) {
            // We have an instantiated fileWatcher, but the rootFile is not being watched.
            // => the user has changed the root. Clean up the old watcher so we reform it.
            this.resetFileWatcher()
            this.createFileWatcher()
        }

        if (this.fileWatcher === undefined) {
            this.createFileWatcher()
        }
    }

    private createFileWatcher() {
        this.extension.logger.addLogMessage(`Creating a new file watcher for ${this.rootFile}`)
        if (this.rootFile) {
            this.extension.logger.addLogMessage(`watcherOptions: ${JSON.stringify(this.watcherOptions)}`)
            this.fileWatcher = chokidar.watch(this.rootFile, this.watcherOptions)
            this.filesWatched.push(this.rootFile)
        } else {
            this.extension.logger.addLogMessage('Cannot find rootFile.')
            this.extension.logger.addLogMessage('Cannot create a new file watcher.')
        }
        if (this.fileWatcher) {
            this.fileWatcher.on('add', (file: string) => this.onWatchingNewFile(file))
            this.fileWatcher.on('change', (file: string) => this.onWatchedFileChanged(file))
            this.fileWatcher.on('unlink', (file: string) => this.onWatchedFileDeleted(file))
        }
        // this.findAdditionalDependentFilesFromFls(this.rootFile)
    }

    private resetFileWatcher() {
        this.extension.logger.addLogMessage('Root file changed -> cleaning up old file watcher.')
        if (this.fileWatcher) {
            this.fileWatcher.close()
        }
        this.filesWatched = []
        // We also clean the completions from the old project
        this.extension.completer.input.reset()
        this.extension.duplicateLabels.reset()
    }

    private onWatchingNewFile(file: string) {
        this.extension.logger.addLogMessage(`Added to file watcher: ${file}`)
        if (['.tex', '.bib'].concat(this.weaveExt).includes(path.extname(file)) &&
            !file.includes('expl3-code.tex')) {
            this.updateCompleterOnChange(file)
        }
    }

    private onWatchedFileChanged(file: string) {
        this.extension.logger.addLogMessage(`File watcher - file changed: ${file}`)
        // It is possible for either tex or non-tex files in the watcher.
        if (['.tex', '.bib'].concat(this.weaveExt).includes(path.extname(file)) &&
            !file.includes('expl3-code.tex')) {
            this.parseFileAndSubs(file, this.rootFile, true)
            this.updateCompleterOnChange(file)
        }
        this.buildOnFileChanged(file)
    }

    private onWatchedFileDeleted(file: string) {
        this.extension.logger.addLogMessage(`File watcher - file deleted: ${file}`)
        if (this.fileWatcher) {
            this.fileWatcher.unwatch(file)
        }
        this.filesWatched.splice(this.filesWatched.indexOf(file), 1)
        delete this.cachedContent[file]
        if (file === this.rootFile) {
            this.extension.logger.addLogMessage(`Root file deleted: ${file}`)
            this.extension.logger.addLogMessage('Start searching a new root file.')
            this.findRoot()
        }
    }

    onDidUpdateIntellisense(cb: (file: string) => void) {
        return this.intellisenseWatcher.onDidUpdateIntellisense(cb)
    }

    watchPdfFile(pdfPath: string) {
        this.pdfWatcher.watchPdfFile(pdfPath)
    }

    private autoBuild(file: string, bibChanged: boolean ) {
        if (this.extension.builder.disableBuildAfterSave) {
            this.extension.logger.addLogMessage('Auto Build Run is temporarily disabled during a second.')
            return
        }
        this.extension.logger.addLogMessage(`Auto build started detecting the change of a file: ${file}`)
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (!bibChanged && this.localRootFile && configuration.get('latex.rootFile.useSubFile')) {
            this.extension.commander.build(true, this.localRootFile, this.rootFileLanguageId)
        } else {
            this.extension.commander.build(true, this.rootFile, this.rootFileLanguageId)
        }
    }

    buildOnFileChanged(file: string, bibChanged: boolean = false) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('latex.autoBuild.run') as string !== BuildEvents.onFileChange) {
            return
        }
        this.autoBuild(file, bibChanged)
    }

    buildOnSave(file: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('latex.autoBuild.run') as string !== BuildEvents.onSave) {
            return
        }
        this.autoBuild(file, false)
    }


    // This function updates all completers upon tex-file changes.
    private updateCompleterOnChange(file: string) {
        fs.promises.readFile(file).then(buffer => buffer.toString()).then(content => this.updateCompleter(file, content))
        this.extension.completer.input.getGraphicsPath(file)
    }

    /**
     * Updates all completers upon tex-file changes, or active file content is changed.
     */
    async updateCompleter(file: string, content: string) {
        this.extension.completer.citation.update(file, content)
        const languageId: string | undefined = vscode.window.activeTextEditor?.document.languageId
        let latexAst: latexParser.AstRoot | latexParser.AstPreamble | undefined = undefined
        if (!languageId || languageId !== 'latex-expl3') {
            latexAst = await this.extension.pegParser.parseLatex(content)
        }

        if (latexAst) {
            const nodes = latexAst.content
            const lines = content.split('\n')
            this.extension.completer.reference.update(file, nodes, lines)
            this.extension.completer.glossary.update(file, nodes)
            this.extension.completer.environment.update(file, nodes, lines)
            this.extension.completer.command.update(file, nodes)
        } else {
            this.extension.logger.addLogMessage(`Cannot parse a TeX file: ${file}`)
            this.extension.logger.addLogMessage('Fall back to regex-based completion.')
            // Do the update with old style.
            const contentNoComment = utils.stripComments(content)
            this.extension.completer.reference.update(file, undefined, undefined, contentNoComment)
            this.extension.completer.glossary.update(file, undefined, contentNoComment)
            this.extension.completer.environment.update(file, undefined, undefined, contentNoComment)
            this.extension.completer.command.update(file, undefined, contentNoComment)
        }
        this.extension.manager.intellisenseWatcher.emitUpdate(file)
    }

    setEnvVar() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        process.env['LATEXWORKSHOP_DOCKER_LATEX'] = configuration.get('docker.image.latex') as string
    }

}
