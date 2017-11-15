import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as chokidar from 'chokidar'

import {Extension} from '../main'

export class Manager {
    extension: Extension
    rootFiles: object
    workspace: string
    texFileTree: { [id: string]: Set<string> } = {}
    fileWatcher: chokidar.FSWatcher
    bibWatcher: chokidar.FSWatcher
    watched: string[]

    constructor(extension: Extension) {
        this.extension = extension
        this.watched   = []
        this.rootFiles = {}
        this.workspace = ''
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

    tex2pdf(texPath: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const outputDir = configuration.get('latex.outputDir') as string
        return path.resolve(path.dirname(texPath), outputDir, path.basename(`${texPath.substr(0, texPath.lastIndexOf('.'))}.pdf`))
    }

    isTex(filePath: string) {
        return ['.tex', '.sty', '.cls', '.bbx', '.cbx'].indexOf(path.extname(filePath)) > -1
    }

    updateWorkspace() {
        let wsroot = vscode.workspace.rootPath
        if (vscode.window.activeTextEditor && vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)) {
            wsroot = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri).uri.fsPath
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

    findRoot() : string | undefined {
        this.updateWorkspace()
        const findMethods = [() => this.findRootMagic(), () => this.findRootSelf(), () => this.findRootSaved(), () => this.findRootDir()]
        for (const method of findMethods) {
            const rootFile = method()
            if (rootFile !== undefined) {
                if (this.rootFile !== rootFile) {
                    this.extension.logger.addLogMessage(`Root file changed from: ${this.rootFile}. Find all dependencies.`)
                    this.rootFile = rootFile
                    this.findAllDependentFiles()
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

    findRootSaved() : string | undefined {
        return this.rootFile
    }

    findRootDir() : string | undefined {
        const regex = /\\begin{document}/m

        if (!this.workspace) {
            return undefined
        }

        try {
            const files = fs.readdirSync(this.workspace)
            for (let file of files) {
                if (path.extname(file) !== '.tex') {
                    continue
                }
                file = path.join(this.workspace, file)
                const content = fs.readFileSync(file)

                const result = content.toString().match(regex)
                if (result) {
                    file = path.resolve(this.workspace, file)
                    this.extension.logger.addLogMessage(`Found root file in root directory: ${file}`)
                    return file
                }
            }
        } catch (e) {}
        return undefined
    }

    findAllDependentFiles() {
        let prevWatcherClosed = false
        if (this.fileWatcher !== undefined && this.watched.indexOf(this.rootFile) < 0) {
            // We have an instantiated fileWatcher, but the rootFile is not being watched.
            // => the user has changed the root. Clean up the old watcher so we reform it.
            this.extension.logger.addLogMessage(`Root file changed -> cleaning up old file watcher.`)
            this.fileWatcher.close()
            this.watched = []
            prevWatcherClosed = true
        }

        if (prevWatcherClosed || this.fileWatcher === undefined) {
            this.extension.logger.addLogMessage(`Instatiating new file watcher for ${this.rootFile}`)
            this.fileWatcher = chokidar.watch(this.rootFile)
            this.watched.push(this.rootFile)
            this.fileWatcher.on('change', (path: string) => {
                this.extension.logger.addLogMessage(`File watcher: responding to change in ${path}`)
                this.findDependentFiles(path)
            })
            this.fileWatcher.on('unlink', (path: string) => {
                this.extension.logger.addLogMessage(`File watcher: ${path} deleted.`)
                this.fileWatcher.unwatch(path)
                this.watched.splice(this.watched.indexOf(path), 1)
                if (path === this.rootFile) {
                    this.extension.logger.addLogMessage(`Deleted ${path} was root - triggering root search`)
                    this.findRoot()
                }
            })
            this.findDependentFiles(this.rootFile)
            const configuration = vscode.workspace.getConfiguration('latex-workshop')
            const additionalBib = configuration.get('latex.additionalBib') as string[]
            for (const bib of additionalBib) {
                this.extension.logger.addLogMessage(`Try to watch global bibliography file ${bib}.`)
                this.addBibToWatcher(bib)
            }
        }
    }

    findDependentFiles(filePath: string) {
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
            let inputFilePath = path.resolve(path.join(this.rootDir, inputFile))
            if (path.extname(inputFilePath) === '') {
                inputFilePath += '.tex'
            }
            if (!fs.existsSync(inputFilePath) && fs.existsSync(inputFilePath + '.tex')) {
                inputFilePath += '.tex'
            }
            if (fs.existsSync(inputFilePath)) {
                this.texFileTree[filePath].add(inputFilePath)
                if (this.watched.indexOf(inputFilePath) < 0) {
                    this.extension.logger.addLogMessage(`Adding ${inputFilePath} to file watcher.`)
                    this.fileWatcher.add(inputFilePath)
                    this.watched.push(inputFilePath)
                    this.findDependentFiles(inputFilePath)
                }
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
                this.bibWatcher.on('change', (path: string) => {
                    this.extension.logger.addLogMessage(`Bib file watcher - responding to change in ${path}`)
                    this.extension.completer.citation.parseBibFile(path)
                })
                this.bibWatcher.on('unlink', (path: string) => {
                    this.extension.logger.addLogMessage(`Bib file watcher: ${path} deleted.`)
                    this.extension.completer.citation.forgetParsedBibItems(path)
                    this.bibWatcher.unwatch(path)
                    this.watched.splice(this.watched.indexOf(path), 1)
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
