import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as chokidar from 'chokidar'
import * as micromatch from 'micromatch'

import {Extension} from '../main'


export class Manager {
    extension: Extension
    rootFiles: object
    workspace: string
    texFileTree: { [id: string]: Set<string> } = {}
    fileWatcher: chokidar.FSWatcher
    bibWatcher: chokidar.FSWatcher
    filesWatched: string[]
    bibsWatched: string[]

    constructor(extension: Extension) {
        this.extension = extension
        this.filesWatched = []
        this.bibsWatched = []
        this.rootFiles = {}
        this.workspace = ''
    }

    getOutputDir(texPath: string) {
        const doc = texPath.replace(/\.tex$/, '').split(path.sep).join('/')
        const docfile = path.basename(texPath, '.tex')
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const docker = configuration.get('docker.enabled')
        let outDir = (configuration.get('latex.outDir') as string)
        outDir = outDir.replace('%DOC%', docker ? docfile : doc)
                    .replace('%DOCFILE%', docfile)
                    .replace('%DIR%', docker ? './' : path.dirname(texPath).split(path.sep).join('/'))
                    .replace('%TMPDIR%', this.extension.builder.tmpDir)
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

    // Remove all the comments
    stripComments(text: string, commentSign: string) : string {
        const pattern = '([^\\\\]|^)' + commentSign + '.*$'
        const reg = RegExp(pattern, 'gm')
        return text.replace(reg, '$1')
    }

    // Given an input file determine its full path using the prefixes dirs
    resolveFile(dirs: string[], inputFile: string, suffix: string = '.tex') : string | null {
        if (inputFile.startsWith('/')) {
            dirs.unshift('')
        }
        for (const d of dirs) {
            let inputFilePath = path.resolve(d, inputFile)
            if (path.extname(inputFilePath) === '') {
                inputFilePath += suffix
            }
            if (!fs.existsSync(inputFilePath) && fs.existsSync(inputFilePath + suffix)) {
                inputFilePath += suffix
            }
            if (fs.existsSync(inputFilePath)) {
                return inputFilePath
            }
        }
        return null
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

    async findRoot() : Promise<string | undefined> {
        this.updateWorkspace()
        const findMethods = [() => this.findRootMagic(), () => this.findRootSelf(), () => this.findRootDir()]
        for (const method of findMethods) {
            const rootFile = await method()
            if (rootFile !== undefined) {
                if (this.rootFile !== rootFile) {
                    this.extension.logger.addLogMessage(`Root file changed from: ${this.rootFile}. Find all dependencies.`)
                    this.rootFile = rootFile
                    this.findAllDependentFiles(rootFile)
                } else {
                    this.extension.logger.addLogMessage(`Root file remains unchanged from: ${this.rootFile}.`)
                }
                return rootFile
            }
        }
        return undefined
    }

    findRootMagic() : string | undefined {
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

    findRootSelf() : string | undefined {
        if (!vscode.window.activeTextEditor) {
            return undefined
        }
        const regex = /\\begin{document}/m
        const content = this.stripComments(vscode.window.activeTextEditor.document.getText(), '%')
        const result = content.match(regex)
        if (result) {
            const file = vscode.window.activeTextEditor.document.fileName
            this.extension.logger.addLogMessage(`Found root file from active editor: ${file}`)
            return file
        }
        return undefined
    }

    findSubFiles() : string | undefined {
        if (!vscode.window.activeTextEditor) {
            return undefined
        }
        const regex = /(?:\\documentclass\[(.*(?:\.tex))\]{subfiles})/
        const content = this.stripComments(vscode.window.activeTextEditor.document.getText(), '%')
        const result = content.match(regex)
        if (result) {
            const file = path.resolve(path.dirname(vscode.window.activeTextEditor.document.fileName), result[1])
            this.extension.logger.addLogMessage(`Found root file of this subfile from active editor: ${file}`)
            return file
        }
        return undefined
    }

    async findRootDir() : Promise<string | undefined> {
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
            const urls = await vscode.workspace.findFiles(rootFilesIncludeGlob, rootFilesExcludeGlob)
            for (const url of urls) {
                const content = this.stripComments(fs.readFileSync(url.fsPath).toString(), '%')
                const result = content.match(regex)
                if (result) {
                    const file = url.fsPath
                    this.extension.logger.addLogMessage(`Try root file in root directory: ${file}`)
                    const window = vscode.window
                    if (window && window.activeTextEditor && this.isRoot(url.fsPath, window.activeTextEditor.document.fileName, true)) {
                        this.extension.logger.addLogMessage(`Found root file in root directory: ${file}`)
                        return file
                    }
                }
            }
        } catch (e) {}
        return undefined
    }

    isRoot(root: string, file: string, updateDependent = false) : boolean {
        if (!fs.existsSync(root)) {
            return false
        }
        if (root === file) {
            return true
        }
        if (updateDependent) {
            this.findDependentFiles(root, undefined, true)
            this.findAdditionalDependentFilesFromFls(root, true)
        }
        if (!this.texFileTree.hasOwnProperty(root) || !this.texFileTree.hasOwnProperty(file)) {
            return false
        }
        for (const r of this.texFileTree[root]) {
            if (this.isRoot(r, file)) {
                return true
            }
        }
        return false
    }

    findAllDependentFiles(rootFile: string) {
        let prevWatcherClosed = false
        if (this.fileWatcher !== undefined && this.filesWatched.indexOf(rootFile) < 0) {
            // We have an instantiated fileWatcher, but the rootFile is not being watched.
            // => the user has changed the root. Clean up the old watcher so we reform it.
            this.extension.logger.addLogMessage(`Root file changed -> cleaning up old file watcher.`)
            this.fileWatcher.close()
            this.filesWatched = []
            prevWatcherClosed = true
            // We also clean the completions from the old project
            this.extension.completer.reference.reset()
            this.extension.completer.command.reset()
            this.extension.completer.citation.reset()
        }

        if (prevWatcherClosed || this.fileWatcher === undefined) {
            this.extension.logger.addLogMessage(`Instantiating a new file watcher for ${rootFile}`)
            this.fileWatcher = chokidar.watch(rootFile)
            this.filesWatched.push(rootFile)
            this.fileWatcher.on('change', (filePath: string) => {
                if (path.extname(filePath) === '.tex') {
                    this.findDependentFiles(filePath)
                }
                if (filePath === rootFile) {
                    this.findAdditionalDependentFilesFromFls(filePath)
                }
                this.extension.logger.addLogMessage(`File watcher: responding to change in ${filePath}`)
                const configuration = vscode.workspace.getConfiguration('latex-workshop')
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
                    this.extension.logger.addLogMessage(`Cannot find LaTeX root file.`)
                }
            })
            this.fileWatcher.on('unlink', async (filePath: string) => {
                this.extension.logger.addLogMessage(`File watcher: ${filePath} deleted.`)
                this.fileWatcher.unwatch(filePath)
                this.filesWatched.splice(this.filesWatched.indexOf(filePath), 1)
                if (filePath === rootFile) {
                    this.extension.logger.addLogMessage(`Deleted ${filePath} was root - triggering root search`)
                    await this.findRoot()
                }
            })
            this.findDependentFiles(rootFile)
            this.findAdditionalDependentFilesFromFls(rootFile)
        }
    }

    findDependentFiles(filePath: string, rootDir: string | undefined = undefined, fast = false) {
        if (!rootDir) {
            rootDir = path.dirname(filePath)
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const texDirs = configuration.get('latex.texDirs') as string[]

        this.extension.logger.addLogMessage(`Parsing ${filePath}`)
        const content = this.stripComments(fs.readFileSync(filePath, 'utf-8'), '%')

        const inputReg = /(?:\\(?:input|InputIfFileExists|include|subfile|(?:(?:sub)?import\*?{([^}]*)}))(?:\[[^\[\]\{\}]*\])?){([^}]*)}/g
        this.texFileTree[filePath] = new Set()
        while (true) {
            const result = inputReg.exec(content)
            if (!result) {
                break
            }

            let inputFilePath: string | null
            if (result[0].startsWith('\\subimport')) {
                inputFilePath = this.resolveFile([path.dirname(filePath)], path.join(result[1], result[2]))
            } else if (result[0].startsWith('\\import')) {
                inputFilePath = this.extension.manager.resolveFile([result[1]], result[2])
            } else {
                inputFilePath = this.resolveFile([path.dirname(filePath), rootDir, ...texDirs], result[2])
            }

            if (inputFilePath && fs.existsSync(inputFilePath)) {
                this.texFileTree[filePath].add(inputFilePath)
                if (!fast && this.fileWatcher && this.filesWatched.indexOf(inputFilePath) < 0) {
                    this.extension.logger.addLogMessage(`Adding ${inputFilePath} to file watcher.`)
                    this.fileWatcher.add(inputFilePath)
                    this.filesWatched.push(inputFilePath)
                }
                this.findDependentFiles(inputFilePath, rootDir)
            }
        }

        if (fast) {
            return
        }

        const bibReg = /(?:\\(?:bibliography|addbibresource)(?:\[[^\[\]\{\}]*\])?){(.+?)}|(?:\\putbib)\[(.+?)\]/g
        while (true) {
            const result = bibReg.exec(content)
            if (!result) {
                break
            }
            const bibs = (result[1] ? result[1] : result[2]).split(',').map((bib) => {
                return bib.trim()
            })
            for (const bib of bibs) {
                this.addBibToWatcher(bib, rootDir, this.extension.manager.rootFile)
            }
        }

        this.onFileChange(filePath)
    }

    findAdditionalDependentFilesFromFls(rootFile: string, fast: boolean = false) {
        const rootDir = path.dirname(rootFile)
        const outDir = this.getOutputDir(rootFile)
        const flsFile = path.join(outDir, path.basename(rootFile, '.tex') + '.fls')
        if (! fs.existsSync(flsFile)) {
            this.extension.logger.addLogMessage(`Cannot find file ${flsFile}`)
            return
        } else {
            this.extension.logger.addLogMessage(`Parsing ${flsFile} to compute dependencies`)

        }

        const inputFiles = new Set()
        const outputFiles = new Set()
        const flsContent = fs.readFileSync(flsFile).toString()
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

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const globsToIgnore = configuration.get('latex.watch.files.ignore') as string[]
        inputFiles.forEach(inputFile => {
            // Drop files that are also listed as OUTPUT or should be ignored
            if (outputFiles.has(inputFile) || micromatch.some(inputFile, globsToIgnore)) {
                return
            }
            if (this.texFileTree.hasOwnProperty(rootFile) && this.texFileTree[rootFile].has(inputFile)) {
                return
            }
            const ext = path.extname(inputFile)
            if (ext === '.tex') {
                this.texFileTree[rootFile].add(inputFile)
                this.findDependentFiles(inputFile, rootDir)
            }
            if (this.fileWatcher && this.filesWatched.indexOf(inputFile) < 0) {
                this.extension.logger.addLogMessage(`Adding ${inputFile} to file watcher.`)
                this.fileWatcher.add(inputFile)
                this.filesWatched.push(inputFile)
            }
        })

        outputFiles.forEach(outputFile => {
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
        this.extension.completer.reference.getReferencesTeX(filePath)
        this.extension.completer.citation.getTheBibliographyTeX(filePath)
    }

    addBibToWatcher(bib: string, rootDir: string, rootFile: string | undefined = undefined) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const bibDirs = configuration.get('latex.bibDirs') as string[]
        const bibPath = this.resolveFile([rootDir, ...bibDirs], bib, '.bib')

        if (!bibPath) {
            this.extension.logger.addLogMessage(`Cannot find .bib file ${bib}`)
            return
        }
        this.extension.logger.addLogMessage(`Found .bib file ${bibPath}`)
        if (this.bibWatcher === undefined) {
            this.extension.logger.addLogMessage(`Creating file watcher for .bib files.`)
            this.bibWatcher = chokidar.watch('')
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
                    this.extension.logger.addLogMessage(`Cannot find LaTeX root file.`)
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
}
