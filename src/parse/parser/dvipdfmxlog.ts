import * as vscode from 'vscode'
import { lw } from '../../lw'
import { type IParser, type LogEntry, showCompilerDiagnostics } from './parserutils'
import { l3backend } from '../../compile/build'


const logger = lw.log('Parser', 'DvipdfmxLog')

const divpdfmxWarn = /^dvipdfmx:warning: (.+)$/
const dvipdfmxContinuedWarn = /^dvipdfmx:warning: >> (.*)$/
const divpdfmxFatal = /^dvipdfmx:fatal: (.+)$/
const dvipdfmxArgsError = /^dvipdfmx: ((Missing argument|Unexpected argument in) .+?|Multiple dvi filenames\?)/
const dvipdfmxConfigError = /^config_special: (Unknown option .+)/
const additionalMessage = /^\s*(CMap name|input str|Font|CMap):/
const noOutputPDF = 'No output PDF file written.'

const latexWorkshopMesg = 'Message from LaTeX Workshop:'

const dvipdfmxDiagnostics = vscode.languages.createDiagnosticCollection('Dvipdfmx')

const buildLog: LogEntry[] = []

export const dvipdfmxLogParser: IParser = {
    clearLog,
    showLog,
    parse
}

function clearLog() {
    dvipdfmxDiagnostics.clear()
}

function showLog() {
    void showCompilerDiagnostics(dvipdfmxDiagnostics, buildLog)
}

type ParserState = {
    currentType?: 'warning' | 'error',
    dvipdfmxBuffer: string[]
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
        excludeRegexp = (configuration.get('message.dvipdfmxlog.exclude') as string[] || []).map(regexp => RegExp(regexp))
    } catch (e) {
        logger.logError('Invalid message.dvipdfmxlog.exclude config.', e)
        return []
    }
    buildLog.length = 0
    const lines = log.split('\n')

    const state: ParserState = {
        currentType: undefined,
        dvipdfmxBuffer: []
    }

    if (l3backend !== 'dvipdfmx') {
        pushLog(
            'warning',
            rootFile,
            `${latexWorkshopMesg} Detected backend: \`${l3backend}'.\nThis document appears to require the dvipdfmx backend.\nPlease specify \`dvipdfmx' in your global options within \\documentclass.`,
            1,
            excludeRegexp
        )
    }

    for (const line of lines) {
        parseLine(line, state, rootFile, excludeRegexp)
    }
    flushLog(state, rootFile, excludeRegexp)

    logger.log(`Logged ${buildLog.length} messages.`)
    return buildLog
}

function parseLine(line: string, state: ParserState, rootFile: string, excludeRegexp: RegExp[]) {
    let result: RegExpMatchArray | null = null

    result = line.match(dvipdfmxContinuedWarn)
    if (result) {
        if (state.currentType !== 'warning') {
            flushLog(state, rootFile, excludeRegexp)
            state.currentType = 'warning'
        }
        state.dvipdfmxBuffer.push(result[1].trim())
        return
    }

    result = line.match(additionalMessage)
    if (result) {
        if (state.currentType !== 'warning') {
            flushLog(state, rootFile, excludeRegexp)
            state.currentType = 'warning'
        }
        line = line.replace(/^\s*/, '\t')
        state.dvipdfmxBuffer.push(line)
        return
    }

    result = line.match(divpdfmxWarn)
    if (result) {
        flushLog(state, rootFile, excludeRegexp)
        state.currentType = 'warning'
        state.dvipdfmxBuffer.push(result[1].trim())
        return
    }

    result = line.match(divpdfmxFatal)
    if (result) {
        flushLog(state, rootFile, excludeRegexp)
        state.currentType = 'error'
        state.dvipdfmxBuffer.push(result[1].trim())
        return
    }

    result = line.match(dvipdfmxArgsError)
    if (result) {
        flushLog(state, rootFile, excludeRegexp)
        state.currentType = 'error'
        state.dvipdfmxBuffer.push(result[1].trim())
        return
    }

    result = line.match(dvipdfmxConfigError)
    if (result) {
        flushLog(state, rootFile, excludeRegexp)
        state.currentType = 'error'
        state.dvipdfmxBuffer.push(result[1].trim())
        return
    }

    if (line.includes(noOutputPDF)) {
        flushLog(state, rootFile, excludeRegexp)
        pushLog('error', rootFile, noOutputPDF, 1, excludeRegexp)
        return
    }
}

function flushLog(state: ParserState, rootFile: string, excludeRegexp: RegExp[]) {
    if (state.currentType && state.dvipdfmxBuffer.length > 0) {
        pushLog(state.currentType, rootFile!, state.dvipdfmxBuffer.join('\n'), 1, excludeRegexp)
    }
    state.dvipdfmxBuffer.length = 0
    state.currentType = undefined
}

function pushLog(type: string, file: string, message: string, line: number, excludeRegexp: RegExp[]) {
    for (const regexp of excludeRegexp) {
        if (message.match(regexp)) {
            return
        }
    }
    buildLog.push({ type, file, text: message, line })
}
