'use strict'

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

import {Extension} from './main'

export class Manager {
    extension: Extension
    rootFile: string
    texFiles: Set<string>
    bibFiles: Set<string>

    findAllDependentFilesTime: number

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
        if (path.extname(filePath) == '.tex')
            return true
        return false
    }

    findRoot() : string | undefined {
        let findMethods = [() => this.findRootMagic(), () => this.findRootSelf(), () => this.findRootSaved(), () => this.findRootDir()]
        for (let method of findMethods) {
            let rootFile = method()
            if (rootFile !== undefined) {
                this.rootFile = rootFile
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
        if (Date.now() - this.findAllDependentFilesTime < 1000)
            return
        this.findAllDependentFilesTime = Date.now()
        if (this.rootFile === undefined)
            this.findRoot()
        if (this.rootFile === undefined)
            return
        this.texFiles = new Set<string>()
        this.texFiles.add(this.rootFile)
        this.bibFiles = new Set<string>()
        this.findDependentFiles(this.rootFile)
    }

    findDependentFiles(filePath: string) {
        let content = fs.readFileSync(filePath, 'utf-8')
        let rootDir = path.dirname(this.rootFile)

        let inputReg = /(?:\\(?:input|include|subfile)(?:\[[^\[\]\{\}]*\])?){([^}]*)}/g
        while (true) {
            let result = inputReg.exec(content)
            if (!result)
                break
            const inputFile = result[1]
            let inputFilePath = path.resolve(path.join(rootDir, inputFile))
            if (path.extname(inputFilePath) === '') {
                inputFilePath += '.tex'
            }
            if (!this.texFiles.has(inputFilePath)) {
                this.texFiles.add(inputFilePath)
                try {
                    this.findDependentFiles(inputFilePath)
                } catch (err) {
                    if (err.code === 'ENOENT' || err.code === 'EISDIR') {
                        this.texFiles.delete(inputFilePath)
                        if (path.extname(inputFilePath) !== '.tex') {
                            inputFilePath += '.tex'
                            this.texFiles.add(inputFilePath)
                            this.findDependentFiles(inputFilePath)
                        } else {
                            this.extension.logger.addLogMessage(`File not found: ${inputFilePath}`)
                        }
                    }
                }
            }
        }

        let bibReg = /(?:\\(?:bibliography|addbibresource)(?:\[[^\[\]\{\}]*\])?){(.+?)}/g
        while (true) {
            let result = bibReg.exec(content)
            if (!result)
                break
            let bibs = result[1].split(',').map((bib) => {
                return bib.trim()
            })
            for (let bib of bibs) {
                if (path.extname(bib) === '')
                    bib += '.bib'
                let bibPath = path.resolve(path.join(rootDir, bib))
                this.bibFiles.add(bibPath)
            }
        }
    }
}