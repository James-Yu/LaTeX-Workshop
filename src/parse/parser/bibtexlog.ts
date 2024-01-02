import * as vscode from 'vscode'
import { lw } from '../../lw'
import { type IParser, type LogEntry, showCompilerDiagnostics } from './parserutils'


const logger = lw.log('Parser', 'BibTeXLog')

const multiLineWarning = /^Warning--(.+)\n--line (\d+) of file (.+)$/gm
const singleLineWarning = /^Warning--(.+) in ([^\s]+)\s*$/gm
const multiLineError = /^(.*)---line (\d+) of file (.*)\n([^]+?)\nI'm skipping whatever remains of this entry$/gm
const badCrossReference = /^(A bad cross reference---entry ".+?"\nrefers to entry.+?, which doesn't exist)$/gm
const multiLineMacroError = /^(.*)\n?---line (\d+) of file (.*)\n([^]+?)\nI'm skipping whatever remains of this command$/gm
const errorAuxFile = /^(.*)---while reading file (.*)$/gm

const bibDiagnostics = vscode.languages.createDiagnosticCollection('BibTeX')

const buildLog: LogEntry[] = []

export const bibtexLogParser: IParser = {
    showLog,
    parse
}

function showLog() {
    showCompilerDiagnostics(bibDiagnostics, buildLog)
}

function parse(log: string, rootFile?: string) {
    if (rootFile === undefined) {
        rootFile = lw.root.file.path
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
    buildLog.length = 0

    let result: RegExpExecArray | null
    while ((result = singleLineWarning.exec(log))) {
        const location = findKeyLocation(result[2])
        if (location) {
            pushLog('warning', location.file, result[1],location.line, excludeRegexp )
        }
    }
    while ((result = multiLineWarning.exec(log))) {
        const filename = resolveBibFile(result[3], rootFile)
        pushLog('warning', filename, result[1], parseInt(result[2], 10), excludeRegexp)
    }
    while ((result = multiLineError.exec(log))) {
        const filename = resolveBibFile(result[3], rootFile)
        pushLog('error', filename, result[1], parseInt(result[2], 10), excludeRegexp)
    }
    while ((result = multiLineMacroError.exec(log))) {
        const filename = resolveBibFile(result[3], rootFile)
        pushLog('error', filename, result[1], parseInt(result[2], 10), excludeRegexp)
    }
    while ((result = badCrossReference.exec(log))) {
        pushLog('error', rootFile, result[1], 1, excludeRegexp)
    }
    while ((result = errorAuxFile.exec(log))) {
        const filename = resolveAuxFile(result[2], rootFile)
        pushLog('error', filename, result[1], 1, excludeRegexp)
    }

    logger.log(`Logged ${buildLog.length} messages.`)
    return buildLog
}

function pushLog(type: string, file: string, message: string, line: number, excludeRegexp: RegExp[]) {
    for (const regexp of excludeRegexp) {
        if (message.match(regexp)) {
            return
        }
    }
    buildLog.push({ type, file, text: message, line})
}

function resolveAuxFile(filename: string, rootFile: string): string {
    filename = filename.replace(/\.aux$/, '.tex')
    if (!lw.cache.get(rootFile)) {
        return filename
    }
    const texFiles = lw.cache.getIncludedTeX(rootFile)
    for (const tex of texFiles) {
        if (tex.endsWith(filename)) {
            return tex
        }
    }
    logger.log(`Cannot resolve file ${filename} .`)
    return filename
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
