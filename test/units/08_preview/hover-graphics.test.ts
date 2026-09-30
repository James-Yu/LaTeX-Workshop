import * as fs from 'fs'
import * as path from 'path'
import * as sinon from 'sinon'
import * as vscode from 'vscode'
import { onGraphics } from '../../../src/preview/hover/ongraphics'
import { assert, get, TextDocument } from '../utils'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const imagePath = get.path('08_preview', 'figure.svg')

    after(() => {
        sinon.restore()
    })

    function makeDocument(content: string): TextDocument {
        const document = new TextDocument(get.path('08_preview', 'main.tex'), content, {})
        const start = content.indexOf('\\includesvg')
        const end = content.indexOf('}', start) + 1
        const range = new vscode.Range(document.positionAt(start), document.positionAt(end))
        sinon.stub(document, 'getWordRangeAtPosition').returns(range)
        return document
    }

    async function previewFor(content: string): Promise<vscode.Hover | undefined> {
        const document = makeDocument(content)
        return onGraphics(document, new vscode.Position(0, content.indexOf('includesvg') + 2))
    }

    it('should preview an extensionless includesvg path with options', async () => {
        const hover = await previewFor('\\includesvg[width=\\textwidth]{hover/figure}')

        assert.ok(hover)
        const markdown = hover.contents[0] as vscode.MarkdownString
        assert.ok(markdown.value.includes('data:image/svg+xml;base64,'))
        assert.strictEqual(markdown.supportHtml, true)
    })

    it('should preview an includesvg path with an explicit SVG extension', async () => {
        const hover = await previewFor('\\includesvg{hover/figure.svg}')

        assert.ok(hover)
        const markdown = hover.contents[0] as vscode.MarkdownString
        const dataUrl = /src="(data:image\/svg\+xml;base64,[^"]+)"/.exec(markdown.value)?.[1]
        assert.ok(dataUrl)
        const decodedSvg = Buffer.from(dataUrl.split(',')[1], 'base64').toString('utf8')
        assert.strictEqual(decodedSvg, fs.readFileSync(imagePath, 'utf8'))
        assert.strictEqual(markdown.supportHtml, true)
    })

    it('should not preview a missing SVG file', async () => {
        const hover = await previewFor('\\includesvg{missing-figure}')

        assert.strictEqual(hover, undefined)
    })
})
