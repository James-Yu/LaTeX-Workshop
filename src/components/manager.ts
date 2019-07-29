import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as chokidar from 'chokidar'
import * as micromatch from 'micromatch'
import * as utils from '../utils'

import {Extension} from '../main'


export class Manager {
    extension: Extension
    rootFiles: { [key: string]: string }
    localRootFiles: { [key: string]: string | undefined }
    workspace: string
    cachedContent: { [id: string]: {content: string, children: string[]}} = {}
    fileWatcher: chokidar.FSWatcher
    bibWatcher: chokidar.FSWatcher
    filesWatched: string[]
    bibsWatched: string[]
    watcherOptions: chokidar.WatchOptions = {
        usePolling: true,
        interval: 300,
        binaryInterval: 1000
    }

    constructor(extension: Extension) {
        this.extension = extension
        this.filesWatched = []
        this.bibsWatched = []
        this.rootFiles = {}
        this.localRootFiles = {}
        this.workspace = ''
    }

    getOutputDir(texPath: string) {
        const doc = texPath.replace(/\.tex$/, '').split(path.sep).join('/')
        const docfile = path.basename(texPath, '.tex')
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const docker = configuration.get('docker.enabled')
        let outDir = (configuration.get('latex.outDir') as string)
        outDir = outDir.replace(/%DOC%/g, docker ? docfile : doc)
                    .replace(/%DOCFILE%/g, docfile)
                    .replace(/%DIR%/g, docker ? './' : path.dirname(texPath).split(path.sep).join('/'))
                    .replace(/%TMPDIR%/g, this.extension.builder.tmpDir)
        return outDir
    }

    get rootDir() {
        return path.dirname(this.rootFile)
    }

    get rootFile() {
        return this.rootFiles[this.workspace]
    }

    set rootFile(root: string) {
        this.rootFiles[this.workspace] = root
    }

    get localRootFile() {
        return this.localRootFiles[this.workspace]
    }

    set localRootFile(localRoot: string | undefined) {
        this.localRootFiles[this.workspace] = localRoot
    }

    tex2pdf(texPath: string, respectOutDir: boolean = true) {
        let outputDir = './'
        if (respectOutDir) {
            outputDir = this.getOutputDir(texPath)
        }
        return path.resolve(path.dirname(texPath), outputDir, path.basename(`${texPath.substr(0, texPath.lastIndexOf('.'))}.pdf`))
    }

    hasTexId(id: string) {
        return (id === 'tex' || id === 'latex' || id === 'doctex')
    }


    updateWorkspace() {
        let wsroot = vscode.workspace.rootPath
        const activeTextEditor = vscode.window.activeTextEditor
        if (activeTextEditor) {
            const wsfolder = vscode.workspace.getWorkspaceFolder(activeTextEditor.document.uri)
            if (wsfolder) {
                wsroot = wsfolder.uri.fsPath
            }
        }
        if (wsroot) {
            if (wsroot !== this.workspace) {
                this.workspace = wsroot
            }
        } else {
            this.workspace = ''
        }
    }

    async findRoot(): Promise<string | undefined> {
        this.updateWorkspace()
        this.localRootFile = undefined
        const findMethods = [() => this.findRootMagic(), () => this.findRootSelf(), () => this.findRootDir()]
        for (const method of findMethods) {
            const rootFile = await method()
            if (rootFile !== undefined) {
                if (this.rootFile !== rootFile) {
                    this.extension.logger.addLogMessage(`Root file changed from: ${this.rootFile}. Find all dependencies.`)
                    this.rootFile = rootFile
                    this.initiateFileWatcher()
                    this.parseFileAndSubs(this.rootFile)
                } else {
                    this.extension.logger.addLogMessage(`Root file remains unchanged from: ${this.rootFile}.`)
                }
                return rootFile
            }
        }
        return undefined
    }

    findRootMagic(): string | undefined {
        if (!vscode.window.activeTextEditor) {
            return undefined
        }
        const regex = /^(?:%\s*!\s*T[Ee]X\sroot\s*=\s*(.*\.tex)$)/m
        let content = vscode.window.activeTextEditor.document.getText()

        let result = content.match(regex)
        const fileStack: string[] = []
        if (result) {
            let file = path.resolve(path.dirname(vscode.window.activeTextEditor.document.fileName), result[1])
            fileStack.push(file)
            this.extension.logger.addLogMessage(`Found root file by magic comment: ${file}`)

            content = fs.readFileSync(file).toString()
            result = content.match(regex)

            while (result) {
                file = path.resolve(path.dirname(file), result[1])
                if (fileStack.indexOf(file) > -1) {
                    this.extension.logger.addLogMessage(`Looped root file by magic comment found: ${file}, stop here.`)
                    return file
                } else {
                    fileStack.push(file)
                    this.extension.logger.addLogMessage(`Recursively found root file by magic comment: ${file}`)
                }

                content = fs.readFileSync(file).toString()
                result = content.match(regex)
            }
            return file
        }
        return undefined
    }

    findRootSelf(): string | undefined {
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

    findSubFiles(content: string): string | undefined {
        if (!vscode.window.activeTextEditor) {
            return undefined
        }
        const regex = /(?:\\documentclass\[(.*(?:\.tex))\]{subfiles})/
        const result = content.match(regex)
        if (result) {
            const file = path.resolve(path.dirname(vscode.window.activeTextEditor.document.fileName), result[1])
            this.extension.logger.addLogMessage(`Found root file of this subfile from active editor: ${file}`)
            return file
        }
        return undefined
    }

    async findRootDir(): Promise<string | undefined> {
        const regex = /\\begin{document}/m

        if (!this.workspace) {
            return undefined
        }

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const rootFilesIncludePatterns = configuration.get('latex.search.rootFiles.include') as string[]
        const rootFilesIncludeGlob = '{' + rootFilesIncludePatterns.join(',') + '}'
        const rootFilesExcludePatterns = configuration.get('latex.search.rootFiles.exclude') as string[]
        const rootFilesExcludeGlob = rootFilesExcludePatterns.length > 0 ? '{' + rootFilesExcludePatterns.join(',') + '}' : undefined
        try {
            const files = await vscode.workspace.findFiles(rootFilesIncludeGlob, rootFilesExcludeGlob)
            for (const file of files) {
                const content = utils.stripComments(fs.readFileSync(file.fsPath).toString(), '%')
                const result = content.match(regex)
                if (result) {
                    this.extension.logger.addLogMessage(`Found root file from workspace: ${file.fsPath}`)
                    return file.fsPath
                }
            }
        } catch (e) {}
        return undefined
    }

    getDirtyContent(file: string, reload: boolean = false) : string {
        for (const cachedFile of Object.keys(this.cachedContent)) {
            if (reload) {
                break
            }
            if (path.relative(cachedFile, file) !== '') {
                continue
            }
            return this.cachedContent[cachedFile].content
        }
        const fileContent = utils.stripComments(fs.readFileSync(file, 'utf-8').toString(), '%')
        this.cachedContent[file] = {content: fileContent, children: []}
        return fileContent
    }

    parseFileAndSubs(file: string, onChange: boolean = false) {
        this.extension.logger.addLogMessage(`Parsing ${file}`)
        if (this.filesWatched.indexOf(file) < 0) {
            this.extension.logger.addLogMessage(`Adding ${file} to file watcher.`)
            this.fileWatcher.add(file)
            this.filesWatched.push(file)
        }
        const content = this.getDirtyContent(file, onChange)
        this.cachedContent[file].children = []
        this.parseInputFiles(content, file)
        this.parseBibFiles(content, file)

        this.onFileChange(file) // TODO!!!!!!!!!!!
    }

    parseInputFiles(content: string, baseFile: string) {
        const inputReg = /(?:\\(?:input|InputIfFileExists|include|subfile|(?:(?:sub)?(?:import|inputfrom|includefrom)\*?{([^}]*)}))(?:\[[^[\]{}]*\])?){([^}]*)}/g
        while (true) {
            const result = inputReg.exec(content)
            if (!result) {
                break
            }

            const inputFilePath = this.parseInputFilePath(result, baseFile)

            if (!inputFilePath) {
                continue
            }
            if (!fs.existsSync(inputFilePath)) {
                this.extension.logger.addLogMessage(`Cannot find ${inputFilePath}`)
                continue
            }
            if (path.relative(inputFilePath, baseFile) === '') {
                continue
            }
            if (inputFilePath in this.cachedContent) {
                continue
            }

            this.cachedContent[baseFile].children.push(inputFilePath)
            this.parseFileAndSubs(inputFilePath)
        }
    }

    parseInputFilePath(regResult: RegExpExecArray, baseFile: string) : string | null {
        const texDirs = vscode.workspace.getConfiguration('latex-workshop').get('latex.texDirs') as string[]
        if (regResult[0].startsWith('\\subimport') || regResult[0].startsWith('\\subinputfrom') || regResult[0].startsWith('\\subincludefrom')) {
            return utils.resolveFile([path.dirname(baseFile)], path.join(regResult[1], regResult[2]))
        } else if (regResult[0].startsWith('\\import') || regResult[0].startsWith('\\inputfrom') || regResult[0].startsWith('\\includefrom')) {
            return utils.resolveFile([regResult[1]], regResult[2])
        } else {
            return utils.resolveFile([path.dirname(baseFile), ...texDirs], regResult[2])
        }
    }

    parseBibFiles(content: string, baseFile: string) {
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
                this.addBibToWatcher(bib, path.dirname(baseFile), this.extension.manager.rootFile)
            }
        }
    }

    initiateFileWatcher() {
        if (this.fileWatcher !== undefined && this.filesWatched.indexOf(this.rootFile) < 0) {
            // We have an instantiated fileWatcher, but the rootFile is not being watched.
            // => the user has changed the root. Clean up the old watcher so we reform it.
            this.resetFileWatcher()
            this.createFileWatcher()
        }

        if (this.fileWatcher === undefined) {
            this.createFileWatcher()
        }
    }

    createFileWatcher() {
        this.extension.logger.addLogMessage(`Instantiating a new file watcher for ${this.rootFile}`)
        this.fileWatcher = chokidar.watch(this.rootFile, this.watcherOptions)
        this.filesWatched.push(this.rootFile)
        this.fileWatcher.on('change', (file: string) => this.onWatchedFileChanged(file))
        this.fileWatcher.on('unlink', async (file: string) => this.onWatchedFileDeleted(file))
        // this.findAdditionalDependentFilesFromFls(this.rootFile)
    }

    resetFileWatcher() {
        this.extension.logger.addLogMessage('Root file changed -> cleaning up old file watcher.')
        this.fileWatcher.close()
        this.filesWatched = []
        // We also clean the completions from the old project
        this.extension.completer.reference.reset()
        this.extension.completer.command.reset()
        this.extension.completer.citation.reset()
        this.extension.completer.environment.reset()
        this.extension.completer.input.reset()
    }

    onWatchedFileChanged(file: string) {
        if (path.extname(file) === '.tex') {
            this.parseFileAndSubs(file, true)
        }
        if (file === this.rootFile) {
            this.findAdditionalDependentFilesFromFls(file)
        }
        this.extension.logger.addLogMessage(`File watcher: responding to change in ${file}`)
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('latex.autoBuild.run') as string !== 'onFileChange') {
            return
        }
        if (this.extension.builder.disableBuildAfterSave) {
            this.extension.logger.addLogMessage('Auto Build Run is temporarily disabled during a second.')
            return
        }
        this.extension.logger.addLogMessage(`${file} changed. Auto build project.`)
        if (this.localRootFile && configuration.get('latex.rootFile.useSubFile')) {
            this.extension.commander.build(true, this.localRootFile)
        } else {
            this.extension.commander.build(true, file)
        }
    }

    async onWatchedFileDeleted(file: string) {
        this.extension.logger.addLogMessage(`File watcher: ${file} deleted.`)
        this.fileWatcher.unwatch(file)
        this.filesWatched.splice(this.filesWatched.indexOf(file), 1)
        this.clearTexFileTree(file)
        if (file === this.rootFile) {
            this.extension.logger.addLogMessage(`Deleted ${file} was root - triggering root search`)
            await this.findRoot()
        }
    }

    findAdditionalDependentFilesFromFls(rootFile: string, fast: boolean = false) {
        const rootDir = path.dirname(rootFile)
        const outDir = this.getOutputDir(rootFile)
        const flsFile = path.resolve(rootDir, path.join(outDir, path.basename(rootFile, '.tex') + '.fls'))
        if (! fs.existsSync(flsFile)) {
            this.extension.logger.addLogMessage(`Cannot find file ${flsFile}`)
            return
        } else {
            this.extension.logger.addLogMessage(`Parsing ${flsFile} to compute dependencies`)

        }

        const inputFiles = new Set()
        const outputFiles = new Set()
        const flsContent = fs.readFileSync(flsFile).toString()
        let pwd = rootDir
        const pwdRes = /^PWD\s*(.*)$/m.exec(flsContent)
        if (pwdRes) {
            pwd = pwdRes[1]
        }

        const regex = /^(?:(INPUT)\s*(.*))|(?:(OUTPUT)\s*(.*))$/gm
        // regex groups
        // #1: an INPUT entry --> #2 input file path
        // #3: an OUTPUT entry --> #4: output file path
        while (true) {
            const result = regex.exec(flsContent)
            if (! result) {
                break
            }
            if (result[1]) {
                const inputFilePath = path.resolve(pwd, result[2])
                if (inputFilePath) {
                    inputFiles.add(inputFilePath)
                }
            } else if (result[3]) {
                const outputFilePath = path.resolve(pwd, result[4])
                if (outputFilePath) {
                    outputFiles.add(outputFilePath)
                }
            }
        }

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const globsToIgnore = configuration.get('latex.watch.files.ignore') as string[]
        inputFiles.forEach((inputFile: string) => {
            // Drop files that are also listed as OUTPUT or should be ignored
            if (outputFiles.has(inputFile) || micromatch.some(inputFile, globsToIgnore) || !fs.existsSync(inputFile)) {
                return
            }
            // Drop the current rootFile often listed as INPUT and drop any file that is already in the texFileTree
            if (rootFile === inputFile || (this.texFileTree.hasOwnProperty(rootFile) && this.texFileTree[rootFile].has(inputFile))) {
                return
            }
            const ext = path.extname(inputFile)
            if (ext === '.tex') {
                this.texFileTree[rootFile].add(inputFile)
                this.findDependentFiles(inputFile, rootDir, fast)
            }
            if (this.fileWatcher && this.filesWatched.indexOf(inputFile) < 0) {
                this.extension.logger.addLogMessage(`Adding ${inputFile} to file watcher.`)
                this.fileWatcher.add(inputFile)
                this.filesWatched.push(inputFile)
            }
        })

        outputFiles.forEach((outputFile: string) => {
            if (!fast && path.extname(outputFile) === '.aux' ) {
                this.findBibFileFromAux(outputFile, rootDir, outDir)
            }
        })
    }

    findBibFileFromAux(auxFilePath: string, rootDir: string, outDir: string) {
        const regex = /^\\bibdata{(.*)}$/gm
        const auxContent = fs.readFileSync(auxFilePath).toString()
        const srcDir = path.dirname(auxFilePath).replace(outDir, rootDir)
        while (true) {
            const result = regex.exec(auxContent)
            if (!result) {
                return
            }
            const bibs = (result[1] ? result[1] : result[2]).split(',').map((bib) => {
                return bib.trim()
            })
            for (const bib of bibs) {
                this.addBibToWatcher(bib, srcDir, this.extension.manager.rootFile)
            }
        }
    }

    onFileChange(filePath: string) {
        this.extension.completer.command.getCommandsTeX(filePath)
        this.extension.completer.command.getPackage(filePath)
        this.extension.completer.environment.getEnvironmentsTeX(filePath)
        this.extension.completer.reference.getReferencesTeX(filePath)
        this.extension.completer.citation.getTheBibliographyTeX(filePath)
        this.extension.completer.input.getGraphicsPath(filePath)
    }

    addBibToWatcher(bib: string, rootDir: string, rootFile: string | undefined = undefined) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const bibDirs = configuration.get('latex.bibDirs') as string[]
        const bibPath = utils.resolveFile([rootDir, ...bibDirs], bib, '.bib')

        if (!bibPath) {
            this.extension.logger.addLogMessage(`Cannot find .bib file ${bib}`)
            return
        }
        this.extension.logger.addLogMessage(`Found .bib file ${bibPath}`)
        if (this.bibWatcher === undefined) {
            this.extension.logger.addLogMessage('Creating file watcher for .bib files.')
            this.bibWatcher = chokidar.watch('', this.watcherOptions)
            this.bibWatcher.on('change', (filePath: string) => {
                this.extension.logger.addLogMessage(`Bib file watcher - responding to change in ${filePath}`)
                this.extension.completer.citation.parseBibFile(filePath)
                if (configuration.get('latex.autoBuild.run') as string !== 'onFileChange') {
                    return
                }
                if (this.extension.builder.disableBuildAfterSave) {
                    this.extension.logger.addLogMessage('Auto Build Run is temporarily disabled during a second.')
                    return
                }
                this.extension.logger.addLogMessage(`${filePath} changed. Auto build project.`)
                if (this.rootFile !== undefined) {
                    this.extension.logger.addLogMessage(`Building root file: ${this.rootFile}`)
                    this.extension.builder.build(this.rootFile)
                } else {
                    this.extension.logger.addLogMessage('Cannot find LaTeX root file.')
                }
            })
            this.bibWatcher.on('unlink', (filePath: string) => {
                this.extension.logger.addLogMessage(`Bib file watcher: ${filePath} deleted.`)
                this.extension.completer.citation.forgetParsedBibItems(filePath)
                this.bibWatcher.unwatch(filePath)
                this.bibsWatched.splice(this.bibsWatched.indexOf(filePath), 1)
            })
        }

        if (this.bibsWatched.indexOf(bibPath) < 0) {
            this.extension.logger.addLogMessage(`Adding .bib file ${bibPath} to bib file watcher.`)
            this.bibWatcher.add(bibPath)
            this.bibsWatched.push(bibPath)
            this.extension.completer.citation.parseBibFile(bibPath, rootFile)
        } else {
            const texFiles = this.extension.completer.citation.citationInBib[bibPath].rootFiles
            if (rootFile && texFiles.indexOf(rootFile) < 0) {
                texFiles.push(rootFile)
            }
            this.extension.logger.addLogMessage(`.bib file ${bibPath} is already being watched.`)
        }
    }

    setEnvVar() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        process.env['LATEXWORKSHOP_DOCKER_LATEX'] = configuration.get('docker.image.latex') as string
    }

    /**
     * Delete the whole dependency structure from texFileTree for file
     * @param file
     */
    clearTexFileTree(file: string) {
        if (!this.texFileTree.hasOwnProperty(file)) {
            return
        }
        // We need to first delete the node before deleting the leaves because of cycles.
        const dependencies = this.texFileTree[file]
        delete this.texFileTree[file]
        for (const f of dependencies) {
            if (f !== file) {
                this.clearTexFileTree(f)
            }
        }
    }
}
