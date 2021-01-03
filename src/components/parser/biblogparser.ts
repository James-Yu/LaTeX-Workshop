import * as vscode from 'vscode'
import type { Extension } from '../../main'
import type { LogEntry } from './compilerlog'

const multiLineWarning = /^Warning--(.+)\n--line (\d+) of file (.+)$/gm
const singleLineWarning = /^Warning--(.+) in ([^\s]+)\s*$/gm
const multiLineError = /^(.*)---line (\d+) of file (.*)\n([^]+?)\nI'm skipping whatever remains of this entry$/gm
const badCrossReference = /^(A bad cross reference---entry ".+?"\nrefers to entry.+?, which doesn't exist)$/gm
const multiLineCommandError = /^(.*)\n?---line (\d+) of file (.*)\n([^]+?)\nI'm skipping whatever remains of this command$/gm
const errorAuxFile = /^(.*)---while reading file (.*)$/gm

export class BibLogParser {
    private readonly extension: Extension
    buildLog: LogEntry[] = []
    private readonly compilerDiagnostics = vscode.languages.createDiagnosticCollection('BibTeX')

    constructor(extension: Extension) {
        this.extension = extension
    }

    parse(log: string, rootFile?: string) {
        if (rootFile === undefined) {
            rootFile = this.extension.manager.rootFile
        }
        if (rootFile === undefined) {
            this.extension.logger.addLogMessage('How can you reach this point?')
            return
        }

        this.buildLog = []

        let result = undefined
        while ((result = singleLineWarning.exec(log))) {
            const cites = this.extension.completer.citation.getEntryDict()
            const key = result[2]
            if (key in cites) {
                const filename = cites[key].file
                const line = cites[key].position.line + 1
                this.buildLog.push({ type: 'warning', file: filename, text: result[1], line })
            } else {
                this.extension.logger.addLogMessage(`Cannot find key when parsing BibTeX log: ${key}`)
            }
        }
        while ((result = multiLineWarning.exec(log))) {
            const filename = this.resolveBibFile(result[3], rootFile)
            this.buildLog.push({ type: 'warning', file: filename, text: result[1], line: parseInt(result[2], 10) })
        }
        while ((result = multiLineError.exec(log))) {
            const filename = this.resolveBibFile(result[3], rootFile)
            this.buildLog.push({ type: 'error', file: filename, text: result[1], line: parseInt(result[2], 10) })
        }
        while ((result = multiLineCommandError.exec(log))) {
            const filename = this.resolveBibFile(result[3], rootFile)
            this.buildLog.push({ type: 'error', file: filename, text: result[1], line: parseInt(result[2], 10) })
        }
        while ((result = badCrossReference.exec(log))) {
            this.buildLog.push({ type: 'error', file: rootFile, text: result[1], line: 1 })
        }
        while ((result = errorAuxFile.exec(log))) {
            const filename = this.resolveAuxFile(result[2], rootFile)
            this.buildLog.push({ type: 'error', file: filename, text: result[1], line: 1 })
        }

        this.extension.logger.addLogMessage(`BibTeX log parsed with ${this.buildLog.length} messages.`)
        this.extension.compilerLogParser.showCompilerDiagnostics(this.compilerDiagnostics, this.buildLog, 'BibTeX')
    }

    private resolveAuxFile(filename: string, rootFile: string): string {
        filename = filename.replace('.aux', '.tex')
        if (!(rootFile in this.extension.manager.cachedContent)) {
            return filename
        }
        const texFiles = this.extension.manager.getIncludedTeX(rootFile)
        for (const tex of texFiles) {
            if (tex.endsWith(filename)) {
                return tex
            }
        }
        this.extension.logger.addLogMessage(`Cannot resolve file while parsing BibTeX log: ${filename}`)
        return filename
    }

    private resolveBibFile(filename: string, rootFile: string): string {
        if (!(rootFile in this.extension.manager.cachedContent)) {
            return filename
        }
        const bibFiles = this.extension.manager.getIncludedBib(rootFile)
        for (const bib of bibFiles) {
            if (bib.endsWith(filename)) {
                return bib
            }
        }
        this.extension.logger.addLogMessage(`Cannot resolve file while parsing BibTeX log: ${filename}`)
        return filename
    }

}

