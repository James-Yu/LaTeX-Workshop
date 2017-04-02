import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as chokidar from 'chokidar'

import {Extension} from './main'

export class Manager {
    extension: Extension
    rootFile: string
    texFileTree: { [id: string]: Set<string> } = {}
    bibFileTree: { [id: string]: Set<string> } = {}
    fileWatcher
    bibWatcher

    constructor(extension: Extension) {
        this.extension = extension
    }

    get rootDir() {
        return path.dirname(this.rootFile)
    }

    tex2pdf(texPath) {
        return `${texPath.substr(0, texPath.lastIndexOf('.'))}.pdf`
    }

    isTex(filePath) {
        return path.extname(filePath) === '.tex'
    }

    findRoot() : string | undefined {
        let findMethods = [() => this.findRootMagic(), () => this.findRootSelf(), () => this.findRootSaved(), () => this.findRootDir()]
        for (let method of findMethods) {
            let rootFile = method()
            if (rootFile !== undefined) {
                if (this.rootFile !== rootFile){
                    this.extension.logger.addLogMessage(`Root file changed from: ${this.rootFile}. Find all dependencies.`)
                    this.rootFile = rootFile
                    this.findAllDependentFiles()
                }
                return rootFile
            }
        }
        return undefined
    }

    findRootMagic() : string | undefined {
        if (!vscode.window.activeTextEditor)
            return undefined
        let regex = /(?:%\s*!\s*TEX\sroot\s*=\s*([^\s]*\.tex)$)/m
        let content = vscode.window.activeTextEditor.document.getText()

        let result = content.match(regex)
        if (result) {
            let file = path.resolve(path.dirname(vscode.window.activeTextEditor.document.fileName), result[1])
            this.extension.logger.addLogMessage(`Found root file by magic comment: ${file}`)
            return file
        }
        return undefined
    }

    findRootSelf() : string | undefined {
        if (!vscode.window.activeTextEditor)
            return undefined
        let regex = /\\begin{document}/m
        let content = vscode.window.activeTextEditor.document.getText()
        let result = content.match(regex)
        if (result) {
            let file = vscode.window.activeTextEditor.document.fileName
            this.extension.logger.addLogMessage(`Found root file from active editor: ${file}`)
            return file
        }
        return undefined
    }

    findRootSaved() : string | undefined {
        return this.rootFile
    }

    findRootDir() : string | undefined {
        let regex = /\\begin{document}/m

        try {
            let files = fs.readdirSync(vscode.workspace.rootPath)
            for (let file of files) {
                if (path.extname(file) != '.tex')
                    continue
                file = path.join(vscode.workspace.rootPath, file)
                let content = fs.readFileSync(file)

                let result = content.toString().match(regex)
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
        if (this.fileWatcher === undefined) {
            this.fileWatcher = chokidar.watch(this.rootFile).on('change', path => this.findDependentFiles(path))
            this.fileWatcher = chokidar.watch(this.rootFile).on('unlink', path => this.fileWatcher.unwatch(this.rootFile))
            this.findDependentFiles(this.rootFile)
        } else if (this.fileWatcher.getWatched().indexOf(this.rootFile) < 0) {
            this.fileWatcher.add(this.rootFile)
            this.findDependentFiles(this.rootFile)
        }
    }

    findDependentFiles(filePath: string) {
        this.extension.logger.addLogMessage(`${filePath} content changed.`)
        let content = fs.readFileSync(filePath, 'utf-8')
        let rootDir = path.dirname(this.rootFile)

        let inputReg = /(?:\\(?:input|include|subfile)(?:\[[^\[\]\{\}]*\])?){([^}]*)}/g
        this.texFileTree[filePath] = new Set()
        while (true) {
            let result = inputReg.exec(content)
            if (!result)
                break
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
                if (this.fileWatcher.getWatched().indexOf(inputFilePath) < 0) {
                    this.fileWatcher.add(inputFilePath)
                    this.findDependentFiles(inputFilePath)
                }
            }
        }

        let bibReg = /(?:\\(?:bibliography|addbibresource)(?:\[[^\[\]\{\}]*\])?){(.+?)}/g
        this.bibFileTree[filePath] = new Set()
        while (true) {
            let result = bibReg.exec(content)
            if (!result)
                break
            let bibs = result[1].split(',').map((bib) => {
                return bib.trim()
            })
            for (let bib of bibs) {
                let bibPath = path.resolve(path.join(rootDir, bib))
                if (path.extname(bibPath) === '') {
                    bibPath += '.bib'
                }
                if (!fs.existsSync(bibPath) && fs.existsSync(bibPath + '.bib')) {
                    bibPath += '.bib'
                }
                if (fs.existsSync(bibPath)) {
                    this.bibFileTree[filePath].add(bibPath)
                    if (this.bibWatcher === undefined) {
                        this.bibWatcher = chokidar.watch(bibPath).on('change', path => this.extension.completer.citation.getBibItems(bibPath))
                        this.bibWatcher = chokidar.watch(bibPath).on('unlink', path => this.bibWatcher.unwatch(bibPath))
                        this.extension.completer.citation.getBibItems(bibPath)
                    } else if (this.bibWatcher.getWatched().indexOf(bibPath) < 0) {
                        this.bibWatcher.add(bibPath)
                        this.extension.completer.citation.getBibItems(bibPath)
                    }
                }
            }
        }

        this.extension.completer.command.getCommandsTeX(filePath)
        this.extension.completer.reference.getReferencesTeX(filePath)
    }
}
