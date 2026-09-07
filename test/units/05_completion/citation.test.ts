import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../../src/lw'
import { assert, get, mock, set } from '../utils'
import { citation, provider } from '../../../src/completion/completer/citation'
import type { CitationItem, FileCache } from '../../../src/types'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = get.fixture(__filename)

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

    describe('latex-workshop.intellisense.citation.*', () => {
        const texPath = get.path(fixture, 'bibitems.tex')
        const bibPath = get.path(fixture, 'bibfile.bib')
        beforeEach(async () => {
            set.root(texPath)
            await lw.cache.refreshCache(texPath)
            await citation.parseBibFile(bibPath)
        })

        it('should follow `latex-workshop.intellisense.citation.label`', () => {
            set.config('intellisense.citation.label', 'title')
            let suggestions = provider.from([''], { uri: vscode.Uri.file(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) }) as CitationItem[]
            let suggestion = suggestions.find(s => s.label === 'An Overview of Quantum Computing: Challenges and Future Directions')
            assert.ok(suggestion)
            assert.strictEqual(suggestion.label, suggestion.fields.title)

            set.config('intellisense.citation.label', 'bibtex key')
            suggestions = provider.from([''], { uri: vscode.Uri.file(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) }) as CitationItem[]
            suggestion = suggestions.find(s => s.label === 'miller2024')
            assert.ok(suggestion)
            assert.strictEqual(suggestion.label, suggestion.key)

            set.config('intellisense.citation.label', 'authors')
            suggestions = provider.from([''], { uri: vscode.Uri.file(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) }) as CitationItem[]
            suggestion = suggestions.find(s => s.label === 'Jane Miller and Robert Smith')
            assert.ok(suggestion)
            assert.strictEqual(suggestion.label, suggestion.fields.author)
        })

        it('should follow `latex-workshop.intellisense.citation.filterText`', () => {
            const otherFields = 'Jane Miller and Robert Smith Journal of Advanced Computing 2024 Elsevier'

            set.config('intellisense.citation.filterText', ['title', 'bibtex key'])
            let suggestions = provider.from([''], { uri: vscode.Uri.file(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) }) as CitationItem[]
            let suggestion = suggestions.find(s => s.key === 'miller2024')
            assert.ok(suggestion)
            assert.strictEqual(suggestion.filterText, `${suggestion.fields.title} ${suggestion.key}`)

            set.config('intellisense.citation.filterText', ['other fields'])
            suggestions = provider.from([''], { uri: vscode.Uri.file(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) }) as CitationItem[]
            suggestion = suggestions.find(s => s.key === 'miller2024')
            assert.ok(suggestion)
            assert.strictEqual(suggestion.filterText, otherFields)

            set.config('intellisense.citation.filterText', ['wrong config'])
            suggestions = provider.from([''], { uri: vscode.Uri.file(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) }) as CitationItem[]
            suggestion = suggestions.find(s => s.key === 'miller2024')
            assert.ok(suggestion)
            assert.strictEqual(suggestion.filterText, `${suggestion.key} ${suggestion.fields.title} ${otherFields}`)
        })

        it('should follow `latex-workshop.intellisense.citation.format`', () => {
            set.config('intellisense.citation.format', ['title', 'author'])
            const suggestions = provider.from([''], { uri: vscode.Uri.file(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) }) as CitationItem[]
            const suggestion = suggestions.find(s => s.key === 'miller2024')
            assert.ok(suggestion)
            const documentation = (suggestion.documentation as vscode.MarkdownString | undefined)?.value
            assert.ok(documentation?.includes('An Overview of Quantum Computing: Challenges and Future Directions'))
            assert.ok(documentation?.includes('Jane Miller and Robert Smith'))
            assert.ok(!documentation?.includes('Journal of Advanced Computing'))
        })
    })

    describe('latex-workshop.intellisense.citation.fuzzy', () => {
        const texPath = get.path(fixture, 'bibitems.tex')
        const bibPath = get.path(fixture, 'bibfile.bib')

        beforeEach(async () => {
            set.config('intellisense.citation.label', 'bibtex key')
            set.root(texPath)
            await lw.cache.refreshCache(texPath)
            await citation.parseBibFile(bibPath)
        })

        function complete(line: string): CitationItem[] {
            const position = new vscode.Position(0, line.length)
            return provider.from([''], { uri: vscode.Uri.file(texPath), langId: 'latex', line, position }) as CitationItem[]
        }

        it('should not annotate suggestions with a sortText when disabled (default)', () => {
            set.config('intellisense.citation.fuzzy', false)
            const suggestion = complete('\\cite{miller').find(s => s.key === 'miller2024')
            assert.ok(suggestion)
            assert.strictEqual(suggestion.sortText, undefined)
        })

        it('should rank matches and stamp sortText/filterText when enabled', () => {
            set.config('intellisense.citation.fuzzy', true)
            const suggestions = complete('\\cite{miller')
            // Every returned entry is part of our ranked set: zero-padded sortText
            // and a filterText equal to the typed query so VS Code keeps our order.
            assert.ok(suggestions.length > 0)
            suggestions.forEach(s => {
                assert.strictEqual(s.filterText, 'miller')
                assert.ok(/^\d+$/.test(s.sortText ?? ''), `expected numeric sortText, got ${s.sortText}`)
            })
            assert.deepStrictEqual(suggestions[0].sortText, '0000')
            assert.ok(suggestions.some(s => s.key === 'miller2024'))
        })

        it('should drop entries that do not match the query under AND semantics', () => {
            set.config('intellisense.citation.fuzzy', true)
            // 'miller' matches the miller* keys but not the \bibitem keys.
            const suggestions = complete('\\cite{miller')
            assert.ok(!suggestions.some(s => s.key === 'smith2023'))
        })

        it('should match a multi-word query across fields (co-author + year)', () => {
            set.config('intellisense.citation.fuzzy', true)
            // Mirrors the real-world "petiziol 2026 -> Steinfadt2026" case: the term
            // matches a co-author (past VS Code's 128-char filterText cutoff) while
            // the other term matches the key/year. Robert Smith is miller2024's
            // second author; 2024 is in its key and year.
            const suggestions = complete('\\cite{smith 2024')
            const miller = suggestions.find(s => s.key === 'miller2024')
            assert.ok(miller, 'expected miller2024 to match "smith 2024"')
            assert.strictEqual(miller.filterText, 'smith 2024')
            assert.ok(/^\d+$/.test(miller.sortText ?? ''))
        })

        it('should fall back to the full unranked list when nothing matches', () => {
            set.config('intellisense.citation.fuzzy', true)
            // No entry matches 'zzqqxx'. We must not return an empty list: the
            // dispatcher only marks the list incomplete while entries are present,
            // and a complete empty list would stop VS Code from re-querying.
            const suggestions = complete('\\cite{zzqqxx')
            assert.ok(suggestions.length > 0)
            assert.ok(suggestions.every(s => s.sortText === undefined))
        })

        it('should preserve the original suggestions on an empty query', () => {
            set.config('intellisense.citation.fuzzy', true)
            const suggestions = complete('\\cite{')
            const suggestion = suggestions.find(s => s.key === 'miller2024')
            assert.ok(suggestion)
            // Nothing typed yet, so no ranking is applied.
            assert.strictEqual(suggestion.sortText, undefined)
        })

        it('should not rank on a whitespace-only query (e.g. after a comma)', () => {
            set.config('intellisense.citation.fuzzy', true)
            // `\cite{miller2024, ` — the current word is just whitespace, so there
            // is nothing to rank and no sortText should be stamped.
            const suggestions = complete('\\cite{miller2024, ')
            const suggestion = suggestions.find(s => s.key === 'miller2024')
            assert.ok(suggestion)
            assert.strictEqual(suggestion.sortText, undefined)
        })
    })

    describe('citation.browser fuzzy search', () => {
        const texPath = get.path(fixture, 'bibitems.tex')
        const bibPath = get.path(fixture, 'bibfile.bib')

        beforeEach(async () => {
            set.config('intellisense.citation.label', 'bibtex key')
            set.root(texPath)
            await lw.cache.refreshCache(texPath)
            await citation.parseBibFile(bibPath)
        })

        // Minimal stand-in for vscode.QuickPick that captures the value handler so
        // the test can simulate typing without a real UI.
        function fakeQuickPick() {
            let onChange: (value: string) => void = () => { /* noop */ }
            const qp = {
                items: [] as readonly vscode.QuickPickItem[],
                value: '',
                placeholder: '',
                matchOnDescription: true,
                matchOnDetail: true,
                ignoreFocusOut: false,
                selectedItems: [] as readonly vscode.QuickPickItem[],
                onDidChangeValue: (cb: (value: string) => void) => { onChange = cb; return { dispose() { /* noop */ } } },
                onDidAccept: (_cb: () => void) => ({ dispose() { /* noop */ } }),
                onDidHide: (_cb: () => void) => ({ dispose() { /* noop */ } }),
                show() { /* noop */ },
                hide() { /* noop */ },
                dispose() { /* noop */ }
            }
            return { qp, type: (value: string) => onChange(value) }
        }

        const args = () => ({ uri: vscode.Uri.file(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) })

        it('should drive a custom QuickPick and rank items by the typed value when enabled', () => {
            set.config('intellisense.citation.fuzzy', true)
            const { qp, type } = fakeQuickPick()
            const create = sinon.stub(vscode.window, 'createQuickPick').returns(qp as unknown as vscode.QuickPick<vscode.QuickPickItem>)

            citation.browser(args())

            create.restore()
            assert.ok(create.called)
            // Description and detail matching on so the QuickPick bold-highlights
            // matches across key, title, and author.
            assert.strictEqual(qp.matchOnDescription, true)
            assert.strictEqual(qp.matchOnDetail, true)
            assert.ok(qp.items.length > 0)

            type('miller')
            // alwaysShow bypasses the QuickPick's own filter for every ranked item.
            assert.ok(qp.items.every(i => i.alwaysShow === true))
            assert.ok(qp.items.some(i => i.description === 'miller2024'))

            // Multi-word query hitting a co-author + year, the browser-mode analogue
            // of "petiziol 2026" -> Steinfadt2026.
            type('smith 2024')
            assert.ok(qp.items.some(i => i.description === 'miller2024'))
        })

        it('should use the legacy showQuickPick when fuzzy is disabled', () => {
            set.config('intellisense.citation.fuzzy', false)
            const show = sinon.stub(vscode.window, 'showQuickPick').resolves(undefined)
            const create = sinon.stub(vscode.window, 'createQuickPick')

            citation.browser(args())

            assert.ok(show.called)
            assert.ok(create.notCalled)
        })
    })
})
