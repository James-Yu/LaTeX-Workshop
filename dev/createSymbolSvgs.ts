import { readFileSync, writeFileSync } from 'fs'
import * as path from 'path'

type SnippetPanelJsonType = typeof import('../resources/snippetview/snippetpanel.json')

type IMathSymbol = {
    name: string,
    keywords?: string,
    source: string,
    snippet: string,
    category?: string,
    svg?: string,
    shrink?: boolean
}

import type {ConvertOption, SupportedExtension, SvgOption, TexOption} from 'mathjax-full'
import { mathjax } from 'mathjax-full/js/mathjax.js'
import { TeX } from 'mathjax-full/js/input/tex.js'
import { SVG } from 'mathjax-full/js/output/svg.js'
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js'
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js'
import type { LiteElement } from 'mathjax-full/js/adaptors/lite/Element.js'
import type { MathDocument } from 'mathjax-full/js/core/MathDocument.js'
import type { LiteDocument } from 'mathjax-full/js/adaptors/lite/Document.js'
import type { LiteText } from 'mathjax-full/js/adaptors/lite/Text.js'
import 'mathjax-full/js/input/tex/AllPackages.js'


const adaptor = liteAdaptor()
RegisterHTMLHandler(adaptor)

const baseExtensions: SupportedExtension[] = ['ams', 'base', 'color', 'newcommand', 'noerrors', 'noundefined']

const baseTexOption: TexOption = {
    packages: baseExtensions,
    formatError: (_jax, error) => { throw new Error(error.message) }
}
const texInput = new TeX<LiteElement, LiteText, LiteDocument>(baseTexOption)
const svgOption: SvgOption = {fontCache: 'local'}
const svgOutput = new SVG<LiteElement, LiteText, LiteDocument>(svgOption)
const html = mathjax.document('', {InputJax: texInput, OutputJax: svgOutput}) as MathDocument<LiteElement, LiteText, LiteDocument>

const convertOption: ConvertOption = {
    display: true,
    em: 16,
    ex: 8,
    containerWidth: 80*16
}

function loadSnippets() {
    const snipetsFile = path.resolve('.', 'resources', 'snippetview', 'snippetpanel.json')
    const snippets: {
        mathSymbols: {
            [category: string]: IMathSymbol[]
        }
    } = JSON.parse(readFileSync(snipetsFile, { encoding: 'utf8' })) as SnippetPanelJsonType

    Object.values(snippets.mathSymbols).forEach((symbolArray) => {
        symbolArray.forEach((symbol) => {
            if (symbol.svg) {
                return
            }
            const node = html.convert(symbol.source, convertOption) as LiteElement
            let svg = adaptor.innerHTML(node)
            svg = svg.replace(
                /<defs>/,
                `<title>${symbol.name.toLocaleUpperCase()}.${
                    symbol.keywords ? ' Keywords: ' + symbol.keywords : ''
                }</title><defs>`
            )
            if (symbol.shrink) {
                svg = svg.replace(/^<svg/, '<svg class="shrink"')
            }
            symbol.svg = svg
        })
    })
    writeFileSync(snipetsFile, JSON.stringify(snippets, undefined, 4))
    console.log('LaTeX-Workshop: Symbols rendered and cached')
}

loadSnippets()
