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

            const suggestions = provider.from([''], { uri: lw.file.toUri(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) })

            assert.ok(suggestions.some(suggestion => suggestion.label === 'miller2024'))
        })

        it('should not parse oversized bib file', async () => {
            set.config('bibtex.maxFileSize', 0)
            await citation.parseBibFile(bibPath)

            const suggestions = provider.from([''], { uri: lw.file.toUri(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) })

            assert.ok(!suggestions.some(suggestion => suggestion.label === 'miller2024'))
        })

        it('should set and concat string abbreviations', async () => {
            await citation.parseBibFile(bibPath)

            const suggestion = provider.from([''], { uri: lw.file.toUri(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) }).find(s => s.label === 'miller2025') as CitationItem

            assert.ok(suggestion)
            assert.strictEqual(suggestion.fields.journal, 'Proceedings of the ')
            assert.strictEqual(suggestion.fields.title, 'Proceedings of the Foo')
        })

        it('should deparenthesis', async () => {
            await citation.parseBibFile(bibPath)

            const suggestion = provider.from([''], { uri: lw.file.toUri(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) }).find(s => s.label === 'miller2025') as CitationItem

            assert.ok(suggestion)
            assert.strictEqual(suggestion.fields.author, 'Jane Miller and Robert Smith')
        })

        it('should handle biblatex ids field', async () => {
            await citation.parseBibFile(bibPath)

            const suggestions = provider.from([''], { uri: lw.file.toUri(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) })

            assert.ok(suggestions.find(s => s.label === 'miller2024'))
            assert.ok(suggestions.find(s => s.label === 'altid1'))
        })

        it('should handle biblatex ids field with multiple alt names', async () => {
            await citation.parseBibFile(bibPath)

            const suggestions = provider.from([''], { uri: lw.file.toUri(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) })

            assert.ok(suggestions.find(s => s.label === 'miller2025'))
            assert.ok(suggestions.find(s => s.label === 'altid2'))
            assert.ok(suggestions.find(s => s.label === 'altid3'))
        })
    })

    describe.only('latex-workshop.intellisense.citation.*', () => {
        const texPath = get.path(fixture, 'bibitems.tex')
        const bibPath = get.path(fixture, 'bibfile.bib')
        beforeEach(async () => {
            set.root(texPath)
            await lw.cache.refreshCache(texPath)
            await citation.parseBibFile(bibPath)
        })

        it('should follow `latex-workshop.intellisense.citation.label`', () => {
            set.config('intellisense.citation.label', 'title')
            let suggestions = provider.from([''], { uri: lw.file.toUri(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) }) as CitationItem[]
            let suggestion = suggestions.find(s => s.label === 'An Overview of Quantum Computing: Challenges and Future Directions')
            assert.ok(suggestion)
            assert.strictEqual(suggestion.label, suggestion.fields.title)

            set.config('intellisense.citation.label', 'bibtex key')
            suggestions = provider.from([''], { uri: lw.file.toUri(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) }) as CitationItem[]
            suggestion = suggestions.find(s => s.label === 'miller2024')
            assert.ok(suggestion)
            assert.strictEqual(suggestion.label, suggestion.key)

            set.config('intellisense.citation.label', 'authors')
            suggestions = provider.from([''], { uri: lw.file.toUri(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) }) as CitationItem[]
            suggestion = suggestions.find(s => s.label === 'Jane Miller and Robert Smith')
            assert.ok(suggestion)
            assert.strictEqual(suggestion.label, suggestion.fields.author)
        })

        it('should follow `latex-workshop.intellisense.citation.filterText`', () => {
            const otherFields = 'Jane Miller and Robert Smith Journal of Advanced Computing 2024 Elsevier'

            set.config('intellisense.citation.filterText', ['title', 'bibtex key'])
            let suggestions = provider.from([''], { uri: lw.file.toUri(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) }) as CitationItem[]
            let suggestion = suggestions.find(s => s.key === 'miller2024')
            assert.ok(suggestion)
            assert.strictEqual(suggestion.filterText, `${suggestion.fields.title} ${suggestion.key}`)

            set.config('intellisense.citation.filterText', ['other fields'])
            suggestions = provider.from([''], { uri: lw.file.toUri(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) }) as CitationItem[]
            suggestion = suggestions.find(s => s.key === 'miller2024')
            assert.ok(suggestion)
            assert.strictEqual(suggestion.filterText, otherFields)

            set.config('intellisense.citation.filterText', ['wrong config'])
            suggestions = provider.from([''], { uri: lw.file.toUri(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) }) as CitationItem[]
            suggestion = suggestions.find(s => s.key === 'miller2024')
            assert.ok(suggestion)
            assert.strictEqual(suggestion.filterText, `${suggestion.key} ${suggestion.fields.title} ${otherFields}`)
        })

        it('should follow `latex-workshop.intellisense.citation.format`', () => {
            set.config('intellisense.citation.format', ['title', 'author'])
            const suggestions = provider.from([''], { uri: lw.file.toUri(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) }) as CitationItem[]
            const suggestion = suggestions.find(s => s.key === 'miller2024')
            assert.ok(suggestion)
            const documentation = (suggestion.documentation as vscode.MarkdownString | undefined)?.value
            assert.ok(documentation?.includes('An Overview of Quantum Computing: Challenges and Future Directions'))
            assert.ok(documentation?.includes('Jane Miller and Robert Smith'))
            assert.ok(!documentation?.includes('Journal of Advanced Computing'))
        })
    })
})
