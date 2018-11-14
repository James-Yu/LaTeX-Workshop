import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as chokidar from 'chokidar'
import * as glob from 'glob'

import {Extension} from '../main'


export class Manager {
    extension: Extension
    rootFiles: object
    rootOfFiles: object
    workspace: string
    texFileTree: { [id: string]: Set<string> } = {}
    fileWatcher: chokidar.FSWatcher
    bibWatcher: chokidar.FSWatcher
    watched: string[]

    constructor(extension: Extension) {
        this.extension = extension
        this.watched = []
        this.rootFiles = {}
        this.rootOfFiles = {}
        this.workspace = ''
    }

    getOutputDir(texPath: string) {
        const doc = texPath.replace(/\.tex$/, '').split(path.sep).join('/')
        const docfile = path.basename(texPath, '.tex').split(path.sep).join('/')
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const docker = configuration.get('docker.enabled')
        let outputDir = (configuration.get('latex.outputDir') as string)
        outputDir = outputDir.replace('%DOC%', docker ? docfile : doc)
                    .replace('%DOCFILE%', docfile)
                    .replace('%DIR%', path.dirname(texPath).split(path.sep).join('/'))
        return outputDir
    }

    get rootDir() {
        return path.dirname(this.rootFile)
    }

    get rootFile() {
        const root = this.documentRoot()
        if (root) {
            this.rootFiles[this.workspace] = root
            return root
        }
        return this.rootFiles[this.workspace]
    }

    set rootFile(root: string) {
        this.rootFiles[this.workspace] = root
    }

    documentRoot() {
        const window = vscode.window.activeTextEditor
        if (window && window.document && this.rootOfFiles.hasOwnProperty(window.document.fileName)) {
            return this.rootOfFiles[window.document.fileName]
        }
        return undefined
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
    resolveFile(dirs: string[], inputFile: string) : string | null {
        if (inputFile.startsWith('/')) {
            dirs.unshift('')
        }
        for (const d of dirs) {
            let inputFilePath = path.resolve(path.join(d, inputFile))
            if (path.extname(inputFilePath) === '') {
                inputFilePath += '.tex'
            }
            if (!fs.existsSync(inputFilePath) && fs.existsSync(inputFilePath + '.tex')) {
                inputFilePath += '.tex'
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
        const findMethods = [() => this.findRootMagic(), () => this.findRootSelf(), () => this.findRootSaved(), () => this.findRootDir()]
        for (const method of findMethods) {
            const rootFile = await method()
            if (rootFile !== undefined) {
                if (this.rootFile !== rootFile) {
                    this.extension.logger.addLogMessage(`Root file changed from: ${this.rootFile}. Find all dependencies.`)
                    this.rootFile = rootFile
                    this.findAllDependentFiles(rootFile)
                    this.updateRootOfFiles(rootFile, rootFile)
                } else {
                    this.extension.logger.addLogMessage(`Root file remains unchanged from: ${this.rootFile}.`)
                }
                return rootFile
            }
        }
        return undefined
    }

    updateRootOfFiles(root: string, file: string) {
        if (this.texFileTree.hasOwnProperty(file)) {
            this.rootOfFiles[file] = root
            for (const f of this.texFileTree[file]) {
                this.updateRootOfFiles(root, f)
            }
        }
    }

    findRootMagic() : string | undefined {
        if (!vscode.window.activeTextEditor) {
            return undefined
        }
        const regex = /^(?:%\s*!\s*T[Ee]X\sroot\s*=\s*([^\s]*\.tex)$)/m
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
            const file = path.join(path.dirname(vscode.window.activeTextEditor.document.fileName), result[1])
            this.extension.logger.addLogMessage(`Found root file of this subfile from active editor: ${file}`)
            return file
        }
        return undefined
    }

    findRootSaved() : string | undefined {
        return this.documentRoot()
    }

    async findRootDir() : Promise<string | undefined> {
        const regex = /\\begin{document}/m

        if (!this.workspace) {
            return undefined
        }

        try {
            const urls = await vscode.workspace.findFiles('**/*.tex', undefined)
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
        if (this.fileWatcher !== undefined && this.watched.indexOf(rootFile) < 0) {
            // We have an instantiated fileWatcher, but the rootFile is not being watched.
            // => the user has changed the root. Clean up the old watcher so we reform it.
            this.extension.logger.addLogMessage(`Root file changed -> cleaning up old file watcher.`)
            this.fileWatcher.close()
            this.watched = []
            prevWatcherClosed = true
        }

        if (prevWatcherClosed || this.fileWatcher === undefined) {
            this.extension.logger.addLogMessage(`Instatiating new file watcher for ${rootFile}`)
            this.fileWatcher = chokidar.watch(rootFile)
            this.watched.push(rootFile)
            this.fileWatcher.on('change', (filePath: string) => {
                this.extension.logger.addLogMessage(`File watcher: responding to change in ${filePath}`)
                this.findDependentFiles(filePath)
            })
            this.fileWatcher.on('unlink', async (filePath: string) => {
                this.extension.logger.addLogMessage(`File watcher: ${filePath} deleted.`)
                this.fileWatcher.unwatch(filePath)
                this.watched.splice(this.watched.indexOf(filePath), 1)
                if (filePath === rootFile) {
                    this.extension.logger.addLogMessage(`Deleted ${filePath} was root - triggering root search`)
                    await this.findRoot()
                }
            })
            this.findDependentFiles(rootFile)
            const configuration = vscode.workspace.getConfiguration('latex-workshop')
            const additionalBib = configuration.get('latex.additionalBib') as string[]
            for (const bibGlob of additionalBib) {
                glob(bibGlob, {cwd: this.extension.manager.rootDir}, (err, files) => {
                    if (err) {
                        this.extension.logger.addLogMessage(`Error identifying additional bibfile with glob ${bibGlob}: ${files}.`)
                        return
                    }
                    for (const bib of files) {
                        this.extension.logger.addLogMessage(`Try to watch global bibliography file ${bib}.`)
                        this.addBibToWatcher(bib, this.extension.manager.rootDir)
                    }
                })
            }
        }
    }

    findDependentFiles(filePath: string, rootDir: string | undefined = undefined, fast = false) {
        if (!rootDir) {
            rootDir = path.dirname(filePath)
        }
        this.extension.logger.addLogMessage(`Parsing ${filePath}`)
        const content = this.stripComments(fs.readFileSync(filePath, 'utf-8'), '%')

        const inputReg = /(?:\\(?:input|InputIfFileExists|include|subfile|(?:(?:sub)?import\*?{([^}]*)}))(?:\[[^\[\]\{\}]*\])?){([^}]*)}/g
        this.texFileTree[filePath] = new Set()
        while (true) {
            const result = inputReg.exec(content)
            if (!result) {
                break
            }

            let inputFilePath
            if (result[0].startsWith('\\subimport')) {
                inputFilePath = this.resolveFile([path.dirname(filePath)], path.join(result[1], result[2]))
            } else if (result[0].startsWith('\\import')) {
                inputFilePath = this.extension.manager.resolveFile([result[1]], result[2])
            } else {
                inputFilePath = this.resolveFile([path.dirname(filePath), rootDir], result[2])
            }

            if (fs.existsSync(inputFilePath)) {
                this.texFileTree[filePath].add(inputFilePath)
                if (!fast && this.fileWatcher && this.watched.indexOf(inputFilePath) < 0) {
                    this.extension.logger.addLogMessage(`Adding ${inputFilePath} to file watcher.`)
                    this.fileWatcher.add(inputFilePath)
                    this.watched.push(inputFilePath)
                }
                this.findDependentFiles(inputFilePath, rootDir)
            }
        }

        if (fast) {
            return
        }

        const bibReg = /(?:\\(?:bibliography|addbibresource)(?:\[[^\[\]\{\}]*\])?){(.+?)}/g
        while (true) {
            const result = bibReg.exec(content)
            if (!result) {
                break
            }
            const bibs = result[1].split(',').map((bib) => {
                return bib.trim()
            })
            for (const bib of bibs) {
                this.addBibToWatcher(bib, rootDir)
            }
        }

        this.extension.completer.command.getCommandsTeX(filePath)
        this.extension.completer.reference.getReferencesTeX(filePath)
    }

    addBibToWatcher(bib: string, rootDir: string) {
        let bibPath
        if (path.isAbsolute(bib)) {
            bibPath = bib
        } else {
            bibPath = path.resolve(path.join(rootDir, bib))
        }
        if (path.extname(bibPath) === '') {
            bibPath += '.bib'
        }
        if (!fs.existsSync(bibPath) && fs.existsSync(bibPath + '.bib')) {
            bibPath += '.bib'
        }
        if (fs.existsSync(bibPath)) {
            this.extension.logger.addLogMessage(`Found .bib file ${bibPath}`)
            if (this.bibWatcher === undefined) {
                this.extension.logger.addLogMessage(`Creating file watcher for .bib files.`)
                this.bibWatcher = chokidar.watch(bibPath)
                this.bibWatcher.on('change', (filePath: string) => {
                    this.extension.logger.addLogMessage(`Bib file watcher - responding to change in ${filePath}`)
                    this.extension.completer.citation.parseBibFile(filePath)
                })
                this.bibWatcher.on('unlink', (filePath: string) => {
                    this.extension.logger.addLogMessage(`Bib file watcher: ${filePath} deleted.`)
                    this.extension.completer.citation.forgetParsedBibItems(filePath)
                    this.bibWatcher.unwatch(filePath)
                    this.watched.splice(this.watched.indexOf(filePath), 1)
                })
                this.extension.completer.citation.parseBibFile(bibPath)
            } else if (this.watched.indexOf(bibPath) < 0) {
                this.extension.logger.addLogMessage(`Adding .bib file ${bibPath} to bib file watcher.`)
                this.bibWatcher.add(bibPath)
                this.watched.push(bibPath)
                this.extension.completer.citation.parseBibFile(bibPath)
            } else {
                this.extension.logger.addLogMessage(`.bib file ${bibPath} is already being watched.`)
            }
        }
    }

    setEnvVar() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        process.env['LATEXWORKSHOP_DOCKER_LATEX'] = configuration.get('docker.image.latex') as string
    }
}
