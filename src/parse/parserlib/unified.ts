import * as workerpool from 'workerpool'
import type * as Ast from '@unified-latex/unified-latex-types'
import * as unifiedLaTeXParse from '@unified-latex/unified-latex-util-parse'
import * as unifiedLaTeXArgs from '@unified-latex/unified-latex-util-arguments'
import { bibtexParser } from 'latex-utensils'

type UnifiedParser = { parse: (content: string) => Ast.Root }
let unifiedParser: UnifiedParser = unifiedLaTeXParse.getParser({ flags: { autodetectExpl3AndAtLetter: true } })

function parseLaTeX(content: string): Ast.Root {
    return unifiedParser.parse(content)
}

function parseArgs(ast: Ast.Root, macros: Ast.MacroInfoRecord) {
    unifiedLaTeXArgs.attachMacroArgs(ast, macros)
}

function reset(macros: Ast.MacroInfoRecord, environments: Ast.EnvInfoRecord) {
    unifiedParser = unifiedLaTeXParse.getParser({ macros, environments, flags: { autodetectExpl3AndAtLetter: true } })
}

function parseBibTeX(s: string, options?: bibtexParser.ParserOptions): bibtexParser.BibtexAst {
    return bibtexParser.parse(s, options)
}

const worker = {
    parseLaTeX,
    parseArgs,
    reset,
    parseBibTeX
}

workerpool.worker(worker)

export type Worker = typeof worker
