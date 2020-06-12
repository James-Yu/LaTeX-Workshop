import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as chokidar from 'chokidar'
import * as micromatch from 'micromatch'
import {latexParser} from 'latex-utensils'
import * as utils from '../utils/utils'

import {Extension} from '../main'
import {Suggestion as CiteEntry} from '../providers/completer/citation'
import {Suggestion as CmdEntry} from '../providers/completer/command'
import {Suggestion as EnvEntry} from '../providers/completer/environment'

interface Content {
    [filepath: string]: { // tex file name
        content: string, // the dirty (under editing) contents
        element: {
            reference?: vscode.CompletionItem[],
            environment?: EnvEntry[],
            bibitem?: CiteEntry[],
            command?: CmdEntry[],
            package?: string[]
        }, // latex elements for completion, e.g., reference definition
        children: { // sub-files, should be tex or plain files
            index: number, // the index of character sub-content is inserted
            file: string // the path to the sub-file
        }[],
        bibs: string[]
    }
}

export class Manager {
    cachedContent: Content = {}

    private extension: Extension
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
     * and 'latex.outDir' config. If undefined is passed in, the default root
     * file is used. If there is not root file, './' is output.
     * The return path always uses `/` even on Windows
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

    get rootDir() {
        return this.rootFile ? path.dirname(this.rootFile) : undefined
    }

    // Here we have something complex. We use a private rootFiles to hold the
    // roots of each workspace, and use rootFile to return the cached content.
    private rootFiles: { [key: string]: string | undefined } = {}
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

    tex2pdf(texPath: string, respectOutDir: boolean = true) {
        let outDir = './'
        if (respectOutDir) {
            outDir = this.getOutDir(texPath)
        }
        return path.resolve(path.dirname(texPath), outDir, path.basename(`${texPath.substr(0, texPath.lastIndexOf('.'))}.pdf`))
    }

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
     * This function is used to actually find the root file with respect to the
     * current workspace. The found roots will be saved in rootFiles, and can be
     * retrieved by the public rootFile variable/getter.
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
                this.extension.logger.addLogMessage(`Root file changed from: ${this.rootFile} to ${rootFile}. Find all dependencies.`)
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
     * This function returns a string array which holds all imported tex files
     * from the given `file`. If it is undefined, this function traces from the
     * root file, or return empty array if root is undefined
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
     * This function is called when a root file is found or a watched file is
     * changed (in vscode or externally). It searches the subfiles, including
     * \input siblings, bib files, and related fls file to construct a file
     * dependency data structure in `this.cachedContent`. Noted that only the
     * provided `file` is re-parsed, together with any new files that were not
     * previously watched/considered. Since this function is called upon content
     * changes, this lazy loading should be fine.
     */
    parseFileAndSubs(file: string, onChange: boolean = false) {
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
     * This function returns the flattened content from the given file,
     * typically the root file.
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
     * This function parses the content of a fls attached to the given base tex
     * file. All input files are considered as included subfiles/non-tex files,
     * and all output files will be check if there are aux files related. If so,
     * the aux files are parsed for any possible bib file.
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
        this.extension.logger.addLogMessage('Creating file watcher for .bib files.')
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
        this.extension.logger.addLogMessage('Creating file watcher for .pdf files.')
        this.pdfWatcher = chokidar.watch([], this.pdfWatcherOptions)
        this.pdfWatcher.on('change', (file: string) => this.onWatchedPdfChanged(file))
        this.pdfWatcher.on('unlink', (file: string) => this.onWatchedPdfDeleted(file))
    }

    private onWatchedPdfChanged(file: string) {
        this.extension.logger.addLogMessage(`PDF file watcher - file changed: ${file}`)
        this.extension.viewer.refreshExistingViewer()
    }

    onWatchedPdfDeleted(file: string) {
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

    private buildOnFileChanged(file: string, bibChanged: boolean = false) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('latex.autoBuild.run') as string !== 'onFileChange') {
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
     * This function updates all completers upon tex-file changes, or active file content is changed.
     */
    async updateCompleter(file: string, content: string) {
        this.extension.completer.citation.update(file, content)
        // Here we use this delay config. Otherwise, multiple updates may run
        // concurrently if the actual parsing time is greater than that of
        // the keypress delay.
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

    private resolveBibPath(bib: string, rootDir: string) {
        const bibDirs = vscode.workspace.getConfiguration('latex-workshop').get('latex.bibDirs') as string[]
        const bibPath = utils.resolveFile([rootDir, ...bibDirs], bib, '.bib')

        if (!bibPath) {
            this.extension.logger.addLogMessage(`Cannot find .bib file: ${bib}`)
            return undefined
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
