import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../../src/lw'
import { construct } from '../../../src/outline/structure/doctex'
import { TeXElementType } from '../../../src/types'
import { assert, get, mock, set, TextDocument } from '../utils'

describe(path.basename(__filename).split('.')[0] + ':', () => {
	function createDoc(content: string) {
		return new TextDocument(get.path('doc.dtx'), content, { languageId: 'doctex' })
	}

	before(() => {
		mock.init(lw, 'parser', 'outline')
    })

	beforeEach(() => {
		set.config('view.outline.sections', ['section', 'subsection', 'subsubsection'])
		set.config('view.outline.commands', ['label'])
		set.config('view.outline.floats.enabled', true)
		set.config('view.outline.floats.caption.enabled', true)
		set.config('view.outline.floats.number.enabled', true)
		set.config('view.outline.numbers.enabled', true)
		set.config('latex.texDirs', [])
	})

	after(() => {
		sinon.restore()
	})

	describe('construct', () => {
		it('should return empty when document content is empty', async () => {
			const result = await construct(createDoc(''))

			assert.deepStrictEqual(result, [])
		})

		it('should parse only commented documentation lines', async () => {
			const doc = createDoc([
				'\\section{Ignored}',
				'% \\section{Visible}'
			].join('\n'))

			set.config('view.outline.numbers.enabled', false)
			const result = await construct(doc)

			assert.strictEqual(result.length, 1)
			assert.strictEqual(result[0].label, 'Visible')
		})

		it('should ignore %% lines, ^^A-prefixed lines and strip ^^A trailing comments', async () => {
			const doc = createDoc([
				'%% \\section{Drop1}',
				'% ^^A \\section{Drop2}',
				'% \\section{Keep} \\section{Another} ^^A trailing \\section{Ignore}'
			].join('\n'))

			set.config('view.outline.numbers.enabled', false)
			const result = await construct(doc)

			assert.strictEqual(result.length, 2)
			assert.strictEqual(result[0].label.trim(), 'Keep')
			assert.strictEqual(result[1].label.trim(), 'Another')
		})

		it('should drop content inside commented iffalse/fi blocks', async () => {
			const doc = createDoc([
				'% \\iffalse',
				'% \\section{Hidden}',
				'% \\fi',
				'% \\section{Shown}'
			].join('\n'))

			set.config('view.outline.numbers.enabled', false)
			const result = await construct(doc)

			assert.strictEqual(result.length, 1)
			assert.strictEqual(result[0].label, 'Shown')
		})

		it('should drop content inside macrocode blocks', async () => {
			const doc = createDoc([
				'%    \\begin{macrocode}',
				'% \\section{Hidden}',
				'%    \\end{macrocode}',
				'% \\section{Shown}'
			].join('\n'))

			set.config('view.outline.numbers.enabled', false)
			const result = await construct(doc)

			assert.strictEqual(result.length, 1)
			assert.strictEqual(result[0].label, 'Shown')
		})

		it('should log and return empty when AST parsing fails', async () => {
			const parseTexStub = sinon.stub(lw.parser.parse, 'tex').resolves(undefined)
			const doc = createDoc('% \\section{A}')

			const result = await construct(doc)
			parseTexStub.restore()

			assert.deepStrictEqual(result, [])
			assert.hasLog('Failed parsing LaTeX AST.')
		})

		it('should apply section and float numbering based on config', async () => {
			const doc = createDoc([
				'% \\section{Sec}',
				'% \\begin{figure}',
				'% \\caption{Cap}',
				'% \\end{figure}'
			].join('\n'))

			const numbered = await construct(doc)
			set.config('view.outline.numbers.enabled', false)
			set.config('view.outline.floats.number.enabled', false)
			const unnumbered = await construct(doc)

			assert.strictEqual(numbered[0].label, '1 Sec')
			assert.strictEqual(numbered[0].children[0].label, 'Figure 1: Cap')
			assert.strictEqual(unnumbered[0].label, 'Sec')
			assert.strictEqual(unnumbered[0].children[0].label, 'Figure: Cap')
		})

		it('should keep appendix sections lettered in doctex output', async () => {
			const doc = createDoc([
				'% \\section{Before}',
				'% \\appendix',
				'% \\section{After}'
			].join('\n'))

			const result = await construct(doc)

			assert.strictEqual(result[0].label, '1 Before')
			assert.strictEqual(result[1].label, 'A After')
		})

		it('should include doctex macro and environment blocks as outline environments', async () => {
			const doc = createDoc([
				'% \\begin{macro}{\\foo}',
				'% \\end{macro}',
				'% \\begin{environment}{bar}',
				'% \\end{environment}'
			].join('\n'))

			set.config('view.outline.numbers.enabled', false)
			const result = await construct(doc)

			assert.strictEqual(result.length, 2)
			assert.strictEqual(result[0].type, TeXElementType.Environment)
			assert.strictEqual(result[0].label, 'Macro: foo')
			assert.strictEqual(result[1].type, TeXElementType.Environment)
			assert.strictEqual(result[1].label, 'Environment: bar')
		})
	})
})
