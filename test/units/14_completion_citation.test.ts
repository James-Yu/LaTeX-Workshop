import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { assert, get, mock, set } from './utils'
import { citation, provider } from '../../src/completion/completer/citation'
import type { CitationItem, FileCache } from '../../src/types'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]

    before(() => {
        mock.init(lw, 'root', 'cache', 'parser', 'completion')
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.completion->citation.parse', () => {
        const texPath = get.path(fixture, 'bibitems.tex')
        let cache: FileCache

        beforeEach(async () => {
            await lw.cache.refreshCache(texPath)
            cache = lw.cache.get(texPath)!
            citation.parse(cache)
        })

        it('should parse citations in the form of \\bibitem', () => {
            assert.strictEqual(cache.elements?.bibitem?.length, 10)
        })

        it('should correctly parse the citation keys and labels', () => {
            const bibItem = cache.elements?.bibitem?.[0]

            assert.strictEqual(bibItem?.key, 'smith2023')
            assert.strictEqual(bibItem?.label, 'smith2023')
        })

        it('should correctly set the file and position', () => {
            const bibItem = cache.elements?.bibitem?.[0]

            assert.strictEqual(bibItem?.file, texPath)
            assert.strictEqual(bibItem?.position.line, 4)
            assert.strictEqual(bibItem?.position.character, 0)
        })
    })

    describe('lw.completion->citation.parseBibFile', () => {
        const texPath = get.path(fixture, 'bibitems.tex')
        const bibPath = get.path(fixture, 'bibfile.bib')

        beforeEach(async () => {
            set.config('intellisense.citation.label', 'bibtex key')
            set.root(texPath)
            await lw.cache.refreshCache(texPath)
        })

        it('should parse the bib file', async () => {
            await citation.parseBibFile(bibPath)

            const suggestions = provider.from([''], { uri: vscode.Uri.file(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) })

            assert.ok(suggestions.some(suggestion => suggestion.label === 'miller2024'))
        })

        it('should not parse oversized bib file', async () => {
            set.config('bibtex.maxFileSize', 0)
            await citation.parseBibFile(bibPath)

            const suggestions = provider.from([''], { uri: vscode.Uri.file(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) })

            assert.ok(!suggestions.some(suggestion => suggestion.label === 'miller2024'))
        })

        it('should set and concat string abbreviations', async () => {
            await citation.parseBibFile(bibPath)

            const suggestion = provider.from([''], { uri: vscode.Uri.file(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) }).find(s => s.label === 'miller2025') as CitationItem

            assert.ok(suggestion)
            assert.strictEqual(suggestion.fields.journal, 'Proceedings of the ')
            assert.strictEqual(suggestion.fields.title, 'Proceedings of the Foo')
        })

        it('should deparenthesis', async () => {
            await citation.parseBibFile(bibPath)

            const suggestion = provider.from([''], { uri: vscode.Uri.file(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) }).find(s => s.label === 'miller2025') as CitationItem

            assert.ok(suggestion)
            assert.strictEqual(suggestion.fields.author, 'Jane Miller and Robert Smith')
        })

        it('should handle biblatex ids field', async () => {
            await citation.parseBibFile(bibPath)

            const suggestions = provider.from([''], { uri: vscode.Uri.file(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) })

            assert.ok(suggestions.find(s => s.label === 'miller2024'))
            assert.ok(suggestions.find(s => s.label === 'altid1'))
        })

        it('should handle biblatex ids field with multiple alt names', async () => {
            await citation.parseBibFile(bibPath)

            const suggestions = provider.from([''], { uri: vscode.Uri.file(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) })

            assert.ok(suggestions.find(s => s.label === 'miller2025'))
            assert.ok(suggestions.find(s => s.label === 'altid2'))
            assert.ok(suggestions.find(s => s.label === 'altid3'))
        })
    })
})
