import {latexParser, bibtexParser} from 'latex-utensils'
import * as workerpool from 'workerpool'

function parseLatex(s: string, options?: latexParser.ParserOptions): latexParser.LatexAst {
    return latexParser.parse(s, options)
}

function parseLatexPreamble(s: string): latexParser.LatexAst {
    return latexParser.parsePreamble(s)
}

function parseBibtex(s: string, options?: bibtexParser.ParserOptions): bibtexParser.BibtexAst {
    return bibtexParser.parse(s, options)
}

workerpool.worker({
    parseLatex,
    parseLatexPreamble,
    parseBibtex
})
