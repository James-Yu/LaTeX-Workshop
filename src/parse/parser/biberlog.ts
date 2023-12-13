import * as vscode from 'vscode'
import { lw } from '../../lw'
import { type IParser, type LogEntry, showCompilerDiagnostics } from './parserutils'


const logger = lw.log('Parser', 'BiberLog')

const bibFileInfo = /^INFO - Found BibTeX data source '(.*)'$/
const lineError = /^ERROR - BibTeX subsystem.*, line (\d+), (.*)$/
const missingEntryWarning = /^WARN - (I didn't find a database entry for '.*'.*)$/
const lineWarning = /^WARN - (.* entry '(.*)' .*)$/

const biberDiagnostics = vscode.languages.createDiagnosticCollection('Biber')

const buildLog: LogEntry[] = []

export const biberLogParser: IParser = {
    showLog,
    parse
}

function showLog() {
    showCompilerDiagnostics(biberDiagnostics, buildLog)
}

function parse(log: string, rootFile?: string) {
    if (rootFile === undefined) {
        rootFile = lw.root.file.path
    }
    if (rootFile === undefined) {
        logger.log('How can you reach this point?')
        return []
    }
    const bibFileStack = [ rootFile ]

    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    let excludeRegexp: RegExp[]
    try {
        excludeRegexp = (configuration.get('message.biberlog.exclude') as string[]).map(regexp => RegExp(regexp))
    } catch (e) {
        logger.logError('Invalid message.biberlog.exclude config.', e)
        return []
    }
    const lines = log.split('\n')
    buildLog.length = 0

    for(const line of lines) {
        parseLine(line, bibFileStack, excludeRegexp)
    }

    logger.log(`Logged ${buildLog.length} messages.`)
    return buildLog
}

function parseLine(line: string, bibFileStack: string[], excludeRegexp: RegExp[]) {
    let result: RegExpMatchArray | null = null

    result = line.match(bibFileInfo)
    if (result) {
        const filename = resolveBibFile(result[1], bibFileStack[0])
        bibFileStack.push(filename)
        logger.log(`Found BibTeX file ${filename}`)
    }

    result = line.match(lineError)
    if (result) {
        const lineNumber = parseInt(result[1], 10)
        const filename = bibFileStack.at(-1) || bibFileStack[0]
        pushLog('error', filename, result[2], lineNumber, excludeRegexp)
        return
    }

    result = line.match(missingEntryWarning)
    if (result) {
        const lineNumber = 1
        const filename = bibFileStack.at(-1) || bibFileStack[0]
        pushLog('warning', filename, result[1], lineNumber, excludeRegexp)
    }

    result = line.match(lineWarning)
    if (result) {
        const keyLocation = findKeyLocation(result[2])
        if (keyLocation) {
            pushLog('warning', keyLocation.file, result[1], keyLocation.line, excludeRegexp)
        }
    }
}

function pushLog(type: string, file: string, message: string, line: number, excludeRegexp: RegExp[]) {
    for (const regexp of excludeRegexp) {
        if (message.match(regexp)) {
            return
        }
    }
    buildLog.push({ type, file, text: message, line})
}

function resolveBibFile(filename: string, rootFile: string): string {
    if (!lw.cache.get(rootFile)) {
        return filename
    }
    const bibFiles = lw.cache.getIncludedBib(rootFile)
    for (const bib of bibFiles) {
        if (bib.endsWith(filename)) {
            return bib
        }
    }
    logger.log(`Cannot resolve file ${filename} .`)
    return filename
}

function findKeyLocation(key: string): {file: string, line: number} | undefined {
    const entry = lw.completion.citation.getItem(key)
    if (entry) {
        const file = entry.file
        const line = entry.position.line + 1
        return {file, line}
    } else {
        logger.log(`Cannot find key ${key}`)
        return
    }
}
