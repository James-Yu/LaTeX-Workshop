import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { bibtexParser } from 'latex-utensils'
import { assert, mock, set, log, TextDocument } from '../utils'
import { lw } from '../../../src/lw'
import { format, formatter } from '../../../src/lint/bibtex-formatter'
import { getBibtexFormatConfig, bibtexSort, bibtexFormat } from '../../../src/lint/bibtex-formatter/utils'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    before(() => {
        mock.init(lw, 'lint', 'parser')
    })

    after(() => {
        sinon.restore()
    })

    beforeEach(() => {
        set.config('bibtex-format.tab', '  ')
        set.config('bibtex-format.surround', 'Curly braces')
        set.config('bibtex-format.case.field', 'lowercase')
        set.config('bibtex-format.case.type', 'lowercase')
        set.config('bibtex-format.trailingComma', false)
        set.config('bibtex-format.align-equal.enabled', false)
        set.config('bibtex-format.sort.enabled', false)
        set.config('bibtex-format.sortby', ['key'])
        set.config('bibtex-fields.sort.enabled', false)
        set.config('bibtex-fields.order', [])
        set.config('bibtex-entries.first', [])
    })

    const dummyOptions: vscode.FormattingOptions = { tabSize: 4, insertSpaces: true }
    const dummyToken: vscode.CancellationToken = { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) }

    /**
     * Three-entry BibTeX fixture: article (2022), book/lamport (1994), book/MR (1993).
     * Matches the content of test/fixtures/armory/formatter/bibtex_base.bib.
     */
    const BASE_BIB = `@article{art1,
  title       = {A fake article},
  author      = {Davis, J. and Jones, M.},
  journal     = {Journal of CI tests},
  year        = {2022},
  description = {hintFake}
}

@book{lamport1994latex,
  title        = {LATEX: A Document Preparation System},
  author       = {Lamport, L. and Bibby, D.},
  year         = {1994},
  publisher    = {Addison-Wesley},
  description = {hintLaTex}
}

@book{MR1241645,
  author      = {Rubinstein, Reuven Y. and Shapiro, Alexander},
  title       = {Discrete event systems},
  year        = 1993,
  publisher   = {John Wiley \\& Sons Ltd.},
  description = {hintRubi}
}
`

    const DUP_BIB = `@article{art1,
  title       = {A fake article},
  author      = {Davis, J. and Jones, M.},
  year        = {2022}
}

@article{art1,
  title       = {A fake article},
  author      = {Davis, J. and Jones, M.},
  year        = {2022}
}
`

    const SORTFIELD_BIB = `@article{art1,
  title       = {A fake article},
  author      = {Davis, J. and Jones, M.},
  journal     = {Journal of CI tests},
  year        = {2022},
  description = {hintFake}
}
`

    /** Create a fake TextDocument for a .bib file with optional content. */
    function makeBibDocument(content: string = BASE_BIB): TextDocument {
        return new TextDocument('/tmp/test.bib', content, { languageId: 'bibtex' })
    }

    /** Typed wrappers to avoid ProviderResult<> nullability in assertions. */
    async function formatDocument(doc: TextDocument): Promise<vscode.TextEdit[]> {
        return await formatter.provideDocumentFormattingEdits(doc, dummyOptions, dummyToken) as vscode.TextEdit[]
    }
    async function formatDocumentRange(doc: TextDocument, range: vscode.Range): Promise<vscode.TextEdit[]> {
        return await formatter.provideDocumentRangeFormattingEdits(doc, range, dummyOptions, dummyToken) as vscode.TextEdit[]
    }

    /** Build a default BibtexFormatConfig via getBibtexFormatConfig with set.config overrides. */
    function defaultConfig() {
        return getBibtexFormatConfig(undefined)
    }

    describe('bibtex-formatter.getBibtexFormatConfig', () => {
        it('should use tab character when bibtex-format.tab is "tab"', () => {
            set.config('bibtex-format.tab', 'tab')
            assert.strictEqual(defaultConfig().tab, '\t')
        })

        it('should use 2 spaces when bibtex-format.tab is "2 spaces"', () => {
            set.config('bibtex-format.tab', '2 spaces')
            assert.strictEqual(defaultConfig().tab, '  ')
        })

        it('should use n spaces when bibtex-format.tab is a numeric string', () => {
            set.config('bibtex-format.tab', '4')
            assert.strictEqual(defaultConfig().tab, '    ')
        })

        it('should fall back to 2 spaces and log error for an invalid tab value', () => {
            set.config('bibtex-format.tab', 'invalid')
            log.start()
            const config = defaultConfig()
            log.stop()
            assert.strictEqual(config.tab, '  ')
            assert.hasLog('Wrong value for bibtex-format.tab')
        })

        it('should use curly braces when bibtex-format.surround is "Curly braces"', () => {
            set.config('bibtex-format.surround', 'Curly braces')
            const config = defaultConfig()
            assert.strictEqual(config.left, '{')
            assert.strictEqual(config.right, '}')
        })

        it('should use quotation marks when bibtex-format.surround is "Quotation marks"', () => {
            set.config('bibtex-format.surround', 'Quotation marks')
            const config = defaultConfig()
            assert.strictEqual(config.left, '"')
            assert.strictEqual(config.right, '"')
        })

        it('should reflect bibtex-format.case.field as UPPERCASE', () => {
            set.config('bibtex-format.case.field', 'UPPERCASE')
            assert.strictEqual(defaultConfig().case.field, 'UPPERCASE')
        })

        it('should reflect bibtex-format.case.field as lowercase', () => {
            set.config('bibtex-format.case.field', 'lowercase')
            assert.strictEqual(defaultConfig().case.field, 'lowercase')
        })

        it('should reflect bibtex-format.case.type as UPPERCASE', () => {
            set.config('bibtex-format.case.type', 'UPPERCASE')
            assert.strictEqual(defaultConfig().case.type, 'UPPERCASE')
        })

        it('should reflect bibtex-format.case.type as lowercase', () => {
            set.config('bibtex-format.case.type', 'lowercase')
            assert.strictEqual(defaultConfig().case.type, 'lowercase')
        })

        it('should reflect bibtex-format.trailingComma as true', () => {
            set.config('bibtex-format.trailingComma', true)
            assert.strictEqual(defaultConfig().trailingComma, true)
        })

        it('should reflect bibtex-format.trailingComma as false', () => {
            set.config('bibtex-format.trailingComma', false)
            assert.strictEqual(defaultConfig().trailingComma, false)
        })

        it('should reflect bibtex-format.sortby', () => {
            set.config('bibtex-format.sortby', ['year', 'key'])
            assert.deepStrictEqual(defaultConfig().sort, ['year', 'key'])
        })

        it('should reflect bibtex-format.align-equal.enabled as true', () => {
            set.config('bibtex-format.align-equal.enabled', true)
            assert.strictEqual(defaultConfig().alignOnEqual, true)
        })

        it('should reflect bibtex-format.align-equal.enabled as false', () => {
            set.config('bibtex-format.align-equal.enabled', false)
            assert.strictEqual(defaultConfig().alignOnEqual, false)
        })

        it('should reflect bibtex-fields.sort.enabled', () => {
            set.config('bibtex-fields.sort.enabled', true)
            assert.strictEqual(defaultConfig().sortFields, true)
        })

        it('should reflect bibtex-fields.order', () => {
            set.config('bibtex-fields.order', ['title', 'author'])
            assert.deepStrictEqual(defaultConfig().fieldsOrder, ['title', 'author'])
        })

        it('should reflect bibtex-entries.first', () => {
            set.config('bibtex-entries.first', ['book'])
            assert.deepStrictEqual(defaultConfig().firstEntries, ['book'])
        })
    })

    describe('bibtex-formatter.bibtexFormat', () => {
        function makeEntry(text: string): bibtexParser.Entry {
            return bibtexParser.parse(text).content[0] as bibtexParser.Entry
        }

        it('should produce @type{key, ...} structure', () => {
            const entry = makeEntry('@article{mykey,\n  title = {Hello}\n}\n')
            const result = bibtexFormat(entry, defaultConfig())
            assert.ok(result.startsWith('@'))
            assert.ok(result.includes('mykey'))
            assert.ok(result.includes('title'))
        })

        it('should uppercase entry type when case.type is UPPERCASE', () => {
            set.config('bibtex-format.case.type', 'UPPERCASE')
            const entry = makeEntry('@article{mykey,\n  title = {Hello}\n}\n')
            assert.ok(bibtexFormat(entry, defaultConfig()).includes('@ARTICLE'))
        })

        it('should lowercase entry type when case.type is lowercase', () => {
            const entry = makeEntry('@ARTICLE{mykey,\n  TITLE = {Hello}\n}\n')
            assert.ok(bibtexFormat(entry, defaultConfig()).includes('@article'))
        })

        it('should uppercase field names when case.field is UPPERCASE', () => {
            set.config('bibtex-format.case.field', 'UPPERCASE')
            const entry = makeEntry('@article{mykey,\n  title = {Hello}\n}\n')
            assert.ok(bibtexFormat(entry, defaultConfig()).includes('TITLE'))
        })

        it('should lowercase field names when case.field is lowercase', () => {
            const entry = makeEntry('@article{mykey,\n  TITLE = {Hello}\n}\n')
            assert.ok(bibtexFormat(entry, defaultConfig()).includes('title'))
        })

        it('should add trailing comma when trailingComma is true', () => {
            set.config('bibtex-format.trailingComma', true)
            const entry = makeEntry('@article{mykey,\n  title = {Hello}\n}\n')
            const result = bibtexFormat(entry, defaultConfig())
            // The last field line should end with a comma before the closing brace
            const lines = result.split('\n')
            const lastFieldLine = lines[lines.length - 2]
            assert.ok(lastFieldLine.trimEnd().endsWith(','))
        })

        it('should not add trailing comma when trailingComma is false', () => {
            const entry = makeEntry('@article{mykey,\n  title = {Hello}\n}\n')
            const result = bibtexFormat(entry, defaultConfig())
            const lines = result.split('\n')
            const lastFieldLine = lines[lines.length - 2]
            assert.ok(!lastFieldLine.trimEnd().endsWith(','))
        })

        it('should use tab indentation when bibtex-format.tab is "tab"', () => {
            set.config('bibtex-format.tab', 'tab')
            const entry = makeEntry('@article{mykey,\n  title = {Hello}\n}\n')
            const result = bibtexFormat(entry, defaultConfig())
            const fieldLines = result.split('\n').filter(l => l.includes('='))
            assert.ok(fieldLines.every(l => l.startsWith('\t')))
        })

        it('should use curly braces when bibtex-format.surround is "Curly braces"', () => {
            const entry = makeEntry('@article{mykey,\n  title = {Hello}\n}\n')
            const result = bibtexFormat(entry, defaultConfig())
            // field values should be wrapped in { }
            assert.ok(result.includes('{Hello}'))
        })

        it('should use quotation marks when bibtex-format.surround is "Quotation marks"', () => {
            set.config('bibtex-format.surround', 'Quotation marks')
            const entry = makeEntry('@article{mykey,\n  title = {Hello}\n}\n')
            const result = bibtexFormat(entry, defaultConfig())
            assert.ok(result.includes('"Hello"'))
        })

        it('should align = signs when alignOnEqual is true', () => {
            set.config('bibtex-format.align-equal.enabled', true)
            const entry = makeEntry('@article{mykey,\n  title = {Hello},\n  author = {World}\n}\n')
            const result = bibtexFormat(entry, defaultConfig())
            const eqPositions = result.split('\n').filter(l => l.includes('=')).map(l => l.indexOf('='))
            assert.ok(eqPositions.every(p => p === eqPositions[0]))
        })

        it('should not align = signs when alignOnEqual is false', () => {
            const entry = makeEntry('@article{mykey,\n  title = {Hello},\n  author = {World}\n}\n')
            const result = bibtexFormat(entry, defaultConfig())
            // With different-length field names and no alignment, = positions differ
            const eqPositions = result.split('\n').filter(l => l.includes('=')).map(l => l.indexOf('='))
            assert.ok(!eqPositions.every(p => p === eqPositions[0]))
        })

        it('should sort fields alphabetically when sortFields is true and no fieldsOrder given', () => {
            set.config('bibtex-fields.sort.enabled', true)
            const entry = makeEntry('@article{mykey,\n  year = {2022},\n  author = {X},\n  title = {T}\n}\n')
            const result = bibtexFormat(entry, defaultConfig())
            const fieldNames = result.split('\n').filter(l => l.includes('=')).map(l => l.trim().split(/\s/)[0])
            assert.deepStrictEqual(fieldNames, ['author', 'title', 'year'])
        })

        it('should sort fields by fieldsOrder first, then alphabetically for the rest', () => {
            set.config('bibtex-fields.sort.enabled', true)
            set.config('bibtex-fields.order', ['title', 'author'])
            const entry = makeEntry('@article{mykey,\n  year = {2022},\n  author = {X},\n  title = {T}\n}\n')
            const result = bibtexFormat(entry, defaultConfig())
            const fieldNames = result.split('\n').filter(l => l.includes('=')).map(l => l.trim().split(/\s/)[0])
            assert.strictEqual(fieldNames[0], 'title')
            assert.strictEqual(fieldNames[1], 'author')
            assert.strictEqual(fieldNames[2], 'year')
        })
    })

    describe('bibtex-formatter.bibtexSort', () => {
        function parseEntries(text: string): bibtexParser.Entry[] {
            return bibtexParser.parse(text).content as bibtexParser.Entry[]
        }

        function makeSortConfig(overrides: Partial<ReturnType<typeof defaultConfig>> = {}): ReturnType<typeof defaultConfig> {
            return Object.assign(defaultConfig(), overrides)
        }

        it('should sort by key ascending', () => {
            const es = parseEntries(BASE_BIB)
            const config = makeSortConfig({ sort: ['key'] })
            const sorted = [...es].sort(bibtexSort(new Set(), config))
            assert.strictEqual(sorted[0].internalKey, 'art1')
            assert.strictEqual(sorted[1].internalKey, 'lamport1994latex')
            assert.strictEqual(sorted[2].internalKey, 'MR1241645')
        })

        it('should sort by year ascending', () => {
            const es = parseEntries(BASE_BIB)
            const config = makeSortConfig({ sort: ['year'] })
            const sorted = [...es].sort(bibtexSort(new Set(), config))
            assert.strictEqual(sorted[0].internalKey, 'MR1241645')  // 1993
            assert.strictEqual(sorted[1].internalKey, 'lamport1994latex')  // 1994
            assert.strictEqual(sorted[2].internalKey, 'art1')  // 2022
        })

        it('should sort by year descending with year-desc key', () => {
            const es = parseEntries(BASE_BIB)
            const config = makeSortConfig({ sort: ['year-desc'] })
            const sorted = [...es].sort(bibtexSort(new Set(), config))
            assert.strictEqual(sorted[0].internalKey, 'art1')  // 2022
            assert.strictEqual(sorted[1].internalKey, 'lamport1994latex')  // 1994
            assert.strictEqual(sorted[2].internalKey, 'MR1241645')  // 1993
        })

        it('should sort by type', () => {
            const es = parseEntries(BASE_BIB)
            const config = makeSortConfig({ sort: ['type'] })
            const sorted = [...es].sort(bibtexSort(new Set(), config))
            // article < book
            assert.strictEqual(sorted[0].internalKey, 'art1')
        })

        it('should put firstEntries types at the top', () => {
            const es = parseEntries(BASE_BIB)
            const config = makeSortConfig({ sort: ['key'], firstEntries: ['book'] })
            const sorted = [...es].sort(bibtexSort(new Set(), config))
            // Both lamport and MR are books; art1 is article → books come first
            assert.strictEqual(sorted[0].entryType, 'book')
            assert.strictEqual(sorted[1].entryType, 'book')
            assert.strictEqual(sorted[2].entryType, 'article')
        })

        it('should order firstEntries types according to their position in the array', () => {
            const es = parseEntries(BASE_BIB)
            // Make a bib with article first in firstEntries, book second
            const config = makeSortConfig({ sort: ['key'], firstEntries: ['book', 'article'] })
            const sorted = [...es].sort(bibtexSort(new Set(), config))
            assert.strictEqual(sorted[0].entryType, 'book')
            assert.strictEqual(sorted[2].entryType, 'article')
        })

        it('should detect duplicate entries by key', () => {
            const es = parseEntries(DUP_BIB)
            const duplicates = new Set<bibtexParser.Entry>()
            const config = makeSortConfig({ sort: ['key'] })
            ;[...es].sort(bibtexSort(duplicates, config))
            assert.strictEqual(duplicates.size, 1)
        })

        it('should not detect duplicates when all keys are unique', () => {
            const es = parseEntries(BASE_BIB)
            const duplicates = new Set<bibtexParser.Entry>()
            const config = makeSortConfig({ sort: ['key'] })
            ;[...es].sort(bibtexSort(duplicates, config))
            assert.strictEqual(duplicates.size, 0)
        })
    })

    describe('bibtex-formatter.format', () => {
        let activeEditorStub: sinon.SinonStub | undefined

        afterEach(() => {
            activeEditorStub?.restore()
            activeEditorStub = undefined
        })

        it('should log and return early when there is no active text editor', async () => {
            activeEditorStub = sinon.stub(vscode.window, 'activeTextEditor').value(undefined)
            log.start()
            await format(true, true)
            log.stop()
            assert.hasLog('Exit formatting. The active textEditor is undefined.')
        })

        it('should log and return early when the active document is not bibtex', async () => {
            activeEditorStub = mock.activeTextEditor('/tmp/test.tex', '\\documentclass{article}\n', { languageId: 'latex' })
            log.start()
            await format(true, true)
            log.stop()
            assert.hasLog('Exit formatting. The active textEditor is not of bibtex type.')
        })

        it('should call lw.parser.parse.bib with the document content', async () => {
            activeEditorStub = mock.activeTextEditor('/tmp/test.bib', BASE_BIB, { languageId: 'bibtex' })
            const bibSpy = sinon.spy(lw.parser.parse, 'bib')
            await format(false, true)
            bibSpy.restore()
            assert.strictEqual(bibSpy.callCount, 1)
        })

        it('should return early without applying edits when parser returns undefined', async () => {
            activeEditorStub = mock.activeTextEditor('/tmp/test.bib', BASE_BIB, { languageId: 'bibtex' })
            const bibStub = sinon.stub(lw.parser.parse, 'bib').resolves(undefined)
            // Should not throw
            await format(false, true)
            bibStub.restore()
        })
    })

    describe('FormattingProvider.provideDocumentFormattingEdits', () => {
        it('should return edits for a valid bibtex document', async () => {
            set.config('bibtex-format.align-equal.enabled', true)

            const edits = await formatDocument(makeBibDocument())

            assert.ok(Array.isArray(edits))
            assert.ok(edits.length > 0)
        })

        it('should return no edits when parser returns undefined', async () => {
            const bibStub = sinon.stub(lw.parser.parse, 'bib').resolves(undefined)

            const edits = await formatDocument(makeBibDocument())

            bibStub.restore()
            assert.deepStrictEqual(edits, [])
        })

        it('should sort entries by year when bibtex-format.sortby is [year]', async () => {
            set.config('bibtex-format.sort.enabled', true)
            set.config('bibtex-format.sortby', ['year'])

            const edits = await formatDocument(makeBibDocument())

            // edits[0] is the earliest-year entry (MR1241645, 1993), edits[2] is latest (art1, 2022)
            assert.ok(edits.length === 3)
            assert.ok(edits[0].newText.includes('MR1241645'))
            assert.ok(edits[1].newText.includes('lamport1994latex'))
            assert.ok(edits[2].newText.includes('art1'))
        })

        it('should sort entries by year descending when bibtex-format.sortby is [year-desc]', async () => {
            set.config('bibtex-format.sort.enabled', true)
            set.config('bibtex-format.sortby', ['year-desc'])

            const edits = await formatDocument(makeBibDocument())

            assert.ok(edits[0].newText.includes('art1'))
            assert.ok(edits[1].newText.includes('lamport1994latex'))
            assert.ok(edits[2].newText.includes('MR1241645'))
        })

        it('should use tab indentation when bibtex-format.tab is "tab"', async () => {
            set.config('bibtex-format.tab', 'tab')

            const edits = await formatDocument(makeBibDocument())

            assert.ok(edits.length > 0)
            // Every field line in any edit should start with a tab
            const firstFieldLine = edits[0].newText.split('\n')[1]
            assert.ok(firstFieldLine.startsWith('\t'), `Expected tab indent, got: ${JSON.stringify(firstFieldLine)}`)
        })

        it('should use 2 spaces indentation when bibtex-format.tab is "2 spaces"', async () => {
            set.config('bibtex-format.tab', '2 spaces')

            const edits = await formatDocument(makeBibDocument())

            const firstFieldLine = edits[0].newText.split('\n')[1]
            assert.ok(firstFieldLine.startsWith('  ') && !firstFieldLine.startsWith('   '), `Expected 2-space indent, got: ${JSON.stringify(firstFieldLine)}`)
        })

        it('should use curly braces for field values when surround is "Curly braces"', async () => {
            const edits = await formatDocument(makeBibDocument())

            const fieldLines = edits[0].newText.split('\n').filter(l => l.includes('='))
            assert.ok(fieldLines.some(l => l.trimEnd().endsWith('}')))
        })

        it('should use quotation marks for field values when surround is "Quotation marks"', async () => {
            set.config('bibtex-format.surround', 'Quotation marks')

            const edits = await formatDocument(makeBibDocument())

            const fieldLines = edits[0].newText.split('\n').filter(l => l.includes('='))
            assert.ok(fieldLines.some(l => l.trimEnd().endsWith('"')))
        })

        it('should uppercase field names when case.field is UPPERCASE', async () => {
            set.config('bibtex-format.case.field', 'UPPERCASE')

            const edits = await formatDocument(makeBibDocument())

            const firstFieldLine = edits[0].newText.split('\n')[1].trim()
            assert.ok(firstFieldLine[0].match(/[A-Z]/), `Expected uppercase field, got: ${firstFieldLine}`)
        })

        it('should lowercase field names when case.field is lowercase', async () => {
            const edits = await formatDocument(makeBibDocument())

            const firstFieldLine = edits[0].newText.split('\n')[1].trim()
            assert.ok(firstFieldLine[0].match(/[a-z]/), `Expected lowercase field, got: ${firstFieldLine}`)
        })

        it('should uppercase entry type when case.type is UPPERCASE', async () => {
            set.config('bibtex-format.case.type', 'UPPERCASE')

            const edits = await formatDocument(makeBibDocument())

            const firstLine = edits[0].newText.split('\n')[0]
            assert.ok(firstLine.slice(1, 2).match(/[A-Z]/), `Expected uppercase type, got: ${firstLine}`)
        })

        it('should lowercase entry type when case.type is lowercase', async () => {
            const edits = await formatDocument(makeBibDocument())

            const firstLine = edits[0].newText.split('\n')[0]
            assert.ok(firstLine.slice(1, 2).match(/[a-z]/), `Expected lowercase type, got: ${firstLine}`)
        })

        it('should add trailing comma on the last field when trailingComma is true', async () => {
            set.config('bibtex-format.trailingComma', true)

            const edits = await formatDocument(makeBibDocument())

            const lines = edits[0].newText.split('\n')
            // Second-to-last line is the last field line (last is `}`)
            assert.strictEqual(lines[lines.length - 2].trimEnd().slice(-1), ',')
        })

        it('should not add trailing comma on the last field when trailingComma is false', async () => {
            const edits = await formatDocument(makeBibDocument())

            const lines = edits[0].newText.split('\n')
            assert.notStrictEqual(lines[lines.length - 2].trimEnd().slice(-1), ',')
        })

        it('should align = signs when align-equal.enabled is true', async () => {
            set.config('bibtex-format.align-equal.enabled', true)

            const edits = await formatDocument(makeBibDocument())

            const eqPositions = edits[0].newText.split('\n').filter(l => l.includes('=')).map(l => l.indexOf('='))
            assert.ok(eqPositions.every(p => p === eqPositions[0]), `Expected aligned = positions: ${eqPositions}`)
        })

        it('should not align = signs when align-equal.enabled is false', async () => {
            const edits = await formatDocument(makeBibDocument())

            // art1 has title, author, journal, year, description — different lengths
            const eqPositions = edits[0].newText.split('\n').filter(l => l.includes('=')).map(l => l.indexOf('='))
            assert.ok(!eqPositions.every(p => p === eqPositions[0]), `Expected non-aligned = positions: ${eqPositions}`)
        })

        it('should comment out duplicate entries when handleDuplicates is "Comment Duplicates"', async () => {
            set.config('bibtex-format.sort.enabled', true)
            set.config('bibtex-format.handleDuplicates', 'Comment Duplicates')
            const edits = await formatDocument(makeBibDocument(DUP_BIB))

            // One edit should have @ and the other should have the @ removed (commented out)
            const atCount = edits.filter(e => e.newText.includes('@')).length
            assert.strictEqual(atCount, 1)
        })

        it('should put book entries first when bibtex-entries.first is ["book"]', async () => {
            set.config('bibtex-format.sort.enabled', true)
            set.config('bibtex-entries.first', ['book'])

            const edits = await formatDocument(makeBibDocument())

            // Two books come before the article
            assert.ok(edits[0].newText.includes('@book') || edits[1].newText.includes('@book'))
            assert.ok(edits[2].newText.includes('art1'))
        })

        it('should sort fields alphabetically when bibtex-fields.sort.enabled is true', async () => {
            set.config('bibtex-fields.sort.enabled', true)
            const edits = await formatDocument(makeBibDocument(SORTFIELD_BIB))

            const fieldNames = edits[0].newText.split('\n').filter(l => l.includes('=')).map(l => l.trim().split(/\s/)[0])
            assert.ok(fieldNames.indexOf('author') < fieldNames.indexOf('description'))
            assert.ok(fieldNames.indexOf('description') < fieldNames.indexOf('journal'))
            assert.ok(fieldNames.indexOf('journal') < fieldNames.indexOf('title'))
            assert.ok(fieldNames.indexOf('title') < fieldNames.indexOf('year'))
        })

        it('should sort fields by bibtex-fields.order first, then alphabetically', async () => {
            set.config('bibtex-fields.sort.enabled', true)
            set.config('bibtex-fields.order', ['title', 'author', 'year'])
            const edits = await formatDocument(makeBibDocument(SORTFIELD_BIB))

            const fieldNames = edits[0].newText.split('\n').filter(l => l.includes('=')).map(l => l.trim().split(/\s/)[0])
            assert.strictEqual(fieldNames[0], 'title')
            assert.strictEqual(fieldNames[1], 'author')
            assert.strictEqual(fieldNames[2], 'year')
            // remaining fields sorted alphabetically
            assert.ok(fieldNames.indexOf('description') < fieldNames.indexOf('journal'))
        })
    })

    describe('FormattingProvider.provideDocumentRangeFormattingEdits', () => {
        it('should return edits for a given range', async () => {
            set.config('bibtex-format.align-equal.enabled', true)

            const range = new vscode.Range(0, 0, 7, 1)
            const edits = await formatDocumentRange(makeBibDocument(), range)

            assert.ok(Array.isArray(edits))
            assert.ok(edits.length > 0)
        })

        it('should return no edits when parser returns undefined', async () => {
            const bibStub = sinon.stub(lw.parser.parse, 'bib').resolves(undefined)

            const range = new vscode.Range(0, 0, 7, 1)
            const edits = await formatDocumentRange(makeBibDocument(), range)

            bibStub.restore()
            assert.deepStrictEqual(edits, [])
        })
    })
})
