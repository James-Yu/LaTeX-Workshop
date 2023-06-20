import { bibtexParser } from 'latex-utensils'
import { bibtexLogParser } from './parserlib/bibtexlog'
import { biberLogParser } from './parserlib/biberlog'
import { latexLogParser } from './parserlib/latexlog'

// Notice that 'Output written on filename.pdf' isn't output in draft mode.
// https://github.com/James-Yu/LaTeX-Workshop/issues/2893#issuecomment-936312853
const latexPattern = /^Output\swritten\son\s(.*)\s\(.*\)\.$/gm
const latexFatalPattern = /Fatal error occurred, no output PDF file produced!/gm

const latexmkPattern = /^Latexmk:\sapplying\srule/gm
const latexmkLog = /^Latexmk:\sapplying\srule/
const latexmkLogLatex = /^Latexmk:\sapplying\srule\s'(pdf|lua|xe)?latex'/
const latexmkUpToDate = /^Latexmk: All targets \(.*\) are up-to-date/m

const texifyPattern = /^running\s(pdf|lua|xe)?latex/gm
const texifyLog = /^running\s((pdf|lua|xe)?latex|miktex-bibtex)/
const texifyLogLatex = /^running\s(pdf|lua|xe)?latex/

const bibtexPattern = /^This is BibTeX, Version.*$/m
const biberPattern = /^INFO - This is Biber .*$/m

/**
 * @param log The log message to parse.
 * @param rootFile The current root file.
 * @returns whether the current compilation is indeed a skipped one in latexmk.
 */
function parseLog(log: string, rootFile?: string): boolean {
    let isLaTeXmkSkipped = false
    // Canonicalize line-endings
    log = log.replace(/(\r\n)|\r/g, '\n')

    if (log.match(bibtexPattern)) {
        bibtexLogParser.parse(log.match(latexmkPattern) ? trimLaTeXmkBibTeX(log) : log, rootFile)
        bibtexLogParser.showLog()
    } else if (log.match(biberPattern)) {
        biberLogParser.parse(log.match(latexmkPattern) ? trimLaTeXmkBiber(log) : log, rootFile)
        biberLogParser.showLog()
    }

    if (log.match(latexmkPattern)) {
        log = trimLaTeXmk(log)
    } else if (log.match(texifyPattern)) {
        log = trimTexify(log)
    }
    if (log.match(latexPattern) || log.match(latexFatalPattern)) {
        latexLogParser.parse(log, rootFile)
        latexLogParser.showLog()
    } else if (latexmkSkipped(log)) {
        isLaTeXmkSkipped = true
    }

    return isLaTeXmkSkipped
}

function trimLaTeXmk(log: string): string {
    return trimPattern(log, latexmkLogLatex, latexmkLog)
}

function trimLaTeXmkBibTeX(log: string): string {
    return trimPattern(log, bibtexPattern, latexmkLogLatex)
}

function trimLaTeXmkBiber(log: string): string {
    return trimPattern(log, biberPattern, latexmkLogLatex)
}

function trimTexify(log: string): string {
    return trimPattern(log, texifyLogLatex, texifyLog)
}


/**
 * Return the lines between the last occurrences of `beginPattern` and `endPattern`.
 * If `endPattern` is not found, the lines from the last occurrence of
 * `beginPattern` up to the end is returned.
 */
function trimPattern(log: string, beginPattern: RegExp, endPattern: RegExp): string {
    const lines = log.split('\n')
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


function latexmkSkipped(log: string): boolean {
    if (log.match(latexmkUpToDate) && !log.match(latexmkPattern)) {
        latexLogParser.showLog()
        bibtexLogParser.showLog()
        biberLogParser.showLog()
        return true
    }
    return false
}

import { getMacroDefs, getEnvDefs } from './parserlib/unified-defs'
import type * as Ast from '@unified-latex/unified-latex-types'
import * as unifiedLaTeXParse from '@unified-latex/unified-latex-util-parse'
import * as unifiedLaTeXArgs from '@unified-latex/unified-latex-util-arguments'

type UnifiedParser = { parse: (content: string) => Ast.Root }
let unifiedParser: UnifiedParser

function unifiedParse(content: string): Ast.Root {
    return (unifiedParser ?? resetUnifiedParser()).parse(content)
}

function unifiedArgsParse(ast?: Ast.Root): Ast.Root | undefined {
    if (ast !== undefined) {
        (unifiedLaTeXArgs.attachMacroArgs as (tree: Ast.Ast, macros: Ast.MacroInfoRecord) => void)(ast, getMacroDefs())
    }
    return ast
}

type UnifiedParserOption = {
    mode?: 'math' | 'regular',
    macros?: Ast.MacroInfoRecord,
    environments?: Ast.EnvInfoRecord,
    flags?: {
        atLetter?: boolean,
        expl3?: boolean,
        autodetectExpl3AndAtLetter?: boolean
    }
}

function resetUnifiedParser(): UnifiedParser {
    unifiedParser = (unifiedLaTeXParse.getParser as (options: UnifiedParserOption) => UnifiedParser)(
        { macros: getMacroDefs(),
          environments: getEnvDefs(),
          flags: { autodetectExpl3AndAtLetter: true } })
    return unifiedParser
}

function parseBibtex(s: string, options?: bibtexParser.ParserOptions): bibtexParser.BibtexAst | undefined {
    return bibtexParser.parse(s, options)
}

export const parser = {
    parseBibtex,
    parseLog,
    unifiedParse,
    unifiedArgsParse,
    resetUnifiedParser
}
