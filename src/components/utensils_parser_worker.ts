import {latexParser} from 'latex-utensils'
import * as workerpool from 'workerpool'

function parseLatex(s: string, options: latexParser.ParserOptions) {
    return latexParser.parse(s, options)
}

workerpool.worker({
    parseLatex
})
