import {latexParser, bibtexParser} from 'latex-utensils'
import * as path from 'path'
import * as workerpool from 'workerpool'
import type {Proxy} from 'workerpool'
import type {ISyntaxWorker} from './syntax_worker'

export class UtensilsParser {
    private readonly pool: workerpool.WorkerPool
    private readonly proxy: workerpool.Promise<Proxy<ISyntaxWorker>>

    constructor() {
        this.pool = workerpool.pool(
            path.join(__dirname, 'syntax_worker.js'),
            { minWorkers: 1, maxWorkers: 1, workerType: 'process' }
        )
        this.proxy = this.pool.proxy<ISyntaxWorker>()
    }

    async dispose() {
        await this.pool.terminate()
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
        return (await this.proxy).parseBibtex(s, options).timeout(30000)
    }

    flatten(ast: latexParser.LatexAst) {
        const content = ast.content
        ast.content = []
        let nodeList: latexParser.Node[] = []
        content.forEach((node) => {
            nodeList = [...nodeList, ...this.flattenNode(node)]
        })
        return nodeList
    }

    private flattenNode(node: latexParser.Node) {
        if ((!('content' in node) || typeof node.content === 'string')) {
            return [node]
        }
        const content = node.content
        node.content = []
        let nodeList: latexParser.Node[] = []
        content.forEach((subNode) => {
            nodeList = [...nodeList, ...this.flattenNode(subNode)]
        })
        return nodeList
    }
}
