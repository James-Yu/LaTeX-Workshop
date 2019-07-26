import { readFileSync, writeFileSync } from 'fs'
import * as path from 'path'

type IMathSymbol = {
    name: string;
    keywords?: string;
    source: string;
    snippet: string;
    category?: string;
    svg?: string;
    shrink?: boolean;
}

let mathJax: any
import('mathjax-node')
    .then(mj => {
        mathJax = mj
        mj.config({
            MathJax: {
                jax: ['input/TeX', 'output/SVG'],
                extensions: ['tex2jax.js', 'MathZoom.js'],
                showMathMenu: false,
                showProcessingMessages: false,
                messageStyle: 'none',
                SVG: {
                    useGlobalCache: false
                },
                TeX: {
                    extensions: ['AMSmath.js', 'AMSsymbols.js', 'autoload-all.js', 'color.js', 'noUndefined.js']
                }
            }
        })
        mj.start()
    })
    .then(() => {
        loadSnippets()
    })

function loadSnippets() {
    const snipetsFile = path.resolve('.', 'resources', 'snippetpanel', 'snippetpanel.json')
    const snippets: {
        mathSymbols: {
            [category: string]: IMathSymbol[];
        };
    } = JSON.parse(readFileSync(snipetsFile, { encoding: 'utf8' }))

    const mathSymbolPromises: Promise<any>[] = []
    for (const category in snippets.mathSymbols) {
        for (let i = 0; i < snippets.mathSymbols[category].length; i++) {
            const symbol = snippets.mathSymbols[category][i]
            if (symbol.svg === undefined) {
                mathSymbolPromises.push(
                    new Promise((resolve, reject) => {
                        mathJax
                            .typeset({
                                math: symbol.source,
                                format: 'TeX',
                                svgNode: true
                            })
                            .then(
                                (data: {
                                    height: string;
                                    speakText: string;
                                    style: string;
                                    svgNode: SVGSVGElement;
                                    width: string;
                                }) => {
                                    let svg = data.svgNode.outerHTML
                                    svg = svg.replace(
                                        /<title([^>]*)>(.*)<\/title>/,
                                        `<title$1>${symbol.name.toLocaleUpperCase()}.${
                                            symbol.keywords ? ' Keywords: ' + symbol.keywords : ''
                                        }</title>`
                                    )
                                    if (symbol.shrink) {
                                        svg = svg.replace(/^<svg/, '<svg class="shrink"')
                                    }
                                    symbol.svg = svg
                                    resolve()
                                }
                            )
                            .catch(reject)
                    })
                )
            }
        }
    }
    Promise.all(mathSymbolPromises).finally(() => {
        if (mathSymbolPromises.length > 0) {
            writeFileSync(snipetsFile, JSON.stringify(snippets, undefined, 4))
            console.log(`LaTeX-Workshop: ${mathSymbolPromises.length} symbols rendered and cached`)
        }
    })
}
