import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { assert, mock, set, log, TextDocument, TextEditor } from '../utils'
import { lw } from '../../../src/lw'
import { formatter } from '../../../src/lint/latex-formatter'
import { latexindent } from '../../../src/lint/latex-formatter/latexindent'
import { texfmt } from '../../../src/lint/latex-formatter/tex-fmt'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    before(() => {
        mock.init(lw, 'lint')
    })

    after(() => {
        sinon.restore()
    })

    const dummyOptions: vscode.FormattingOptions = { tabSize: 4, insertSpaces: true }
    const dummyToken: vscode.CancellationToken = { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) }

    /**
     * Create a TextDocument for a given file path and content.
     * Default content is simple LaTeX with no quotes or math so that
     * fixQuotes / fixMath (disabled by default) produce no side effects.
     */
    function makeDocument(content: string = '\\documentclass{article}\n'): TextDocument {
        return new TextDocument('/tmp/test.tex', content, {})
    }

    /**
     * Stub latexindent and texfmt formatDocument, returning stubs so callers
     * can configure resolved values and restore them later.
     */
    function stubFormatters(): { latexindentStub: sinon.SinonStub, texfmtStub: sinon.SinonStub } {
        return {
            latexindentStub: sinon.stub(latexindent, 'formatDocument').resolves(undefined),
            texfmtStub: sinon.stub(texfmt, 'formatDocument').resolves(undefined),
        }
    }

    describe('formattingProvider.provideDocumentFormattingEdits', () => {
        describe('formatter selection', () => {
            let latexindentStub: sinon.SinonStub
            let texfmtStub: sinon.SinonStub

            beforeEach(() => {
                ({ latexindentStub, texfmtStub } = stubFormatters())
            })

            afterEach(() => {
                latexindentStub.restore()
                texfmtStub.restore()
            })

            it('should delegate to latexindent when formatting.latex is latexindent', async () => {
                set.config('formatting.latex', 'latexindent')
                await formatter.provideDocumentFormattingEdits(makeDocument(), dummyOptions, dummyToken)
                assert.strictEqual(latexindentStub.callCount, 1)
                assert.strictEqual(texfmtStub.callCount, 0)
            })

            it('should delegate to tex-fmt when formatting.latex is tex-fmt', async () => {
                set.config('formatting.latex', 'tex-fmt')
                await formatter.provideDocumentFormattingEdits(makeDocument(), dummyOptions, dummyToken)
                assert.strictEqual(texfmtStub.callCount, 1)
                assert.strictEqual(latexindentStub.callCount, 0)
            })

            it('should log error and use no formatter when formatting.latex is none', async () => {
                set.config('formatting.latex', 'none')
                log.start()
                await formatter.provideDocumentFormattingEdits(makeDocument(), dummyOptions, dummyToken)
                log.stop()
                assert.strictEqual(latexindentStub.callCount, 0)
                assert.strictEqual(texfmtStub.callCount, 0)
                assert.hasLog('Please set your LaTeX formatter')
            })

            it('should log error and use no formatter when formatting.latex is an unknown value', async () => {
                set.config('formatting.latex', 'unknown-tool')
                log.start()
                await formatter.provideDocumentFormattingEdits(makeDocument(), dummyOptions, dummyToken)
                log.stop()
                assert.strictEqual(latexindentStub.callCount, 0)
                assert.strictEqual(texfmtStub.callCount, 0)
                assert.hasLog('Unknown LaTeX formatter')
            })
        })

        describe('edit collection', () => {
            let latexindentStub: sinon.SinonStub

            beforeEach(() => {
                set.config('formatting.latex', 'latexindent')
                latexindentStub = sinon.stub(latexindent, 'formatDocument')
            })

            afterEach(() => {
                latexindentStub.restore()
            })

            it('should include the formatter edit when formatter returns an edit', async () => {
                const formatterEdit = vscode.TextEdit.replace(new vscode.Range(0, 0, 0, 10), 'formatted')
                latexindentStub.resolves(formatterEdit)

                const edits = await formatter.provideDocumentFormattingEdits(makeDocument(), dummyOptions, dummyToken)

                assert.ok(edits.includes(formatterEdit))
            })

            it('should not include a formatter edit when formatter returns undefined', async () => {
                latexindentStub.resolves(undefined)

                // fixQuotes and fixMath are disabled by default, so no edits expected
                assert.strictEqual((await formatter.provideDocumentFormattingEdits(makeDocument(), dummyOptions, dummyToken)).length, 0)
            })

            it('should pass the document and no range to formatter', async () => {
                latexindentStub.resolves(undefined)
                const doc = makeDocument()

                await formatter.provideDocumentFormattingEdits(doc, dummyOptions, dummyToken)

                const args = latexindentStub.firstCall.args as [vscode.TextDocument, vscode.Range | undefined]
                assert.strictEqual(args[0], doc)
                assert.strictEqual(args[1], undefined)
            })

            it('should include fixQuotes edits when format.fixQuotes.enabled is true', async () => {
                set.config('format.fixQuotes.enabled', true)
                latexindentStub.resolves(undefined)

                // Content with straight quotes triggers fixQuotes
                const edits = await formatter.provideDocumentFormattingEdits(makeDocument('"hello" world\n'), dummyOptions, dummyToken)

                assert.ok(edits.length > 0, 'Expected fixQuotes to produce edits')
            })

            it('should include fixMath edits when format.fixMath.enabled is true', async () => {
                set.config('format.fixMath.enabled', true)
                latexindentStub.resolves(undefined)

                // Content with inline math triggers fixMath
                const edits = await formatter.provideDocumentFormattingEdits(makeDocument('$x^2$\n'), dummyOptions, dummyToken)

                assert.ok(edits.length > 0, 'Expected fixMath to produce edits')
            })

            it('should combine formatter edits and fixQuotes edits', async () => {
                set.config('format.fixQuotes.enabled', true)
                const formatterEdit = vscode.TextEdit.replace(new vscode.Range(0, 0, 0, 5), 'formatted')
                latexindentStub.resolves(formatterEdit)

                const edits = await formatter.provideDocumentFormattingEdits(makeDocument('"hello" world\n'), dummyOptions, dummyToken)

                assert.ok(edits.includes(formatterEdit))
                // fixQuotes edits should also be present
                assert.ok(edits.length > 1)
            })
        })
    })

    describe('formattingProvider.provideDocumentRangeFormattingEdits', () => {
        let latexindentStub: sinon.SinonStub
        let activeEditorStub: sinon.SinonStub | undefined

        beforeEach(() => {
            set.config('formatting.latex', 'latexindent')
            latexindentStub = sinon.stub(latexindent, 'formatDocument')
        })

        afterEach(() => {
            latexindentStub.restore()
            activeEditorStub?.restore()
            activeEditorStub = undefined
        })

        it('should pass the document and range to formatter', async () => {
            latexindentStub.resolves(undefined)
            const doc = makeDocument()
            const range = new vscode.Range(0, 0, 0, 10)

            await formatter.provideDocumentRangeFormattingEdits(doc, range, dummyOptions, dummyToken)

            const args = latexindentStub.firstCall.args as [vscode.TextDocument, vscode.Range]
            assert.strictEqual(args[0], doc)
            assert.deepStrictEqual(args[1], range)
        })

        it('should not include a formatter edit when formatter returns undefined', async () => {
            latexindentStub.resolves(undefined)

            // fixQuotes and fixMath are disabled by default
            assert.strictEqual((await formatter.provideDocumentRangeFormattingEdits(makeDocument(), new vscode.Range(0, 0, 0, 10), dummyOptions, dummyToken)).length, 0)
        })

        it('should indent newlines with spaces matching firstNonWhitespaceCharacterIndex', async () => {
            // Line 0 has 4-space indent; range starts at char 4 (the non-whitespace position)
            const content = '    \\begin{document}\n    \\end{document}\n'
            const doc = makeDocument(content)
            const range = new vscode.Range(0, 4, 1, 20)
            const formatterEdit = vscode.TextEdit.replace(range, 'line1\nline2\nline3')

            activeEditorStub = mock.activeTextEditor('/tmp/test.tex', content)
            ;(vscode.window.activeTextEditor as TextEditor).options = { insertSpaces: true, tabSize: 4 }
            latexindentStub.resolves(formatterEdit)

            const edits = await formatter.provideDocumentRangeFormattingEdits(doc, range, dummyOptions, dummyToken)

            const edit = edits.find(e => e.newText.includes('line2'))
            assert.ok(edit, 'Formatter edit expected')
            // Newlines after the first line should be followed by 4 spaces (indent of line 0)
            assert.ok(edit.newText.includes('\n    line2'), `Expected '\\n    line2' in: ${JSON.stringify(edit.newText)}`)
            assert.ok(edit.newText.includes('\n    line3'), `Expected '\\n    line3' in: ${JSON.stringify(edit.newText)}`)
        })

        it('should indent newlines with tabs when insertSpaces is false', async () => {
            // Line 0 has 1-tab indent; range starts at char 1
            const content = '\t\\begin{document}\n\t\\end{document}\n'
            const doc = makeDocument(content)
            const range = new vscode.Range(0, 1, 1, 16)
            const formatterEdit = vscode.TextEdit.replace(range, 'line1\nline2')

            activeEditorStub = mock.activeTextEditor('/tmp/test.tex', content)
            ;(vscode.window.activeTextEditor as TextEditor).options = { insertSpaces: false, tabSize: 4 }
            latexindentStub.resolves(formatterEdit)

            const edits = await formatter.provideDocumentRangeFormattingEdits(doc, range, dummyOptions, dummyToken)

            const edit = edits.find(e => e.newText.includes('line2'))
            assert.ok(edit, 'Formatter edit expected')
            // Newlines should be followed by a tab
            assert.ok(edit.newText.includes('\n\tline2'), `Expected '\\n\\tline2' in: ${JSON.stringify(edit.newText)}`)
        })

        it('should add leading whitespace when selection starts before firstNonWhitespaceCharacterIndex', async () => {
            // Line 0 has 4-space indent; range starts at char 2 (inside the indent)
            // → firstNonWhitespaceCharacterIndex (4) > range.start.character (2), add 2 spaces
            const content = '    \\begin{document}\n'
            const doc = makeDocument(content)
            const range = new vscode.Range(0, 2, 0, 20)
            const formatterEdit = vscode.TextEdit.replace(range, 'formatted')

            activeEditorStub = mock.activeTextEditor('/tmp/test.tex', content)
            ;(vscode.window.activeTextEditor as TextEditor).options = { insertSpaces: true, tabSize: 4 }
            latexindentStub.resolves(formatterEdit)

            const edits = await formatter.provideDocumentRangeFormattingEdits(doc, range, dummyOptions, dummyToken)

            const edit = edits.find(e => e.newText.includes('formatted'))
            assert.ok(edit, 'Formatter edit expected')
            // 4 - 2 = 2 leading spaces prepended
            assert.ok(edit.newText.startsWith('  formatted'), `Expected 2 leading spaces in: ${JSON.stringify(edit.newText)}`)
        })

        it('should not add leading whitespace when selection starts exactly at firstNonWhitespaceCharacterIndex', async () => {
            // Line 0 has 4-space indent; range starts at char 4 (= firstNonWS)
            const content = '    \\begin{document}\n'
            const doc = makeDocument(content)
            const range = new vscode.Range(0, 4, 0, 20)
            const formatterEdit = vscode.TextEdit.replace(range, 'formatted')

            activeEditorStub = mock.activeTextEditor('/tmp/test.tex', content)
            ;(vscode.window.activeTextEditor as TextEditor).options = { insertSpaces: true, tabSize: 4 }
            latexindentStub.resolves(formatterEdit)

            const edits = await formatter.provideDocumentRangeFormattingEdits(doc, range, dummyOptions, dummyToken)

            const edit = edits.find(e => e.newText.includes('formatted'))
            assert.ok(edit, 'Formatter edit expected')
            // No leading whitespace should be added
            assert.ok(edit.newText.startsWith('formatted'), `Expected no leading spaces in: ${JSON.stringify(edit.newText)}`)
        })

        it('should default to space indentation when activeTextEditor is undefined', async () => {
            // Line 0 has 2-space indent; range starts at char 2
            const content = '  \\begin{document}\n'
            const doc = makeDocument(content)
            const range = new vscode.Range(0, 2, 0, 19)
            const formatterEdit = vscode.TextEdit.replace(range, 'line1\nline2')

            activeEditorStub = sinon.stub(vscode.window, 'activeTextEditor').value(undefined)
            latexindentStub.resolves(formatterEdit)

            const edits = await formatter.provideDocumentRangeFormattingEdits(doc, range, dummyOptions, dummyToken)

            const edit = edits.find(e => e.newText.includes('line2'))
            assert.ok(edit, 'Formatter edit expected')
            // Default is insertSpaces=true; indent is firstNonWS=2 spaces
            assert.ok(edit.newText.includes('\n  line2'), `Expected '\\n  line2' in: ${JSON.stringify(edit.newText)}`)
        })

        it('should include fixQuotes edits with range when format.fixQuotes.enabled is true', async () => {
            set.config('format.fixQuotes.enabled', true)
            latexindentStub.resolves(undefined)

            const edits = await formatter.provideDocumentRangeFormattingEdits(makeDocument('"hello" world\n'), new vscode.Range(0, 0, 0, 13), dummyOptions, dummyToken)

            assert.ok(edits.length > 0, 'Expected fixQuotes to produce edits')
        })

        it('should include fixMath edits with range when format.fixMath.enabled is true', async () => {
            set.config('format.fixMath.enabled', true)
            latexindentStub.resolves(undefined)

            const edits = await formatter.provideDocumentRangeFormattingEdits(makeDocument('$x^2$\n'), new vscode.Range(0, 0, 0, 5), dummyOptions, dummyToken)

            assert.ok(edits.length > 0, 'Expected fixMath to produce edits')
        })

        it('should combine formatter edit and fixQuotes edits for range formatting', async () => {
            set.config('format.fixQuotes.enabled', true)
            const range = new vscode.Range(0, 0, 0, 13)
            const formatterEdit = vscode.TextEdit.replace(range, 'formatted')
            latexindentStub.resolves(formatterEdit)

            const edits = await formatter.provideDocumentRangeFormattingEdits(makeDocument('"hello" world\n'), range, dummyOptions, dummyToken)

            assert.ok(edits.includes(formatterEdit))
            assert.ok(edits.length > 1, 'Expected both formatter and fixQuotes edits')
        })
    })
})
