import {latexParser, bibtexParser} from 'latex-utensils'
import * as workerpool from 'workerpool'

function parseLatex(s: string, options?: latexParser.ParserOptions): latexParser.LatexAst {
    return latexParser.parse(s, options)
}

function parseLatexPreamble(s: string, options?: { timeout: number }): latexParser.AstPreamble {
    return latexParser.parsePreamble(s, options)
}

function parseBibtex(s: string, options?: bibtexParser.ParserOptions): bibtexParser.BibtexAst {
    return bibtexParser.parse(s, options)
}

const workers = {
    parseLatex,
    parseLatexPreamble,
    parseBibtex
}

export type ISyntaxWorker = typeof workers

workerpool.worker(workers)
