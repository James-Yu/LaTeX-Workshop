import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as cs from 'cross-spawn'
import * as chokidar from 'chokidar'
import * as micromatch from 'micromatch'
import {latexParser} from 'latex-utensils'
import * as utils from '../utils/utils'

import {Extension} from '../main'
import {Suggestion as CiteEntry} from '../providers/completer/citation'
import {Suggestion as CmdEntry} from '../providers/completer/command'
import {Suggestion as EnvEntry} from '../providers/completer/environment'

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
            environment?: EnvEntry[],
            bibitem?: CiteEntry[],
            command?: CmdEntry[],
            package?: string[]
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

export class Manager {
    /**
     * The content cache for each LaTeX file.
     */
    readonly cachedContent: Content = {}

    private readonly extension: Extension
    private fileWatcher?: chokidar.FSWatcher
    private pdfWatcher?: chokidar.FSWatcher
    private bibWatcher?: chokidar.FSWatcher
    private filesWatched: string[] = []
    private pdfsWatched: string[] = []
    private bibsWatched: string[] = []
    private watcherOptions: chokidar.WatchOptions
    private rsweaveExt: string[] = ['.rnw', '.Rnw', '.rtex', '.Rtex', '.snw', '.Snw']
    private jlweaveExt: string[] = ['.jnw', '.jtexw']
    private weaveExt: string[] = []
    private pdfWatcherOptions: chokidar.WatchOptions
    private disableAutoBuild: boolean = false

    constructor(extension: Extension) {
        this.extension = extension
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const usePolling = configuration.get('latex.watch.usePolling') as boolean
        const interval = configuration.get('latex.watch.interval') as number
        const delay = configuration.get('latex.watch.delay') as number
        const pdfDelay = configuration.get('latex.watch.pdfDelay') as number
        this.weaveExt = this.jlweaveExt.concat(this.rsweaveExt)
        this.watcherOptions = {
            useFsEvents: false,
            usePolling,
            interval,
            binaryInterval: Math.max(interval, 1000),
            awaitWriteFinish: {stabilityThreshold: delay}
        }
        this.pdfWatcherOptions = {
            useFsEvents: false,
            usePolling,
            interval,
            binaryInterval: Math.max(interval, 1000),
            awaitWriteFinish: {stabilityThreshold: pdfDelay}
        }
        this.initiatePdfWatcher()
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

    // Here we have something complex. We use a private rootFiles to hold the
    // roots of each workspace, and use rootFile to return the cached content.
    private rootFiles: { [key: string]: string | undefined } = {}

    /**
     * The path of the root LaTeX file of the current workspace.
     * It is `undefined` before `findRoot` called.
     */
    get rootFile() {
        return this.rootFiles[this.workspaceRootDir]
    }

    set rootFile(root: string | undefined) {
        this.rootFiles[this.workspaceRootDir] = root
    }

    private localRootFiles: { [key: string]: string | undefined } = {}
    get localRootFile() {
        return this.localRootFiles[this.workspaceRootDir]
    }
    set localRootFile(localRoot: string | undefined) {
        this.localRootFiles[this.workspaceRootDir] = localRoot
    }

    private rootFilesLanguageIds: { [key: string]: string | undefined } = {}
    get rootFileLanguageId() {
        return this.rootFilesLanguageIds[this.workspaceRootDir]
    }
    set rootFileLanguageId(id: string | undefined) {
        this.rootFilesLanguageIds[this.workspaceRootDir] = id
    }

    private inferLanguageId(filename: string): string | undefined {
        const ext = path.extname(filename)
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

    private workspaceRootDir: string = ''
    private findWorkspace() {
        const workspaceFolders = vscode.workspace.workspaceFolders
        const firstDir = workspaceFolders && workspaceFolders[0]
        // If no workspace is opened.
        if (workspaceFolders === undefined || !firstDir) {
            this.workspaceRootDir = ''
            return
        }
        // If we don't have an active text editor, we can only make a guess.
        // Let's guess the first one.
        if (!vscode.window.activeTextEditor) {
            this.workspaceRootDir = firstDir.uri.fsPath
            return
        }
        // Guess that the correct workspace folder path should be contained in
        // the path of active editor. If there are multiple matches, take the
        // first one.
        const activeFile = vscode.window.activeTextEditor.document.uri.fsPath
        for (const workspaceFolder of workspaceFolders) {
            if (activeFile.includes(workspaceFolder.uri.fsPath)) {
                this.workspaceRootDir = workspaceFolder.uri.fsPath
                return
            }
        }
        // Guess that the first workspace is the chosen one.
        this.workspaceRootDir = firstDir.uri.fsPath
    }

    /**
     * Finds the root file with respect to the current workspace and returns it.
     * The found root is also set to `rootFile`.
     */
    async findRoot(): Promise<string | undefined> {
        this.findWorkspace()
        this.localRootFile = undefined
        const findMethods = [
            () => this.findRootFromMagic(),
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
                this.initiateFileWatcher()
                this.initiateBibWatcher()
                this.parseFileAndSubs(this.rootFile) // finish the parsing is required for subsequent refreshes.
                this.extension.structureProvider.refresh()
                this.extension.structureProvider.update()
            } else {
                this.extension.logger.addLogMessage(`Keep using the same root file: ${this.rootFile}.`)
            }
            return rootFile
        }
        return undefined
    }

    private findRootFromCurrentRoot(): string | undefined {
        if (!vscode.window.activeTextEditor || this.rootFile === undefined) {
            return undefined
        }
        if (this.getIncludedTeX().includes(vscode.window.activeTextEditor.document.fileName)) {
            return this.rootFile
        }
        return undefined
    }

    private findRootFromMagic(): string | undefined {
        if (!vscode.window.activeTextEditor) {
            return undefined
        }
        const regex = /^(?:%\s*!\s*T[Ee]X\sroot\s*=\s*(.*\.tex)$)/m
        let content = vscode.window.activeTextEditor.document.getText()

        let result = content.match(regex)
        const fileStack: string[] = []
        if (result) {
            let file = path.resolve(path.dirname(vscode.window.activeTextEditor.document.fileName), result[1])
            if (!fs.existsSync(file)) {
                const msg = `Not found root file specified in the magic comment: ${file}`
                this.extension.logger.addLogMessage(msg)
                throw new Error(msg)
            }
            fileStack.push(file)
            this.extension.logger.addLogMessage(`Found root file by magic comment: ${file}`)

            content = fs.readFileSync(file).toString()
            result = content.match(regex)

            while (result) {
                file = path.resolve(path.dirname(file), result[1])
                if (fileStack.includes(file)) {
                    this.extension.logger.addLogMessage(`Looped root file by magic comment found: ${file}, stop here.`)
                    return file
                } else {
                    fileStack.push(file)
                    this.extension.logger.addLogMessage(`Recursively found root file by magic comment: ${file}`)
                }

                if (!fs.existsSync(file)) {
                    const msg = `Not found root file specified in the magic comment: ${file}`
                    this.extension.logger.addLogMessage(msg)
                    throw new Error(msg)
                }
                content = fs.readFileSync(file).toString()
                result = content.match(regex)
            }
            return file
        }
        return undefined
    }

    private findRootFromActive(): string | undefined {
        if (!vscode.window.activeTextEditor) {
            return undefined
        }
        const regex = /\\begin{document}/m
        const content = utils.stripComments(vscode.window.activeTextEditor.document.getText(), '%')
        const result = content.match(regex)
        if (result) {
            const rootSubFile = this.findSubFiles(content)
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

    private findSubFiles(content: string): string | undefined {
        if (!vscode.window.activeTextEditor) {
            return undefined
        }
        const regex = /(?:\\documentclass\[(.*)\]{subfiles})/
        const result = content.match(regex)
        if (result) {
            const file = utils.resolveFile([path.dirname(vscode.window.activeTextEditor.document.fileName)], result[1])
            if (file) {
                this.extension.logger.addLogMessage(`Found root file of this subfile from active editor: ${file}`)
            } else {
                this.extension.logger.addLogMessage(`Cannot find root file of this subfile from active editor: ${result[1]}`)
            }
            return file
        }
        return undefined
    }

    private async findRootInWorkspace(): Promise<string | undefined> {
        const regex = /\\begin{document}/m

        if (!this.workspaceRootDir) {
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
                const content = utils.stripComments(fs.readFileSync(file.fsPath).toString(), '%')
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
     * Returns a string array which holds all imported tex files
     * from the given `file`. If `file` is `undefined`, traces from the
     * root file, or return empty array if the root file is `undefined`
     *
     * @param file The path of a LaTeX file
     */
    getIncludedTeX(file?: string, includedTeX: string[] = []) {
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
        const fileContent = utils.stripComments(fs.readFileSync(file).toString(), '%')
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
     * @param onChange If `true`, the content of `file` is read from the file system. If `false`, the cache of `file` is used.
     */
    private parseFileAndSubs(file: string, onChange: boolean = false) {
        if (this.isExcluded(file)) {
            this.extension.logger.addLogMessage(`Ignoring: ${file}`)
            return
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
        this.parseInputFiles(content, file)
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

    private getTeXChildren(file: string, baseFile: string, children: string[], content?: string): string[] {
        if (content === undefined) {
            content = utils.stripComments(fs.readFileSync(file).toString(), '%')
        }

        // Update children of current file
        if (this.cachedContent[file] === undefined) {
            this.cachedContent[file] = {content, element: {}, bibs: [], children: []}
            const inputReg = /(?:\\(?:input|InputIfFileExists|include|SweaveInput|subfile|(?:(?:sub)?(?:import|inputfrom|includefrom)\*?{([^}]*)}))(?:\[[^[\]{}]*\])?){([^}]*)}/g
            while (true) {
                const result = inputReg.exec(content)
                if (!result) {
                    break
                }

                const inputFile = this.parseInputFilePath(result, baseFile)

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

    private parseInputFiles(content: string, baseFile: string) {
        const inputReg = /(?:\\(?:input|InputIfFileExists|include|SweaveInput|subfile|(?:(?:sub)?(?:import|inputfrom|includefrom)\*?{([^}]*)}))(?:\[[^[\]{}]*\])?){([^}]*)}/g
        while (true) {
            const result = inputReg.exec(content)
            if (!result) {
                break
            }

            const inputFile = this.parseInputFilePath(result, baseFile)

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
                continue
            }
            this.parseFileAndSubs(inputFile)
        }
    }

    private parseInputFilePath(regResult: RegExpExecArray, baseFile: string): string | undefined {
        const texDirs = vscode.workspace.getConfiguration('latex-workshop').get('latex.texDirs') as string[]
        if (regResult[0].startsWith('\\subimport') || regResult[0].startsWith('\\subinputfrom') || regResult[0].startsWith('\\subincludefrom')) {
            return utils.resolveFile([path.dirname(baseFile)], path.join(regResult[1], regResult[2]))
        } else if (regResult[0].startsWith('\\import') || regResult[0].startsWith('\\inputfrom') || regResult[0].startsWith('\\includefrom')) {
            return utils.resolveFile([regResult[1]], regResult[2])
        } else {
            if (this.rootFile) {
                return utils.resolveFile([path.dirname(baseFile), path.dirname(this.rootFile), ...texDirs], regResult[2])
            } else {
                return utils.resolveFile([path.dirname(baseFile), ...texDirs], regResult[2])
            }
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
                const bibPath = this.resolveBibPath(bib, path.dirname(baseFile))
                if (bibPath === undefined) {
                    continue
                }
                this.cachedContent[baseFile].bibs.push(bibPath)
                this.watchBibFile(bibPath)
            }
        }
    }

    /**
     * Parses the content of a `.fls` file attached to the given `srcFile`.
     * All `INPUT` files are considered as subfiles/non-tex files included in `srcFile`,
     * and all `OUTPUT` files will be checked if they are `.aux` files.
     * If so, the `.aux` files are parsed for any possible `.bib` files.
     *
     * @param srcFile The path of a LaTeX file.
     */
    parseFlsFile(srcFile: string) {
        this.extension.logger.addLogMessage('Parse fls file.')
        const rootDir = path.dirname(srcFile)
        const outDir = this.getOutDir(srcFile)
        const baseName = path.parse(srcFile).name
        const flsFile = path.resolve(rootDir, path.join(outDir, baseName + '.fls'))
        if (!fs.existsSync(flsFile)) {
            this.extension.logger.addLogMessage(`Cannot find fls file: ${flsFile}`)
            return
        }
        this.extension.logger.addLogMessage(`Fls file found: ${flsFile}`)
        const ioFiles = this.parseFlsContent(fs.readFileSync(flsFile).toString(), rootDir)

        ioFiles.input.forEach((inputFile: string) => {
            // Drop files that are also listed as OUTPUT or should be ignored
            if (ioFiles.output.includes(inputFile) ||
                this.isExcluded(inputFile) ||
                !fs.existsSync(inputFile)) {
                return
            }
            // Drop the current rootFile often listed as INPUT and drop any file that is already in the texFileTree
            if (srcFile === inputFile || inputFile in this.cachedContent) {
                return
            }
            if (path.extname(inputFile) === '.tex') {
                // Parse tex files as imported subfiles.
                this.cachedContent[srcFile].children.push({
                    index: Number.MAX_VALUE,
                    file: inputFile
                })
                this.parseFileAndSubs(inputFile)
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
                const bibPath = this.resolveBibPath(bib, srcDir)
                if (bibPath === undefined) {
                    continue
                }
                if (this.rootFile && !this.cachedContent[this.rootFile].bibs.includes(bibPath)) {
                    this.cachedContent[this.rootFile].bibs.push(bibPath)
                }
                this.watchBibFile(bibPath)
            }
        }
    }

    private parseFlsContent(content: string, rootDir: string): {input: string[], output: string[]} {
        const inputFiles: Set<string> = new Set()
        const outputFiles: Set<string> = new Set()
        const regex = /^(?:(INPUT)\s*(.*))|(?:(OUTPUT)\s*(.*))$/gm
        // regex groups
        // #1: an INPUT entry --> #2 input file path
        // #3: an OUTPUT entry --> #4: output file path
        while (true) {
            const result = regex.exec(content)
            if (!result) {
                break
            }
            if (result[1]) {
                const inputFilePath = path.resolve(rootDir, result[2])
                if (inputFilePath) {
                    inputFiles.add(inputFilePath)
                }
            } else if (result[3]) {
                const outputFilePath = path.resolve(rootDir, result[4])
                if (outputFilePath) {
                    outputFiles.add(outputFilePath)
                }
            }
        }

        return {input: Array.from(inputFiles), output: Array.from(outputFiles)}
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
        this.extension.logger.addLogMessage(`Instantiating a new file watcher for ${this.rootFile}`)
        if (this.rootFile) {
            this.fileWatcher = chokidar.watch(this.rootFile, this.watcherOptions)
            this.filesWatched.push(this.rootFile)
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
            this.parseFileAndSubs(file, true)
            this.updateCompleterOnChange(file)
        }
        this.buildOnFileChanged(file)
    }

    private initiateBibWatcher() {
        if (this.bibWatcher !== undefined) {
            return
        }
        this.extension.logger.addLogMessage('Creating Bib file watcher.')
        this.bibWatcher = chokidar.watch([], this.watcherOptions)
        this.bibWatcher.on('change', (file: string) => this.onWatchedBibChanged(file))
        this.bibWatcher.on('unlink', (file: string) => this.onWatchedBibDeleted(file))
    }

    private onWatchedBibChanged(file: string) {
        this.extension.logger.addLogMessage(`Bib file watcher - file changed: ${file}`)
        this.extension.completer.citation.parseBibFile(file)
        this.buildOnFileChanged(file, true)
    }

    private onWatchedBibDeleted(file: string) {
        this.extension.logger.addLogMessage(`Bib file watcher - file deleted: ${file}`)
        if (this.bibWatcher) {
            this.bibWatcher.unwatch(file)
        }
        this.bibsWatched.splice(this.bibsWatched.indexOf(file), 1)
        this.extension.completer.citation.removeEntriesInFile(file)
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

    private initiatePdfWatcher() {
        if (this.pdfWatcher !== undefined) {
            return
        }
        this.extension.logger.addLogMessage('Creating PDF file watcher.')
        this.pdfWatcher = chokidar.watch([], this.pdfWatcherOptions)
        this.pdfWatcher.on('change', (file: string) => this.onWatchedPdfChanged(file))
        this.pdfWatcher.on('unlink', (file: string) => this.onWatchedPdfDeleted(file))
    }

    private onWatchedPdfChanged(file: string) {
        this.extension.logger.addLogMessage(`PDF file watcher - file changed: ${file}`)
        this.extension.viewer.refreshExistingViewer()
    }

    private onWatchedPdfDeleted(file: string) {
        this.extension.logger.addLogMessage(`PDF file watcher - file deleted: ${file}`)
        if (this.pdfWatcher) {
            this.pdfWatcher.unwatch(file)
        }
        this.pdfsWatched.splice(this.pdfsWatched.indexOf(file), 1)
    }

    watchPdfFile(pdfPath: string) {
        if (this.pdfWatcher && !this.pdfsWatched.includes(pdfPath)) {
            this.extension.logger.addLogMessage(`Added to PDF file watcher: ${pdfPath}`)
            this.pdfWatcher.add(pdfPath)
            this.pdfsWatched.push(pdfPath)
        }
    }

    // This function toggles the autobuild state and returns whether autobuild is enabled.
    toggleAutoBuild() {
        this.disableAutoBuild = !this.disableAutoBuild
        return !this.disableAutoBuild
    }

    private buildOnFileChanged(file: string, bibChanged: boolean = false) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('latex.autoBuild.run') as string !== 'onFileChange') {
            return
        }
        if (this.disableAutoBuild) {
            return
        }
        if (this.extension.builder.disableBuildAfterSave) {
            this.extension.logger.addLogMessage('Auto Build Run is temporarily disabled during a second.')
            return
        }
        this.extension.logger.addLogMessage(`Auto build started detecting the change of a file: ${file}`)
        if (!bibChanged && this.localRootFile && configuration.get('latex.rootFile.useSubFile')) {
            this.extension.commander.build(true, this.localRootFile, this.rootFileLanguageId)
        } else {
            this.extension.commander.build(true, this.rootFile, this.rootFileLanguageId)
        }
    }

    // This function updates all completers upon tex-file changes.
    private updateCompleterOnChange(file: string) {
        fs.readFile(file).then(buffer => buffer.toString()).then(content => this.updateCompleter(file, content))
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
            this.extension.completer.environment.update(file, nodes, lines)
            this.extension.completer.command.update(file, nodes)
            this.extension.completer.command.updatePkg(file, nodes)
        } else {
            this.extension.logger.addLogMessage(`Cannot parse a TeX file: ${file}`)
            this.extension.logger.addLogMessage('Fall back to regex-based completion.')
            // Do the update with old style.
            const contentNoComment = utils.stripComments(content, '%')
            this.extension.completer.reference.update(file, undefined, undefined, contentNoComment)
            this.extension.completer.environment.update(file, undefined, undefined, contentNoComment)
            this.extension.completer.command.update(file, undefined, contentNoComment)
            this.extension.completer.command.updatePkg(file, undefined, contentNoComment)
        }
    }

    private kpsewhichBibPath(bib: string): string | undefined {
        const kpsewhich = vscode.workspace.getConfiguration('latex-workshop').get('kpsewhich.path') as string
        this.extension.logger.addLogMessage(`Calling ${kpsewhich} to resolve file: ${bib}`)
        try {
            const kpsewhichReturn = cs.sync(kpsewhich, ['-format=.bib', bib])
            if (kpsewhichReturn.status === 0) {
                const bibPath = kpsewhichReturn.stdout.toString().replace(/\r?\n/, '')
                if (bibPath === '') {
                    return undefined
                } else {
                    this.extension.logger.addLogMessage(`Found .bib file using kpsewhich: ${bibPath}`)
                    return bibPath
                }
            }
        } catch(e) {
            this.extension.logger.addLogMessage(`Cannot run kpsewhich to resolve .bib file: ${bib}`)
        }
        return undefined
    }

    private resolveBibPath(bib: string, baseDir: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const bibDirs = configuration.get('latex.bibDirs') as string[]
        let searchDirs: string[]
        if (this.rootDir) {
            // chapterbib requires to load the .bib file in every chapter using
            // the path relative to the rootDir
            searchDirs = [this.rootDir, baseDir, ...bibDirs]
        } else {
            searchDirs = [baseDir, ...bibDirs]
        }
        const bibPath = utils.resolveFile(searchDirs, bib, '.bib')

        if (!bibPath) {
            this.extension.logger.addLogMessage(`Cannot find .bib file: ${bib}`)
            if (configuration.get('kpsewhich.enabled')) {
                return this.kpsewhichBibPath(bib)
            } else {
                return undefined
            }
        }
        this.extension.logger.addLogMessage(`Found .bib file: ${bibPath}`)
        return bibPath
    }

    private watchBibFile(bibPath: string) {
        if (this.bibWatcher && !this.bibsWatched.includes(bibPath)) {
            this.extension.logger.addLogMessage(`Added to bib file watcher: ${bibPath}`)
            this.bibWatcher.add(bibPath)
            this.bibsWatched.push(bibPath)
            this.extension.completer.citation.parseBibFile(bibPath)
        }
    }

    setEnvVar() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        process.env['LATEXWORKSHOP_DOCKER_LATEX'] = configuration.get('docker.image.latex') as string
    }

}
