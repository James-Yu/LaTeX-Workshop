import * as vscode from 'vscode'
import * as path from 'path'
import * as cs from 'cross-spawn'
import * as fs from 'fs-extra'
import * as utils from '../../utils/utils'

import type {Extension} from '../../main'

export class PathUtils {
    private readonly extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    private get rootDir() {
        return this.extension.manager.rootDir
    }

    private getOutDir(texFile: string) {
        return this.extension.manager.getOutDir(texFile)
    }

    parseInputFilePath(regResult: RegExpExecArray, currentFile: string, rootFile: string): string | undefined {
        const texDirs = vscode.workspace.getConfiguration('latex-workshop').get('latex.texDirs') as string[]
        if (regResult[3]) {
            /* Case <<child='...'>>= for Rnw files */
            return utils.resolveFile([path.dirname(currentFile), path.dirname(rootFile), ...texDirs], regResult[3])
        } else {
            /* Standard LaTeX input case */
            if (regResult[0].startsWith('\\subimport') || regResult[0].startsWith('\\subinputfrom') || regResult[0].startsWith('\\subincludefrom')) {
                return utils.resolveFile([path.dirname(currentFile)], path.join(regResult[1], regResult[2]))
            } else if (regResult[0].startsWith('\\import') || regResult[0].startsWith('\\inputfrom') || regResult[0].startsWith('\\includefrom')) {
                return utils.resolveFile([regResult[1], path.join(path.dirname(rootFile), regResult[1])], regResult[2])
            } else {
                return utils.resolveFile([path.dirname(currentFile), path.dirname(rootFile), ...texDirs], regResult[2])
            }
        }
    }

    /**
     * Search for a `.fls` file associated to a tex file
     * @param texFile The path of LaTeX file
     * @return The path of the .fls file or undefined
     */
    getFlsFilePath(texFile: string): string | undefined {
        const rootDir = path.dirname(texFile)
        const outDir = this.getOutDir(texFile)
        const baseName = path.parse(texFile).name
        const flsFile = path.resolve(rootDir, path.join(outDir, baseName + '.fls'))
        if (!fs.existsSync(flsFile)) {
            this.extension.logger.addLogMessage(`Cannot find fls file: ${flsFile}`)
            return undefined
        }
        this.extension.logger.addLogMessage(`Fls file found: ${flsFile}`)
        return flsFile
    }

    parseFlsContent(content: string, rootDir: string): {input: string[], output: string[]} {
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

    resolveBibPath(bib: string, baseDir: string) {
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

}
