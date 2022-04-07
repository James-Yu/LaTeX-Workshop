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
        let nodes: latexParser.Node[] = []
        ast.content.forEach((node) => {
            nodes = [...nodes, ...this.flattenNode(node)]
        })
        return nodes
    }

    filter(ast: latexParser.LatexAst | Extract<latexParser.Node, {content: latexParser.Node[]}>, envs: string[], cmds: string[], subContents = true) {
        const content: latexParser.Node[] = []
        ast.content.forEach(node => {
            if (latexParser.isCommand(node) && cmds.includes(node.name)) {
                content.push(node)
            }
            if (latexParser.isEnvironment(node) && envs.includes(node.name)) {
                content.push(node)
            }
            if (subContents && latexParser.hasContentArray(node)) {
                const subContent = this.filter(node, envs, cmds)
                node.content = subContent
                if (subContent.length > 0 ) {
                    content.push(node)
                }
            }
        })
        return content
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
