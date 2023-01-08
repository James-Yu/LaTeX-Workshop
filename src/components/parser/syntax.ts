import type {latexParser, bibtexParser} from 'latex-utensils'
import * as path from 'path'
import * as workerpool from 'workerpool'
import type {Proxy} from 'workerpool'
import type {ISyntaxWorker} from './syntax_worker'

export class UtensilsParser {
    private static readonly pool: workerpool.WorkerPool = workerpool.pool(
        path.join(__dirname, 'syntax_worker.js'),
        { minWorkers: 1, maxWorkers: 1, workerType: 'process' }
    )
    private static readonly proxy: workerpool.Promise<Proxy<ISyntaxWorker>> = this.pool.proxy<ISyntaxWorker>()

    static dispose() {
        return {
            dispose: async () => { await UtensilsParser.pool.terminate(true) }
        }
    }

    /**
     * Parse a LaTeX file.
     *
     * @param s The content of a LaTeX file to be parsed.
     * @param options
     * @return undefined if parsing fails
     */
    static async parseLatex(s: string, options?: latexParser.ParserOptions): Promise<latexParser.LatexAst | undefined> {
        return (await UtensilsParser.proxy).parseLatex(s, options).timeout(3000).catch(() => undefined)
    }

    static async parseLatexPreamble(s: string): Promise<latexParser.AstPreamble> {
        return (await UtensilsParser.proxy).parseLatexPreamble(s).timeout(500)
    }

    static async parseBibtex(s: string, options?: bibtexParser.ParserOptions): Promise<bibtexParser.BibtexAst> {
        return (await UtensilsParser.proxy).parseBibtex(s, options).timeout(30000).catch(() => {return { content: [] }})
    }

}
