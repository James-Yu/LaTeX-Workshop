import {Extension} from '../main'
import * as workerpool from 'workerpool'
import {latexParser} from 'latex-utensils'

export class UtensilsParser {
    extension: Extension
    pool: workerpool.WorkerPool
    constructor(extension: Extension) {
        this.extension = extension
        this.pool = workerpool.pool(__dirname + '/utensils_parser_worker.js')
    }

    parseLatex(s: string, options: latexParser.ParserOptions): workerpool.Promise<latexParser.LatexAst> {
        return this.pool.exec('parseLatex', [s, options])
    }
}
