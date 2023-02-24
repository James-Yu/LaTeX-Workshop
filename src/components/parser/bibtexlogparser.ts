import * as vscode from 'vscode'
import * as lw from '../../lw'
import type { ILogParser, LogEntry } from './compilerlog'

import { getLogger } from '../logger'

const logger = getLogger('Parser', 'BibtexLog')

const multiLineWarning = /^Warning--(.+)\n--line (\d+) of file (.+)$/gm
const singleLineWarning = /^Warning--(.+) in ([^\s]+)\s*$/gm
const multiLineError = /^(.*)---line (\d+) of file (.*)\n([^]+?)\nI'm skipping whatever remains of this entry$/gm
const badCrossReference = /^(A bad cross reference---entry ".+?"\nrefers to entry.+?, which doesn't exist)$/gm
const multiLineCommandError = /^(.*)\n?---line (\d+) of file (.*)\n([^]+?)\nI'm skipping whatever remains of this command$/gm
const errorAuxFile = /^(.*)---while reading file (.*)$/gm

class BibtexLogParser implements ILogParser {
    buildLog: LogEntry[] = []

    static #instance?: BibtexLogParser
    static get instance() {
        return this.#instance || (this.#instance = new this())
    }
    private constructor() {}

    parse(log: string, rootFile?: string) {
        if (rootFile === undefined) {
            rootFile = lw.manager.rootFile
        }
        if (rootFile === undefined) {
            logger.log('How can you reach this point?')
            return []
        }

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        let excludeRegexp: RegExp[]
        try {
            excludeRegexp = (configuration.get('message.bibtexlog.exclude') as string[]).map(regexp => RegExp(regexp))
        } catch (e) {
            logger.logError('Invalid message.bibtexlog.exclude config.', e)
            return []
        }
        this.buildLog = []

        let result: RegExpExecArray | null
        while ((result = singleLineWarning.exec(log))) {
            const location = this.findKeyLocation(result[2])
            if (location) {
                this.pushLog('warning', location.file, result[1],location.line, excludeRegexp )
            }
        }
        while ((result = multiLineWarning.exec(log))) {
            const filename = this.resolveBibFile(result[3], rootFile)
            this.pushLog('warning', filename, result[1], parseInt(result[2], 10), excludeRegexp)
        }
        while ((result = multiLineError.exec(log))) {
            const filename = this.resolveBibFile(result[3], rootFile)
            this.pushLog('error', filename, result[1], parseInt(result[2], 10), excludeRegexp)
        }
        while ((result = multiLineCommandError.exec(log))) {
            const filename = this.resolveBibFile(result[3], rootFile)
            this.pushLog('error', filename, result[1], parseInt(result[2], 10), excludeRegexp)
        }
        while ((result = badCrossReference.exec(log))) {
            this.pushLog('error', rootFile, result[1], 1, excludeRegexp)
        }
        while ((result = errorAuxFile.exec(log))) {
            const filename = this.resolveAuxFile(result[2], rootFile)
            this.pushLog('error', filename, result[1], 1, excludeRegexp)
        }

        logger.log(`Logged ${this.buildLog.length} messages.`)
        return this.buildLog
    }

    private pushLog(type: string, file: string, message: string, line: number, excludeRegexp: RegExp[]) {
        for (const regexp of excludeRegexp) {
            if (message.match(regexp)) {
                return
            }
        }
        this.buildLog.push({ type, file, text: message, line})
    }

    private resolveAuxFile(filename: string, rootFile: string): string {
        filename = filename.replace(/\.aux$/, '.tex')
        if (!lw.cacher.get(rootFile)) {
            return filename
        }
        const texFiles = lw.cacher.getIncludedTeX(rootFile)
        for (const tex of texFiles) {
            if (tex.endsWith(filename)) {
                return tex
            }
        }
        logger.log(`Cannot resolve file ${filename} .`)
        return filename
    }

    private resolveBibFile(filename: string, rootFile: string): string {
        if (!lw.cacher.get(rootFile)) {
            return filename
        }
        const bibFiles = lw.cacher.getIncludedBib(rootFile)
        for (const bib of bibFiles) {
            if (bib.endsWith(filename)) {
                return bib
            }
        }
        logger.log(`Cannot resolve file ${filename} .`)
        return filename
    }

    private findKeyLocation(key: string): {file: string, line: number} | undefined {
        const entry = lw.completer.citation.getEntry(key)
        if (entry) {
            const file = entry.file
            const line = entry.position.line + 1
            return {file, line}
        } else {
            logger.log(`Cannot find key ${key}`)
            return
        }
    }

}

export const bibtexLogParser = BibtexLogParser.instance

