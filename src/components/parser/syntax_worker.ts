import {latexParser} from 'latex-utensils'
import * as workerpool from 'workerpool'

function parseLatex(s: string, options: latexParser.ParserOptions) {
    try {
        return latexParser.parse(s, options)
    } catch (e) {
        return undefined
    }
}

workerpool.worker({
    parseLatex
})
