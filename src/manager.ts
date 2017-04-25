import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as hasbin from 'hasbin'
import * as chokidar from 'chokidar'

import {Extension} from './main'

function pathNotWatched(fileWatcher: chokidar.FSWatcher, filepath: string) {
    const watched = fileWatcher.getWatched()
    const dir = path.dirname(filepath)
    return !(dir in watched) || watched[dir].indexOf(path.basename(filepath)) < 0
}

export class Manager {
    extension: Extension
    rootFile: string
    texFileTree: { [id: string]: Set<string> } = {}
    fileWatcher: chokidar.FSWatcher
    bibWatcher: chokidar.FSWatcher

    constructor(extension: Extension) {
        this.extension = extension
    }

    get rootDir() {
        return path.dirname(this.rootFile)
    }

    tex2pdf(texPath: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const outputDir = configuration.get('latex.outputDir') as string
        return path.resolve(path.dirname(texPath), outputDir, path.basename(`${texPath.substr(0, texPath.lastIndexOf('.'))}.pdf`))
    }

    isTex(filePath: string) {
        return path.extname(filePath) === '.tex'
    }

    findRoot() : string | undefined {
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

        if (!vscode.workspace.rootPath) {
            return undefined
        }

        try {
            const files = fs.readdirSync(vscode.workspace.rootPath)
            for (let file of files) {
                if (path.extname(file) !== '.tex') {
                    continue
                }
                file = path.join(vscode.workspace.rootPath, file)
                const content = fs.readFileSync(file)

                const result = content.toString().match(regex)
                if (result) {
                    file = path.resolve(vscode.workspace.rootPath, file)
                    this.extension.logger.addLogMessage(`Found root file in root directory: ${file}`)
                    return file
                }
            }
        } catch (e) {}
        return undefined
    }

    findAllDependentFiles() {
        let prevWatcherClosed = false
        if (this.fileWatcher !== undefined && pathNotWatched(this.fileWatcher, this.rootFile)) {
            // We have an instantiated fileWatcher, but the rootFile is not being watched.
            // => the user has changed the root. Clean up the old watcher so we reform it.
            this.extension.logger.addLogMessage(`Root file changed -> cleaning up old file watcher.`)
            this.fileWatcher.close()
            prevWatcherClosed = true
        }

        if (prevWatcherClosed || this.fileWatcher === undefined) {
            this.extension.logger.addLogMessage(`Instatiating new file watcher for ${this.rootFile}`)
            this.fileWatcher = chokidar.watch(this.rootFile)
            this.fileWatcher.on('change', (path: string) => {
                this.extension.logger.addLogMessage(`File watcher: responding to change in ${path}`)
                this.findDependentFiles(path)
            })
            this.fileWatcher.on('unlink', (path: string) => {
                this.extension.logger.addLogMessage(`File watcher: ${path} deleted.`)
                this.fileWatcher.unwatch(path)
                if (path === this.rootFile) {
                    this.extension.logger.addLogMessage(`Deleted ${path} was root - triggering root search`)
                    this.findRoot()
                }
            })
            this.findDependentFiles(this.rootFile)
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
                if (pathNotWatched(this.fileWatcher, inputFilePath)) {
                    this.extension.logger.addLogMessage(`Adding ${inputFilePath} to file watcher.`)
                    this.fileWatcher.add(inputFilePath)
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
                let bibPath = path.resolve(path.join(this.rootDir, bib))
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
                            this.extension.completer.citation.parseBibItems(path)
                        })
                        this.bibWatcher.on('unlink', (path: string) => {
                            this.extension.logger.addLogMessage(`Bib file watcher: ${path} deleted.`)
                            this.extension.completer.citation.forgetParsedBibItems(path)
                            this.bibWatcher.unwatch(path)
                        })
                        this.extension.completer.citation.parseBibItems(bibPath)
                    } else if (pathNotWatched(this.bibWatcher, bibPath)) {
                        this.extension.logger.addLogMessage(`Adding .bib file ${bibPath} to bib file watcher.`)
                        this.bibWatcher.add(bibPath)
                        this.extension.completer.citation.parseBibItems(bibPath)
                    } else {
                        this.extension.logger.addLogMessage(`.bib file ${bibPath} is already being watched.`)
                    }
                }
            }
        }

        this.extension.completer.command.getCommandsTeX(filePath)
        this.extension.completer.reference.getReferencesTeX(filePath)
    }

    findBinary(config: string, candidates: string[]) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const configCommand = configuration.get(config) as string
        if (fs.existsSync(configCommand)) {
            return
        }
        hasbin(configCommand, result => {
            if (result) {
                return
            }
            let found = false
            for (const candidate of candidates) {
                if (fs.existsSync(candidate)) {
                    found = true
                    vscode.window.showWarningMessage(`'latex-workshop.${config}' value '${configCommand}' is invalid. \
                                                      LaTeX Workshop found a possible executable file at ${candidate}. \
                                                      Do you want to set it as 'latex-workshop.${config}'?`,
                                                     'Yes').then(msg => {
                        if (msg === 'Yes') {
                            configuration.update(config, candidate, true)
                        }
                    })
                    break
                }
            }
            if (!found) {
                vscode.window.showErrorMessage(`'latex-workshop.${config}' value '${configCommand}' is invalid.`)
            }
        })
    }
}
