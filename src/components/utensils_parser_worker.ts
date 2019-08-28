import {latexParser} from 'latex-utensils'
import * as workerpool from 'workerpool'

function parseLatex(s: string, options: latexParser.ParserOptions) {
    try {
        return latexParser.parse(s, options)
    } catch (e) {
        if (e.name && e.message) {
            console.log(`${e.name}: ${e.message}`)
        }
        return undefined
    }
}

workerpool.worker({
    parseLatex
})
