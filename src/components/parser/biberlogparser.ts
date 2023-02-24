import * as vscode from 'vscode'
import * as lw from '../../lw'
import type { ILogParser, LogEntry } from './compilerlog'

import { getLogger } from '../logger'

const logger = getLogger('Parser', 'BiberLog')

const bibFileInfo = /^INFO - Found BibTeX data source '(.*)'$/
const lineError = /^ERROR - BibTeX subsystem.*, line (\d+), (.*)$/
const missingEntryWarning = /^WARN - (I didn't find a database entry for '.*'.*)$/
const lineWarning = /^WARN - (.* entry '(.*)' .*)$/

class ParserState {
    rootFile: string
    bibFiles: string[] = []

    constructor(rootFile: string) {
        this.rootFile = rootFile
    }

    getCurrentBibFile(): string {
        const file = this.bibFiles.at(-1)
        if (file) {
            return file
        }
        return this.rootFile
    }
}

class BiberLogParser implements ILogParser {
    buildLog: LogEntry[] = []

    static #instance?: BiberLogParser
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
        const parserState = new ParserState(rootFile)

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        let excludeRegexp: RegExp[]
        try {
            excludeRegexp = (configuration.get('message.biberlog.exclude') as string[]).map(regexp => RegExp(regexp))
        } catch (e) {
            logger.logError('Invalid message.biberlog.exclude config.', e)
            return []
        }
        const lines = log.split('\n')
        this.buildLog = []

        for(const line of lines) {
            this.parseLine(line, parserState, excludeRegexp)
        }

        logger.log(`Logged ${this.buildLog.length} messages.`)
        return this.buildLog
    }

    private parseLine(line: string, parserState: ParserState, excludeRegexp: RegExp[]) {
        let result: RegExpMatchArray | null = null

        result = line.match(bibFileInfo)
        if (result) {
            const filename = this.resolveBibFile(result[1], parserState.rootFile)
            parserState.bibFiles.push(filename)
            logger.log(`Found BibTeX file ${filename}`)
        }

        result = line.match(lineError)
        if (result) {
            const lineNumber = parseInt(result[1], 10)
            const filename = parserState.getCurrentBibFile()
            this.pushLog('error', filename, result[2], lineNumber, excludeRegexp)
            return
        }

        result = line.match(missingEntryWarning)
        if (result) {
            const lineNumber = 1
            const filename = parserState.getCurrentBibFile()
            this.pushLog('warning', filename, result[1], lineNumber, excludeRegexp)
        }

        result = line.match(lineWarning)
        if (result) {
            const keyLocation = this.findKeyLocation(result[2])
            if (keyLocation) {
                this.pushLog('warning', keyLocation.file, result[1], keyLocation.line, excludeRegexp)
            }
        }
    }

    private pushLog(type: string, file: string, message: string, line: number, excludeRegexp: RegExp[]) {
        for (const regexp of excludeRegexp) {
            if (message.match(regexp)) {
                return
            }
        }
        this.buildLog.push({ type, file, text: message, line})
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

export const biberLogParser = BiberLogParser.instance

