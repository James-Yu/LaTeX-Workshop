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

    get rootDir() {
        return path.dirname(this.rootFile)
    }

    get rootFile() {
        const window = vscode.window.activeTextEditor
        if (window && window.document && this.rootOfFiles.hasOwnProperty(window.document.fileName)) {
            const root = this.rootOfFiles[window.document.fileName]
            this.rootFiles[this.workspace] = root
            return root
        }
        return this.rootFiles[this.workspace]
    }

    set rootFile(root: string) {
        this.rootFiles[this.workspace] = root
    }

    tex2pdf(texPath: string, respectOutDir: boolean = true) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const outputDir = respectOutDir ? (configuration.get('latex.outputDir') as string) : './'
        return path.resolve(path.dirname(texPath), outputDir, path.basename(`${texPath.substr(0, texPath.lastIndexOf('.'))}.pdf`))
    }

    isTex(filePath: string) {
        return ['.tex', '.sty', '.cls', '.bbx', '.cbx', '.dtx'].indexOf(path.extname(filePath)) > -1
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
                this.extension.nodeProvider.refresh()
                this.extension.nodeProvider.update()
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
        const regex = /(?:%\s*!\s*T[Ee]X\sroot\s*=\s*([^\s]*\.tex)$)/m
        const content = vscode.window.activeTextEditor.document.getText()

        const result = content.match(regex)
        if (result) {
            const file = path.resolve(path.dirname(vscode.window.activeTextEditor.document.fileName), result[1])
            this.extension.logger.addLogMessage(`Found root file by magic comment: ${file}`)
            return file
        }
        return undefined
    }

    findRootSelf() : string | undefined {
        if (!vscode.window.activeTextEditor) {
            return undefined
        }
        const regex = /\\begin{document}/m
        const content = vscode.window.activeTextEditor.document.getText()
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
        const content = vscode.window.activeTextEditor.document.getText()
        const result = content.match(regex)
        if (result) {
            const file = path.join(path.dirname(vscode.window.activeTextEditor.document.fileName), result[1])
            this.extension.logger.addLogMessage(`Found root file of this subfile from active editor: ${file}`)
            return file
        }
        return undefined
    }

    findRootSaved() : string | undefined {
        const window = vscode.window
        if (window && window.activeTextEditor) {
            if (this.isRoot(this.rootFile, window.activeTextEditor.document.fileName)) {
                return this.rootFile
            } else {
                return undefined
            }
        }
        return this.rootFile
    }

    async findRootDir() : Promise<string | undefined> {
        const regex = /\\begin{document}/m

        if (!this.workspace) {
            return undefined
        }

        try {
            const urls = await vscode.workspace.findFiles('**/*.tex', undefined)
            for (const url of urls) {
                const content = fs.readFileSync(url.fsPath)
                const result = content.toString().match(regex)
                if (result) {
                    const file = url.fsPath
                    this.extension.logger.addLogMessage(`Try root file in root directory: ${file}`)
                    const window = vscode.window
                    if (window && window.activeTextEditor && this.isRoot(url.fsPath, window.activeTextEditor.document.fileName)) {
                        this.extension.logger.addLogMessage(`Found root file in root directory: ${file}`)
                        return file
                    }
                }
            }
        } catch (e) {
            console.log(e)
        }
        return undefined
    }

    isRoot(root: string, file: string, start = true) : boolean {
        if (!fs.existsSync(root)) {
            return false
        }
        if (root === file) {
            return true
        }
        if (start) {
            this.findDependentFiles(root)
        }
        if (!this.texFileTree.hasOwnProperty(root) || !this.texFileTree.hasOwnProperty(file)) {
            return false
        }
        for (const r of this.texFileTree[root]) {
            if (this.isRoot(r, file, false)) {
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
                        this.addBibToWatcher(bib)
                    }
                })
            }
        }
    }

    findDependentFiles(filePath: string, rootDir: string | undefined = undefined) {
        if (!rootDir) {
            rootDir = path.dirname(filePath)
        }
        this.extension.logger.addLogMessage(`Parsing ${filePath}`)
        const content = fs.readFileSync(filePath, 'utf-8')

        const inputReg = /(?:\\(?:input|include|subfile)(?:\[[^\[\]\{\}]*\])?){([^}]*)}/g
        this.texFileTree[filePath] = new Set()
        while (true) {
            const result = inputReg.exec(content)
            if (!result) {
                break
            }
            const inputFile = result[1]
            let inputFilePath = path.resolve(path.join(rootDir, inputFile))
            if (path.extname(inputFilePath) === '') {
                inputFilePath += '.tex'
            }
            if (!fs.existsSync(inputFilePath) && fs.existsSync(inputFilePath + '.tex')) {
                inputFilePath += '.tex'
            }
            if (fs.existsSync(inputFilePath)) {
                this.texFileTree[filePath].add(inputFilePath)
                if (this.fileWatcher && this.watched.indexOf(inputFilePath) < 0) {
                    this.extension.logger.addLogMessage(`Adding ${inputFilePath} to file watcher.`)
                    this.fileWatcher.add(inputFilePath)
                    this.watched.push(inputFilePath)
                }
                this.findDependentFiles(inputFilePath, rootDir)
            }
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
                this.addBibToWatcher(bib)
            }
        }

        this.extension.completer.command.getCommandsTeX(filePath)
        this.extension.completer.reference.getReferencesTeX(filePath)
    }

    addBibToWatcher(bib: string) {
        let bibPath
        if (path.isAbsolute(bib)) {
            bibPath = bib
        } else {
            bibPath = path.resolve(path.join(this.rootDir, bib))
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
}
