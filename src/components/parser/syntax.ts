import {Extension} from '../../main'
import * as path from 'path'
import * as workerpool from 'workerpool'
import {latexParser} from 'latex-utensils'

export class UtensilsParser {
    extension: Extension
    pool: workerpool.WorkerPool
    constructor(extension: Extension) {
        this.extension = extension
        this.pool = workerpool.pool(
            path.join(__dirname, 'syntax_worker.js'),
            { maxWorkers: 1 }
        )
    }

    parseLatex(s: string, options: latexParser.ParserOptions): workerpool.Promise<latexParser.LatexAst | undefined> {
        return this.pool.exec('parseLatex', [s, options])
    }
}
