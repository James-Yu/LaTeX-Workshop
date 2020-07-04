import {latexParser, bibtexParser} from 'latex-utensils'
import * as path from 'path'
import * as workerpool from 'workerpool'
import {Proxy} from 'workerpool'
import {Extension} from '../../main'
import {ISyntaxWorker} from './syntax_worker'

export class UtensilsParser {
    extension: Extension
    pool: workerpool.WorkerPool
    proxy: workerpool.Promise<Proxy<ISyntaxWorker>>

    constructor(extension: Extension) {
        this.extension = extension
        this.pool = workerpool.pool(
            path.join(__dirname, 'syntax_worker.js'),
            { minWorkers: 1, maxWorkers: 1, workerType: 'process' }
        )
        this.proxy = this.pool.proxy<ISyntaxWorker>()
    }

    /**
     * Parse a LaTeX file. Returns `undefined` if the parsing fails.
     *
     * @param s The content of a LaTeX file to be parsed.
     * @param options
     */
    async parseLatex(s: string, options?: latexParser.ParserOptions): Promise<latexParser.LatexAst | undefined> {
        return (await this.proxy).parseLatex(s, options).timeout(3000).catch(() => undefined)
    }

    async parseLatexPreamble(s: string): Promise<latexParser.AstPreamble> {
        return (await this.proxy).parseLatexPreamble(s).timeout(500)
    }

    async parseBibtex(s: string, options?: bibtexParser.ParserOptions): Promise<bibtexParser.BibtexAst> {
        return (await this.proxy).parseBibtex(s, options).timeout(30000)
    }

}
