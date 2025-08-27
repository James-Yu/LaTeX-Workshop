import * as vscode from 'vscode'
import * as path from 'path'
import * as workerpool from 'workerpool'
import type * as Ast from '@unified-latex/unified-latex-types'
import type { bibtexParser } from 'latex-utensils'
import { lw } from '../lw'
import type { Worker } from './parser/unified'
import { getEnvDefs, getMacroDefs } from './parser/unified-defs'
import { bibtexLogParser } from './parser/bibtexlog'
import { biberLogParser } from './parser/biberlog'
import { latexLogParser } from './parser/latexlog'
// @ts-expect-error Load unified.js from /out/src/...
import { toString } from '../../../resources/unified.js'

const logger = lw.log('Parser')
const bibDiagnostics = vscode.languages.createDiagnosticCollection('BibTeX')

export const parser = {
    bib,
    log,
    tex,
    args,
    stringify,
    reset
}

const pool = workerpool.pool(
    path.join(__dirname, 'parser', 'unified.js'),
    { minWorkers: 1, maxWorkers: 1, workerType: 'thread' }
)
const proxy = pool.proxy<Worker>()

lw.onDispose({ dispose: async () => { await pool.terminate(true) } })

async function tex(content: string): Promise<Ast.Root> {
    return (await proxy).parseLaTeX(content)
}

async function args(ast: Ast.Root): Promise<void> {
    return (await proxy).parseArgs(ast, getMacroDefs())
}

async function reset() {
    return (await proxy).reset(getMacroDefs(), getEnvDefs())
}

async function bib(uri: vscode.Uri, s: string): Promise<bibtexParser.BibtexAst | undefined> {
    const ast = await (await proxy).parseBibTeX(s)
    if (typeof ast === 'string') {
        const err = JSON.parse(ast) as bibtexParser.SyntaxError
        logger.log(`Error when parsing bib file: found ${err.found} from ${err.location.start.line}:${err.location.start.column} to ${err.location.end.line}:${err.location.end.column}.`)
        bibDiagnostics.set(uri, [new vscode.Diagnostic(
            new vscode.Range(
                new vscode.Position(err.location.start.line - 1, err.location.start.column - 1),
                new vscode.Position(err.location.end.line - 1, err.location.end.column - 1)
            ),
            `A BibTeX parsing error occurred. "${err.found}" is unexpected here. No BibTeX entries will be available.`,
            vscode.DiagnosticSeverity.Warning
        )])
        return undefined
    } else {
        bibDiagnostics.set(uri, [])
        return ast
    }
}

function stringify(ast: Ast.Ast): string {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
    return toString(ast)
}


// Notice that 'Output written on filename.pdf' isn't output in draft mode.
// https://github.com/James-Yu/LaTeX-Workshop/issues/2893#issuecomment-936312853
const latexPattern = /^Output\swritten\son\s(.*)\s\(.*\)\.$/gm
const latexFatalPattern = /Fatal error occurred, no output PDF file produced!/gm
const latexIntErrPattern = /^! Internal error: /gm
const latexXeNoOutputPattern = /^No pages of output.$/gm

const latexmkPattern = /^Latexmk:\sapplying\srule/gm
const latexmkLog = /^Latexmk:\sapplying\srule/
const latexmkLogLatex = /^Latexmk:\sapplying\srule\s'(pdf|lua|xe)?latex'/
const latexmkUpToDate = /^Latexmk: All targets \(.*\) are up-to-date/m

const texifyPattern = /^running\s(pdf|lua|xe)?latex/gm
const texifyLog = /^running\s((pdf|lua|xe)?latex|miktex-bibtex)/
const texifyLogLatex = /^running\s(pdf|lua|xe)?latex/

const bibtexPattern = /^This is BibTeX, Version.*$/m
const biberPattern = /^INFO - This is Biber .*$/m
const bibtexPatternAlt = /^The top-level auxiliary file: .*$/m // #4197

/**
 * @param msg The log message to parse.
 * @param rootFile The current root file.
 * @returns whether the current compilation is indeed a skipped one in latexmk.
 */
function log(msg: string, rootFile?: string): boolean {
    let isLaTeXmkSkipped = false
    // Canonicalize line-endings
    msg = msg.replace(/(\r\n)|\r/g, '\n')

    if (msg.match(bibtexPattern)) {
        bibtexLogParser.parse(msg.match(latexmkPattern) ? trimLaTeXmkBibTeX(msg) : msg, rootFile)
        bibtexLogParser.showLog()
    } else if (msg.match(biberPattern)) {
        biberLogParser.parse(msg.match(latexmkPattern) ? trimLaTeXmkBiber(msg) : msg, rootFile)
        biberLogParser.showLog()
    } else if (msg.match(bibtexPatternAlt)) {
        bibtexLogParser.parse(msg.match(latexmkPattern) ? trimLaTeXmkBibTeX(msg) : msg, rootFile)
        bibtexLogParser.showLog()
    }

    if (msg.match(latexmkPattern)) {
        msg = trimLaTeXmk(msg)
    } else if (msg.match(texifyPattern)) {
        msg = trimTexify(msg)
    }
    if (msg.match(latexPattern) || msg.match(latexFatalPattern) || msg.match(latexIntErrPattern) || msg.match(latexXeNoOutputPattern)) {
        latexLogParser.parse(msg, rootFile)
        latexLogParser.showLog()
    } else if (latexmkSkipped(msg)) {
        isLaTeXmkSkipped = true
    }

    return isLaTeXmkSkipped
}

function trimLaTeXmk(msg: string): string {
    return trimPattern(msg, latexmkLogLatex, latexmkLog)
}

function trimLaTeXmkBibTeX(msg: string): string {
    return trimPattern(msg, bibtexPattern, latexmkLogLatex)
}

function trimLaTeXmkBiber(msg: string): string {
    return trimPattern(msg, biberPattern, latexmkLogLatex)
}

function trimTexify(msg: string): string {
    return trimPattern(msg, texifyLogLatex, texifyLog)
}


/**
 * Return the lines between the last occurrences of `beginPattern` and `endPattern`.
 * If `endPattern` is not found, the lines from the last occurrence of
 * `beginPattern` up to the end is returned.
 */
function trimPattern(msg: string, beginPattern: RegExp, endPattern: RegExp): string {
    const lines = msg.split('\n')
    let startLine = -1
    let finalLine = -1
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index]
        let result = line.match(beginPattern)
        if (result) {
            startLine = index
        }
        result = line.match(endPattern)
        if (result) {
            finalLine = index
        }
    }
    if (finalLine <= startLine) {
        return lines.slice(startLine).join('\n')
    } else {
        return lines.slice(startLine, finalLine).join('\n')
    }
}


function latexmkSkipped(msg: string): boolean {
    if (msg.match(latexmkUpToDate) && !msg.match(latexmkPattern)) {
        latexLogParser.showLog()
        bibtexLogParser.showLog()
        biberLogParser.showLog()
        return true
    }
    return false
}
