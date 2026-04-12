import * as path from 'path'
import * as sinon from 'sinon'
import { bibtexParser } from 'latex-utensils'
import { lw } from '../../../src/lw'
import { TeXElementType } from '../../../src/types'
import { buildBibTeX, fieldValueToString } from '../../../src/outline/structure/bibtex'
import { assert, get, mock, set, TextDocument } from '../utils'

describe(path.basename(__filename).split('.')[0] + ':', () => {
	function loc(line: number) {
		return {
			start: { offset: 0, line, column: 1 },
			end: { offset: 0, line, column: 1 }
		}
	}

	function createBibDocument(fileName: string, content: string) {
		return new TextDocument(get.path(fileName), content, { languageId: 'bibtex' })
	}

	async function buildFromParsedBibContent() {
		const content = [
			'@string{JY = "James Yu"}',
			'',
			'@article{key1,',
			'  author = JY,',
			'  title = "Part A" # JY,',
			'  journal = UNKNOWN,',
			'}'
		].join('\n')
		const document = createBibDocument('refs.bib', content)
		const result = await buildBibTeX(document)
		return { document, result }
	}

	before(() => {
		mock.init(lw, 'parser', 'outline')
	})

	after(() => {
		sinon.restore()
	})

	describe('fieldValueToString', () => {
		it('should return literal content directly', () => {
			const value: bibtexParser.FieldValue = { kind: 'text_string', content: 'Alpha', location: loc(1) }
			const result = fieldValueToString(value, {})

			assert.strictEqual(result, 'Alpha')
		})

		it('should resolve abbreviations and fallback for unknown abbreviations', () => {
			const knownValue: bibtexParser.FieldValue = { kind: 'abbreviation', content: 'JY', location: loc(1) }
			const unknownValue: bibtexParser.FieldValue = { kind: 'abbreviation', content: 'UNKNOWN', location: loc(1) }
			const known = fieldValueToString(knownValue, { JY: 'James Yu' })
			const unknown = fieldValueToString(unknownValue, {})

			assert.strictEqual(known, 'James Yu')
			assert.strictEqual(unknown, 'undefined @string "UNKNOWN"')
		})

		it('should recursively format concatenated values', () => {
			const value: bibtexParser.FieldValue = {
				kind: 'concat',
				content: [
					{ kind: 'text_string', content: 'Part A', location: loc(1) },
					{ kind: 'abbreviation', content: 'abbr', location: loc(1) },
					{ kind: 'text_string', content: 'Part C', location: loc(1) }
				],
				location: loc(1)
			}

			const result = fieldValueToString(value, { abbr: 'Part B' })

			assert.strictEqual(result, 'Part A # Part B # Part C')
		})
	})

	describe('buildBibTeX', () => {
		it('should return empty when bib file exceeds configured max size', async () => {
			set.config('bibtex.maxFileSize', 0)
			const document = createBibDocument('large.bib', '@article{k, title={t}}')
			const parseBibSpy = sinon.spy(lw.parser.parse, 'bib')

			const result = await buildBibTeX(document)
			parseBibSpy.restore()

			assert.deepStrictEqual(result, [])
			assert.strictEqual(parseBibSpy.callCount, 0)
			assert.hasLog(`Bib file is too large, ignoring it: ${document.fileName}`)
		})

		it('should return empty when parser returns undefined', async () => {
			const document = createBibDocument('refs.bib', '@article{k, title={t}}')
			const parseBibStub = sinon.stub(lw.parser.parse, 'bib').resolves(undefined)

			const result = await buildBibTeX(document)
			parseBibStub.restore()

			assert.deepStrictEqual(result, [])
			assert.strictEqual(parseBibStub.callCount, 1)
			assert.ok(parseBibStub.calledWith(document.uri, document.getText()))
			assert.hasLog('Parse active BibTeX document for AST.')
		})

		it('should ignore non-entry AST items', async () => {
			const { result } = await buildFromParsedBibContent()

			assert.strictEqual(result.length, 1)
		})

		it('should build bib item metadata from an entry', async () => {
			const { document, result } = await buildFromParsedBibContent()

			assert.strictEqual(result[0].type, TeXElementType.BibItem)
			assert.strictEqual(result[0].name, 'article')
			assert.strictEqual(result[0].label, 'article: key1')
			assert.strictEqual(result[0].lineFr, 2)
			assert.strictEqual(result[0].lineTo, 6)
			assert.pathStrictEqual(result[0].filePath, document.fileName)
		})

		it('should build field items with converted values', async () => {
			const { result } = await buildFromParsedBibContent()

			assert.strictEqual(result[0].children.length, 3)
			assert.strictEqual(result[0].children[0].type, TeXElementType.BibField)
			assert.strictEqual(result[0].children[0].label, 'author: James Yu')
			assert.strictEqual(result[0].children[1].label, 'title: Part A # James Yu')
			assert.strictEqual(result[0].children[2].label, 'journal: undefined @string "UNKNOWN"')
		})

		it('should assign parent pointers to field items', async () => {
			const { result } = await buildFromParsedBibContent()

			assert.strictEqual(result[0].children[0].parent, result[0])
			assert.strictEqual(result[0].children[1].parent, result[0])
			assert.strictEqual(result[0].children[2].parent, result[0])
		})

		it('should log parsed item count for real parsed content', async () => {
			await buildFromParsedBibContent()

			assert.hasLog('Parse active BibTeX document for AST.')
			assert.hasLog('Parsed 2 AST items.')
		})
	})
})
