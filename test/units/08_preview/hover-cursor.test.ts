import * as path from 'path'
import * as vscode from 'vscode'
import * as sinon from 'sinon'
import type * as Ast from '@unified-latex/unified-latex-types'
import { lw } from '../../../src/lw'
import type { TeXMathEnv } from '../../../src/types'
import * as selection from '../../../src/language/selection'
import { renderCursor, testing } from '../../../src/preview/hover/cursor'
import { assert, mock, set, TextDocument, TextEditor } from '../utils'

describe(path.basename(__filename).split('.')[0] + ':', () => {
	const EMPTY_AST: Ast.Root = { type: 'root', content: [] }

	before(() => {
		mock.init(lw, 'parser')
	})

	beforeEach(() => {
		set.config('hover.preview.cursor.enabled', true)
		set.config('hover.preview.cursor.symbol', '|')
		set.config('hover.preview.cursor.color', 'auto')
	})

	after(() => {
		sinon.restore()
	})

	function createMath(texString: string, start = new vscode.Position(0, 0)): TeXMathEnv {
		const lines = texString.split('\n')
		const end = lines.length === 1
			? new vscode.Position(start.line, start.character + lines[0].length)
			: new vscode.Position(start.line + lines.length - 1, lines[lines.length - 1].length)
		return {
			texString,
			range: new vscode.Range(start, end),
			envname: '$'
		}
	}

	function setActiveEditorCursor(content: string, cursor: vscode.Position) {
		const activeEditorStub = mock.activeTextEditor('/tmp/main.tex', content)
		const editor = vscode.window.activeTextEditor as TextEditor
		editor.setSelections([new vscode.Selection(cursor, cursor)])
		return {
			activeEditorStub,
			document: editor.document
		}
	}

	describe('insertCursor', () => {
		it('should insert cursor into `$a+b$`', async () => {
			const texMath = createMath('$a+b$')
			const cursorPos = new vscode.Position(0, 2)
			const parseStub = sinon.stub(lw.parser.parse, 'tex').resolves(EMPTY_AST)
			const findNodeStub = sinon.stub(selection, 'findNode').returns([
				{ type: 'root', content: [] } as unknown as Ast.Node,
				{ type: 'string', content: 'a+b' } as unknown as Ast.Node
			])

			const result = await testing.insertCursor(texMath, cursorPos, '|')

			parseStub.restore()
			findNodeStub.restore()
			assert.strictEqual(result, '$a|+b$')
		})

		it('should not insert cursor when parsing fails', async () => {
            // Do not reuse any other math strings in this test to ensure the
            // cache is not hit and the parse failure is properly tested.
			const texMath = createMath('$c+d$')
			const cursorPos = new vscode.Position(0, 2)
			const parseStub = sinon.stub(lw.parser.parse, 'tex').resolves(undefined)

			const result = await testing.insertCursor(texMath, cursorPos, '|')

			parseStub.restore()
			assert.strictEqual(result, '$c+d$')
		})

		it('should not insert cursor for `\\f|rac{1}{2}`', async () => {
			const texMath = createMath('$\\frac{1}{2}$', new vscode.Position(1, 0))
			const cursorPos = new vscode.Position(1, 3)
			const parseStub = sinon.stub(lw.parser.parse, 'tex').resolves(EMPTY_AST)
			const findNodeStub = sinon.stub(selection, 'findNode').returns([
				{ type: 'root', content: [] } as unknown as Ast.Node,
				{ type: 'macro', content: 'frac' } as unknown as Ast.Node
			])

			const result = await testing.insertCursor(texMath, cursorPos, '|')

			parseStub.restore()
			findNodeStub.restore()
			assert.strictEqual(result, '$\\frac{1}{2}$')
		})

		it('should not insert cursor inside `\\text{}` macro content', async () => {
			const texMath = createMath('$\\text{ab}$')
			const cursorPos = new vscode.Position(0, 7)
			const parseStub = sinon.stub(lw.parser.parse, 'tex').resolves(EMPTY_AST)
			const findNodeStub = sinon.stub(selection, 'findNode').returns([
				{ type: 'root', content: [] } as unknown as Ast.Node,
				{ type: 'macro', content: 'text' } as unknown as Ast.Node,
				{ type: 'string', content: 'ab' } as unknown as Ast.Node
			])

			const result = await testing.insertCursor(texMath, cursorPos, '|')

			parseStub.restore()
			findNodeStub.restore()
			assert.strictEqual(result, '$\\text{ab}$')
		})

		it('should insert cursor for `a^|b`', async () => {
			const texMath = createMath('$a^b$', new vscode.Position(2, 0))
			const cursorPos = new vscode.Position(2, 3)
			const parseStub = sinon.stub(lw.parser.parse, 'tex').resolves(EMPTY_AST)
			const findNodeStub = sinon.stub(selection, 'findNode').returns([
				{ type: 'root', content: [] } as unknown as Ast.Node,
				{ type: 'string', content: 'a^b' } as unknown as Ast.Node
			])

			const result = await testing.insertCursor(texMath, cursorPos, '|')

			parseStub.restore()
			findNodeStub.restore()
			assert.strictEqual(result, '$a^|b$')
		})

		it('should insert cursor on the correct line of multi-line math', async () => {
			const texMath = createMath('$a+b\nc+d$')
			const cursorPos = new vscode.Position(1, 1)
			const parseStub = sinon.stub(lw.parser.parse, 'tex').resolves(EMPTY_AST)
			const findNodeStub = sinon.stub(selection, 'findNode').returns([
				{ type: 'root', content: [] } as unknown as Ast.Node,
				{ type: 'string', content: 'c+d' } as unknown as Ast.Node
			])

			const result = await testing.insertCursor(texMath, cursorPos, '|')

			parseStub.restore()
			findNodeStub.restore()
			assert.strictEqual(result, '$a+b\nc|+d$')
		})

		it('should reuse cached AST when tex string is unchanged', async () => {
			const texMath = createMath('$a+b$')
			const parseStub = sinon.stub(lw.parser.parse, 'tex').resolves(EMPTY_AST)
			const findNodeStub = sinon.stub(selection, 'findNode').returns([
				{ type: 'root', content: [] } as unknown as Ast.Node,
				{ type: 'string', content: 'a+b' } as unknown as Ast.Node
			])

			await testing.insertCursor(texMath, new vscode.Position(0, 2), '|')
			await testing.insertCursor(texMath, new vscode.Position(0, 3), '|')

			const parseCallCount = parseStub.callCount
			parseStub.restore()
			findNodeStub.restore()
			assert.strictEqual(parseCallCount, 1)
		})
	})

	describe('isCursorInsideTexMath', () => {
		it('should return false at start and end, true inside', () => {
			const texMath = createMath('$a+b$')

			const startResult = testing.isCursorInsideTexMath(texMath.range, new vscode.Position(0, 0))
			const insideLeftResult = testing.isCursorInsideTexMath(texMath.range, new vscode.Position(0, 1))
			const insideRightResult = testing.isCursorInsideTexMath(texMath.range, new vscode.Position(0, 4))
			const endResult = testing.isCursorInsideTexMath(texMath.range, new vscode.Position(0, 5))

			assert.strictEqual(startResult, false)
			assert.strictEqual(insideLeftResult, true)
			assert.strictEqual(insideRightResult, true)
			assert.strictEqual(endResult, false)
		})
	})

	describe('renderCursor', () => {
		it('should return original tex when cursor rendering is disabled', async () => {
			set.config('hover.preview.cursor.enabled', false)
			const texMath = createMath('$a+b$')
			const { activeEditorStub, document } = setActiveEditorCursor('$a+b$', new vscode.Position(0, 2))

			const result = await renderCursor(document, texMath, 'red')

			activeEditorStub.restore()
			assert.strictEqual(result, '$a+b$')
		})

		it('should return original tex when there is no active editor', async () => {
			const activeEditorStub = sinon.stub(vscode.window, 'activeTextEditor').value(undefined)
			const document = new TextDocument('/tmp/main.tex', '$a+b$', {})
			const texMath = createMath('$a+b$')

			const result = await renderCursor(document, texMath, 'red')

			activeEditorStub.restore()
			assert.strictEqual(result, '$a+b$')
		})

		it('should return original tex when cursor is outside math range', async () => {
			const texMath = createMath('$a+b$')
			const { activeEditorStub, document } = setActiveEditorCursor('$a+b$', new vscode.Position(0, 10))

			const result = await renderCursor(document, texMath, 'red')

			activeEditorStub.restore()
			assert.strictEqual(result, '$a+b$')
		})

		it('should return original tex when cursor is in a TeX macro', async () => {
			const texMath = createMath('$\\frac{1}{2}$')
			const { activeEditorStub, document } = setActiveEditorCursor('$\\frac{1}{2}$', new vscode.Position(0, 3))
			const wordRangeStub = sinon.stub(document, 'getWordRangeAtPosition').returns(new vscode.Range(new vscode.Position(0, 1), new vscode.Position(0, 5)))

			const result = await renderCursor(document, texMath, 'red')

			activeEditorStub.restore()
			wordRangeStub.restore()
			assert.strictEqual(result, '$\\frac{1}{2}$')
		})

		it('should insert cursor using auto color', async () => {
			set.config('hover.preview.cursor.symbol', '\\cdot')
			set.config('hover.preview.cursor.color', 'auto')
			const texMath = createMath('$a+b$')
			const { activeEditorStub, document } = setActiveEditorCursor('$a+b$', new vscode.Position(0, 2))
			const wordRangeStub = sinon.stub(document, 'getWordRangeAtPosition').returns(undefined)
			const parseStub = sinon.stub(lw.parser.parse, 'tex').resolves(EMPTY_AST)
			const findNodeStub = sinon.stub(selection, 'findNode').returns([
				{ type: 'root', content: [] } as unknown as Ast.Node,
				{ type: 'string', content: 'a+b' } as unknown as Ast.Node
			])

			const result = await renderCursor(document, texMath, 'orange')

			activeEditorStub.restore()
			wordRangeStub.restore()
			parseStub.restore()
			findNodeStub.restore()
			assert.strictEqual(result, '$a{\\color{orange}\\cdot}+b$')
		})

		it('should insert cursor using configured explicit color', async () => {
			set.config('hover.preview.cursor.symbol', '|')
			set.config('hover.preview.cursor.color', 'cyan')
			const texMath = createMath('$a+b$')
			const { activeEditorStub, document } = setActiveEditorCursor('$a+b$', new vscode.Position(0, 2))
			const wordRangeStub = sinon.stub(document, 'getWordRangeAtPosition').returns(undefined)
			const parseStub = sinon.stub(lw.parser.parse, 'tex').resolves(EMPTY_AST)
			const findNodeStub = sinon.stub(selection, 'findNode').returns([
				{ type: 'root', content: [] } as unknown as Ast.Node,
				{ type: 'string', content: 'a+b' } as unknown as Ast.Node
			])

			const result = await renderCursor(document, texMath, 'orange')

			activeEditorStub.restore()
			wordRangeStub.restore()
			parseStub.restore()
			findNodeStub.restore()
			assert.strictEqual(result, '$a{\\color{cyan}|}+b$')
		})
	})
})
