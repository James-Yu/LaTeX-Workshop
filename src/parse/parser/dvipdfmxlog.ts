import * as vscode from 'vscode'
import { lw } from '../../lw'
import { type IParser, type LogEntry, showCompilerDiagnostics } from './parserutils'
import { l3backend } from '../../compile/build'


const logger = lw.log('Parser', 'DvipdfmxLog')

const divpdfmxWarn = /^x?dvipdfmx:warning: (.+)$/
const dvipdfmxContinuedWarn = /^x?dvipdfmx:warning: >> (.*)$/
const divpdfmxFatal = /^x?dvipdfmx:fatal: (.+)$/
const dvipdfmxArgsError = /^x?dvipdfmx: ((Missing argument|Unexpected argument in) .+?|Multiple dvi filenames\?)/
const dvipdfmxConfigError = /^config_special: (Unknown option .+)/
const additionalMessage = /^\s*(CMap name:|input str:|Font:|CMap:|Current input buffer is)/
const dvipdfmxInfo = /(fontmap|pdf_color|pdf_font|pdf_image|subfont|truetype|otf_cmap|otl_gsub)>> (.*)/
const kpathseaMissfont = 'kpathsea: Appending font creation commands to missfont.log.'
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
    currentType?: 'information' | 'warning' | 'error',
    buffer: string[]
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
        buffer: []
    }

    if (l3backend !== 'dvipdfmx' && l3backend !== 'xetex' && l3backend !== 'unknown') {
        pushLog(
            'information',
            rootFile,
            `${latexWorkshopMesg} Detected l3backend driver: \`${l3backend}'.\nThe build recipe uses dvipdfmx, but the l3backend used in the DVI file generated this time\ndoes not support it. You should add \`dvipdfmx' to option list of  \\documentclass.\n\t\\documentclass[dvipdfmx, ...]{...}`,
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

let infoTag = ''
function parseLine(line: string, state: ParserState, rootFile: string, excludeRegexp: RegExp[]) {
    let result: RegExpMatchArray | null = null

    result = line.match(dvipdfmxContinuedWarn)
    if (result) {
        if (state.currentType !== 'warning') {
            flushLog(state, rootFile, excludeRegexp)
            state.currentType = 'warning'
        }
        state.buffer.push(result[1].trim())
        return
    }

    result = line.match(additionalMessage)
    if (result) {
        if (state.currentType !== 'warning') {
            flushLog(state, rootFile, excludeRegexp)
            state.currentType = 'warning'
        }
        line = line.replace(/^\s*/, '\t')
        state.buffer.push(line)
        return
    }

    result = line.match(dvipdfmxInfo)
    if (result) {
        const tag = result[1]
        const msg = result[2]
        if (state.currentType !== 'information') {
            flushLog(state, rootFile, excludeRegexp)
            infoTag = tag
            state.currentType = 'information'
            state.buffer.push(`${tag}>>\n\t${msg}`)
        } else if (infoTag === tag) {
            state.buffer.push(`\t${msg}`)
        } else {
            flushLog(state, rootFile, excludeRegexp)
            infoTag = tag
            state.currentType = 'information'
            state.buffer.push(`${tag}>>\n\t${msg}`)
        }
        return
    }

    result = line.match(divpdfmxWarn)
    if (result) {
        flushLog(state, rootFile, excludeRegexp)
        state.currentType = 'warning'
        state.buffer.push(result[1].trim())
        return
    }

    result = line.match(divpdfmxFatal)
    if (result) {
        if (result[1] !== 'Cannot proceed without .vf or "physical" font for PDF output...') {
            flushLog(state, rootFile, excludeRegexp)
        }
        state.currentType = 'error'
        state.buffer.push(result[1].trim())
        return
    }

    result = line.match(dvipdfmxArgsError)
    if (result) {
        flushLog(state, rootFile, excludeRegexp)
        state.currentType = 'error'
        state.buffer.push(result[1].trim())
        return
    }

    result = line.match(dvipdfmxConfigError)
    if (result) {
        flushLog(state, rootFile, excludeRegexp)
        state.currentType = 'error'
        state.buffer.push(result[1].trim())
        return
    }

    if (line.match(kpathseaMissfont)) {
        flushLog(state, rootFile, excludeRegexp)
        pushLog('information', rootFile, kpathseaMissfont, 1, excludeRegexp)
        return
    }

    if (line.includes(noOutputPDF)) {
        flushLog(state, rootFile, excludeRegexp)
        pushLog('error', rootFile, line, 1, excludeRegexp)
        return
    }
}

function flushLog(state: ParserState, rootFile: string, excludeRegexp: RegExp[]) {
    if (state.currentType && state.buffer.length > 0) {
        pushLog(state.currentType, rootFile!, state.buffer.join('\n'), 1, excludeRegexp)
    }
    state.buffer.length = 0
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
