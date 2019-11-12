import {latexParser, bibtexParser} from 'latex-utensils'
import * as workerpool from 'workerpool'

function parseLatex(s: string, options?: latexParser.ParserOptions): latexParser.LatexAst {
    return latexParser.parse(s, options)
}

function parseBibtex(s: string, options?: bibtexParser.ParserOptions): bibtexParser.BibtexAst {
    return bibtexParser.parse(s, options)
}

workerpool.worker({
    parseLatex,
    parseBibtex
})
