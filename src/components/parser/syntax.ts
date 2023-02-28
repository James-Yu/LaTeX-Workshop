import type {latexParser, bibtexParser} from 'latex-utensils'
import * as path from 'path'
import * as workerpool from 'workerpool'
import type {Proxy} from 'workerpool'
import type {ISyntaxWorker} from './syntax_worker'
import { stripComments } from '../../utils/utils'

class SyntaxParser {
    static #instance?: SyntaxParser
    static get instance() {
        return this.#instance || (this.#instance = new this())
    }
    private constructor() {}

    private readonly pool: workerpool.WorkerPool = workerpool.pool(
        path.join(__dirname, 'syntax_worker.js'),
        { minWorkers: 1, maxWorkers: 1, workerType: 'process' }
    )
    private readonly proxy: workerpool.Promise<Proxy<ISyntaxWorker>> = this.pool.proxy<ISyntaxWorker>()

    dispose() {
        return {
            dispose: async () => { await this.pool.terminate(true) }
        }
    }

    /**
     * Parse a LaTeX file.
     *
     * @param s The content of a LaTeX file to be parsed.
     * @param options
     * @return undefined if parsing fails
     */
    async parseLatex(s: string, options?: latexParser.ParserOptions): Promise<latexParser.LatexAst | undefined> {
        return (await this.proxy).parseLatex(s, options).timeout(3000).catch(() => undefined)
    }

    async parseLatexPreamble(s: string): Promise<latexParser.AstPreamble> {
        return (await this.proxy).parseLatexPreamble(s).timeout(500)
    }

    async parseBibtex(s: string, options?: bibtexParser.ParserOptions): Promise<bibtexParser.BibtexAst> {
        return (await this.proxy).parseBibtex(stripComments(s), options).timeout(30000).catch(() => {return { content: [] }})
    }
}

export const syntaxParser = SyntaxParser.instance
