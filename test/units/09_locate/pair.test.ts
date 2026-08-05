import * as path from 'path'
import * as vscode from 'vscode'
import * as sinon from 'sinon'
import { lw } from '../../../src/lw'
import { pair } from '../../../src/locate/pair'
import { assert, get, mock, TextDocument } from '../utils'

class PairDocument extends TextDocument {
    override getText(range?: vscode.Range): string {
        return range ? this.content.slice(this.offsetAt(range.start), this.offsetAt(range.end)) : this.content
    }

    override offsetAt(position: vscode.Position): number {
        return this.lines.slice(0, position.line).reduce((offset, line) => offset + line.length + 1, 0) + position.character
    }

    override positionAt(offset: number): vscode.Position {
        const before = this.content.slice(0, offset).split('\n')
        return new vscode.Position(before.length - 1, before.at(-1)?.length ?? 0)
    }
}

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const texPath = get.path('main.tex')
    let sandbox: sinon.SinonSandbox

    before(() => {
        mock.init(lw, 'locate', 'parser')
    })

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    after(() => {
        sinon.restore()
    })

    function document(content: string, languageId = 'latex') {
        return new PairDocument(texPath, content, { languageId })
    }

    function activate(content: string, position: vscode.Position, languageId = 'latex') {
        const testDocument = document(content, languageId)
        let selections = [new vscode.Selection(position, position)]
        const insert = sandbox.spy()
        const replace = sandbox.spy()
        const editor = {
            document: testDocument,
            get selection() { return selections[0] },
            set selection(selection: vscode.Selection) { selections = [selection] },
            get selections() { return selections },
            set selections(newSelections: vscode.Selection[]) { selections = newSelections },
            edit: sandbox.stub().callsFake((callback: (editBuilder: vscode.TextEditorEdit) => void) => {
                callback({ insert, replace } as unknown as vscode.TextEditorEdit)
                return Promise.resolve(true)
            })
        } as unknown as vscode.TextEditor
        sandbox.stub(vscode.window, 'activeTextEditor').value(editor)
        return { editor, insert, replace }
    }

    function acceptWorkspaceEdit(testDocument?: PairDocument, success = true) {
        return sandbox.stub(vscode.workspace, 'applyEdit').callsFake(edit => {
            if (success && testDocument) {
                const edits = edit.entries().flatMap(([, items]) => items).map(item => ({
                    start: testDocument.offsetAt(item.range.start),
                    end: testDocument.offsetAt(item.range.end),
                    text: item.newText
                })).sort((a, b) => b.start - a.start)
                for (const item of edits) {
                    testDocument.setContent(testDocument.content.slice(0, item.start) + item.text + testDocument.content.slice(item.end))
                }
            }
            return Promise.resolve(success)
        })
    }

    async function settle() {
        await new Promise(resolve => setImmediate(resolve))
    }

    describe('build', () => {
        it('should return no pairs when parsing fails', async () => {
            sandbox.stub(lw.parser.parse, 'tex').resolves(undefined)

            assert.deepStrictEqual(await pair.build(document('invalid')), [])
            assert.hasLog('Error parsing current document as AST.')
        })

        it('should ignore an AST node without a position', async () => {
            sandbox.stub(lw.parser.parse, 'tex').resolves({
                type: 'root',
                content: [{ type: 'string', content: 'text' }]
            })

            assert.deepStrictEqual(await pair.build(document('text')), [])
        })

        it('should pair a conditional', async () => {
            const pairs = await pair.build(document('\\iftest\na\n\\fi'))

            assert.strictEqual(pairs.length, 1)
            assert.strictEqual(pairs[0].start, '\\iftest')
            assert.strictEqual(pairs[0].end, '\\fi')
        })

        it('should pair inline math delimited by parentheses', async () => {
            const [math] = await pair.build(document('\\(x\\)'))

            assert.strictEqual(math.start, '\\(')
            assert.strictEqual(math.end, '\\)')
        })

        it('should pair inline math delimited by dollar signs', async () => {
            const [math] = await pair.build(document('$x$'))

            assert.strictEqual(math.start, '$')
            assert.strictEqual(math.end, '$')
        })

        it('should pair display math delimited by brackets', async () => {
            const [math] = await pair.build(document('\\[x\\]'))

            assert.strictEqual(math.start, '\\[')
            assert.strictEqual(math.end, '\\]')
        })

        it('should pair display math delimited by dollar signs', async () => {
            const [math] = await pair.build(document('$$x$$'))

            assert.strictEqual(math.start, '$$')
            assert.strictEqual(math.end, '$$')
        })

        it('should pair a math environment', async () => {
            const [environment] = await pair.build(document('\\begin{equation*}x\\end{equation*}'))

            assert.strictEqual(environment.start, '\\begin{equation*}')
            assert.strictEqual(environment.end, '\\end{equation*}')
        })

        it('should nest environments', async () => {
            const [outer] = await pair.build(document('\\begin{center}\\begin{align}x\\end{align}\\end{center}'))

            assert.strictEqual(outer.children.length, 1)
            assert.strictEqual(outer.children[0].start, '\\begin{align}')
            assert.strictEqual(outer.children[0].parent, outer)
        })

        it('should build every child in an environment', async () => {
            const [environment] = await pair.build(document('\\begin{x}\\ifx\\fi\\ify\\fi\\end{x}'))

            assert.deepStrictEqual(environment.children.map(child => child.start), ['\\ifx', '\\ify'])
        })

        it('should ignore pairs before the document environment', async () => {
            const pairs = await pair.build(document('\\ifdraft\\fi\\begin{document}\\(x\\)\\end{document}'))

            assert.deepStrictEqual(pairs.map(macroPair => macroPair.start), ['\\('])
        })

        it('should preserve an unclosed environment', async () => {
            const [environment] = await pair.build(document('\\begin{poo}\nx'))

            assert.strictEqual(environment.start, '\\begin{poo}')
            assert.strictEqual(environment.end, undefined)
        })

        it('should nest unclosed environments', async () => {
            const [outer] = await pair.build(document('\\begin{outer}\n\\begin{inner}'))

            assert.strictEqual(outer.children[0].start, '\\begin{inner}')
            assert.strictEqual(outer.children[0].parent, outer)
        })

        it('should nest a conditional chain in an unclosed environment', async () => {
            const [environment] = await pair.build(document('\\begin{poo}\n\\ifpoo\na\n\\else\nb\n\\fi'))

            assert.deepStrictEqual(environment.children.map(child => [child.start, child.end]), [
                ['\\ifpoo', '\\else'],
                ['\\else', '\\fi']
            ])
        })

        it('should locate a conditional chain in an unclosed environment', async () => {
            const [environment] = await pair.build(document('\\begin{poo}\n\\ifpoo\na\n\\else\nb\n\\fi'))

            assert.deepStrictEqual(environment.children.map(child => [child.startPosition, child.endPosition]), [
                [new vscode.Position(1, 0), new vscode.Position(3, 5)],
                [new vscode.Position(3, 0), new vscode.Position(5, 3)]
            ])
        })

        it('should find pairs in a macro argument', async () => {
            const [conditional] = await pair.build(document('\\item[\\ifdraft x\\fi]'))

            assert.strictEqual(conditional.start, '\\ifdraft')
            assert.strictEqual(conditional.end, '\\fi')
        })

        it('should find pairs in a group', async () => {
            const [conditional] = await pair.build(document('{\\ifdraft x\\fi}'))

            assert.strictEqual(conditional.start, '\\ifdraft')
            assert.strictEqual(conditional.end, '\\fi')
        })
    })

    describe('goto', () => {
        it('should move from an environment start to its end', async () => {
            const { editor } = activate('\\begin{x}\ny\n\\end{x}', new vscode.Position(0, 2))

            await pair.goto()

            assert.deepStrictEqual(editor.selection.active, new vscode.Position(2, 0))
        })

        it('should move from an environment end to its start', async () => {
            const { editor } = activate('\\begin{x}\ny\n\\end{x}', new vscode.Position(2, 2))

            await pair.goto()

            assert.deepStrictEqual(editor.selection.active, new vscode.Position(0, 0))
        })

        it('should move from if to else', async () => {
            const { editor } = activate('\\ifx\na\n\\else\nb\n\\fi', new vscode.Position(0, 0))

            await pair.goto()

            assert.deepStrictEqual(editor.selection.active, new vscode.Position(2, 0))
        })

        it('should move from else to fi', async () => {
            const { editor } = activate('\\ifx\na\n\\else\nb\n\\fi', new vscode.Position(2, 0))

            await pair.goto()

            assert.deepStrictEqual(editor.selection.active, new vscode.Position(4, 0))
        })

        it('should move from fi to the start of a contiguous conditional chain', async () => {
            const { editor } = activate('\\ifx\na\n\\else\nb\n\\fi', new vscode.Position(4, 0))

            await pair.goto()

            assert.deepStrictEqual(editor.selection.active, new vscode.Position(0, 0))
        })

        it('should stop at a non-contiguous conditional', async () => {
            const { editor } = activate('\\ifx\\fi\n\\ify\\fi', new vscode.Position(1, 5))

            await pair.goto()

            assert.deepStrictEqual(editor.selection.active, new vscode.Position(1, 0))
        })

        it('should leave the cursor when it is not on a pair', async () => {
            const position = new vscode.Position(1, 0)
            const { editor } = activate('\\begin{x}\ny\n\\end{x}', position)

            await pair.goto()

            assert.deepStrictEqual(editor.selection.active, position)
        })

        it('should leave the cursor inside an unclosed environment', async () => {
            const position = new vscode.Position(1, 0)
            const { editor } = activate('\\begin{x}\ny', position)

            await pair.goto()

            assert.deepStrictEqual(editor.selection.active, position)
        })
    })

    describe('name', () => {
        it('should select both environment names', async () => {
            const { editor } = activate('\\begin{center}\nx\n\\end{center}', new vscode.Position(1, 0))
            acceptWorkspaceEdit()

            await pair.name('selection')
            await settle()

            assert.deepStrictEqual(editor.selections, [
                new vscode.Selection(0, 7, 0, 13),
                new vscode.Selection(2, 5, 2, 11)
            ])
        })

        it('should add cursors at both environment names', async () => {
            const { editor } = activate('\\begin{center}\nx\n\\end{center}', new vscode.Position(1, 0))
            acceptWorkspaceEdit()

            await pair.name('cursor')
            await settle()

            assert.deepStrictEqual(editor.selections, [
                new vscode.Selection(0, 7, 0, 7),
                new vscode.Selection(2, 5, 2, 5)
            ])
        })

        it('should toggle display math to an equation environment', async () => {
            const { editor } = activate('\\[x\\]', new vscode.Position(0, 2))
            acceptWorkspaceEdit(editor.document as PairDocument)

            await pair.name('equationToggle')
            await settle()

            assert.strictEqual(editor.document.getText(), '\\begin{equation*}x\\end{equation*}')
            assert.deepStrictEqual(editor.selection.active, new vscode.Position(0, 17))
        })

        it('should toggle an equation environment to display math', async () => {
            const { editor } = activate('\\begin{equation*}\nx\n\\end{equation*}', new vscode.Position(1, 0))
            acceptWorkspaceEdit(editor.document as PairDocument)

            await pair.name('equationToggle')
            await settle()

            assert.strictEqual(editor.document.getText(), '\\[\nx\n\\]')
            assert.deepStrictEqual(editor.selection.active, new vscode.Position(1, 0))
        })

        it('should keep a same-line cursor inside a toggled equation', async () => {
            const { editor } = activate('\\begin{equation*}x\\end{equation*}', new vscode.Position(0, 18))
            acceptWorkspaceEdit()

            await pair.name('equationToggle')
            await settle()

            assert.deepStrictEqual(editor.selection.active, new vscode.Position(0, 2))
        })

        it('should add name cursors when converting display math', async () => {
            const { editor } = activate('\\[\nx\n\\]', new vscode.Position(1, 0))
            acceptWorkspaceEdit()

            await pair.name('cursor')
            await settle()

            assert.deepStrictEqual(editor.selections, [
                new vscode.Selection(0, 7, 0, 7),
                new vscode.Selection(2, 5, 2, 5)
            ])
        })

        it('should not update selections when applying an edit fails', async () => {
            const position = new vscode.Position(1, 0)
            const { editor } = activate('\\[\nx\n\\]', position)
            acceptWorkspaceEdit(undefined, false)

            await pair.name('selection')
            await settle()

            assert.deepStrictEqual(editor.selections, [new vscode.Selection(position, position)])
        })

        it('should update selections when an empty edit reports failure', async () => {
            const { editor } = activate('\\begin{x}\ny\n\\end{x}', new vscode.Position(1, 0))
            acceptWorkspaceEdit(undefined, false)

            await pair.name('selection')
            await settle()

            assert.deepStrictEqual(editor.selections, [
                new vscode.Selection(0, 7, 0, 8),
                new vscode.Selection(2, 5, 2, 6)
            ])
        })

        it('should reject an unclosed environment', async () => {
            activate('\\begin{x}\ny', new vscode.Position(1, 0))

            await pair.name('selection')

            assert.hasLog('No matched macro pair found in envNameAction')
        })

        it('should log when there is no surrounding environment', async () => {
            activate('text', new vscode.Position(0, 0))

            await pair.name('selection')

            assert.hasLog('No matched macro pair found in envNameAction')
        })
    })

    describe('select', () => {
        it('should select environment content', async () => {
            const { editor } = activate('\\begin{center}\nx\n\\end{center}', new vscode.Position(1, 0))

            await pair.select('content')

            assert.deepStrictEqual(editor.selection, new vscode.Selection(0, 14, 2, 0))
        })

        it('should select parenthesized inline math content', async () => {
            const { editor } = activate('a \\(x\\) b', new vscode.Position(0, 4))

            await pair.select('content')

            assert.deepStrictEqual(editor.selection, new vscode.Selection(0, 4, 0, 5))
        })

        it('should select dollar-delimited inline math content', async () => {
            const { editor } = activate('a $x$ b', new vscode.Position(0, 3))

            await pair.select('content')

            assert.deepStrictEqual(editor.selection, new vscode.Selection(0, 3, 0, 4))
        })

        it('should select the whole innermost environment', async () => {
            const { editor } = activate('\\begin{a}\n\\begin{b}x\\end{b}\n\\end{a}', new vscode.Position(1, 10))

            await pair.select('whole')

            assert.deepStrictEqual(editor.selection, new vscode.Selection(1, 0, 1, 17))
        })

        it('should expand a whole selection to the outer environment', async () => {
            const { editor } = activate('\\begin{a}\n\\begin{b}x\\end{b}\n\\end{a}', new vscode.Position(1, 10))
            await pair.select('whole')

            await pair.select('whole')

            assert.deepStrictEqual(editor.selection, new vscode.Selection(0, 0, 2, 7))
        })

        it('should leave the selection in an unclosed environment', async () => {
            const position = new vscode.Position(1, 0)
            const { editor } = activate('\\begin{x}\ny', position)

            await pair.select('content')

            assert.deepStrictEqual(editor.selection, new vscode.Selection(position, position))
        })
    })

    describe('close', () => {
        it('should close an indented environment with matching indentation', async () => {
            const { replace } = activate('  \\begin{x}\n  ', new vscode.Position(1, 2))

            await pair.close()

            sinon.assert.calledOnceWithExactly(replace, new vscode.Range(1, 0, 1, 2), '  \\end{x}')
        })

        it('should insert a closing environment after non-whitespace', async () => {
            const position = new vscode.Position(1, 1)
            const { insert } = activate('x\\begin{x}\ny', position)

            await pair.close()

            sinon.assert.calledOnceWithExactly(insert, position, '\\end{x}')
        })

        it('should log when there is no unclosed environment', async () => {
            activate('text', new vscode.Position(0, 0))

            await pair.close()

            assert.hasLog('No matched macro pair found in envNameAction')
        })

        it('should reject a closed environment', async () => {
            activate('\\begin{x}\ny\n\\end{x}', new vscode.Position(1, 0))

            await pair.close()

            assert.hasLog('No matched macro pair found in envNameAction')
        })
    })

    const guardedActions = {
        goto: () => pair.goto(),
        name: () => pair.name('selection'),
        select: () => pair.select('content'),
        close: () => pair.close()
    }

    for (const [actionName, action] of Object.entries(guardedActions)) {
        it(`${actionName} should ignore a missing editor`, async () => {
            sandbox.stub(vscode.window, 'activeTextEditor').value(undefined)
            const parse = sandbox.stub(lw.parser.parse, 'tex')

            await action()

            sinon.assert.notCalled(parse)
        })

        it(`${actionName} should ignore a non-LaTeX editor`, async () => {
            activate('text', new vscode.Position(0, 0), 'plaintext')
            const parse = sandbox.stub(lw.parser.parse, 'tex')

            await action()

            sinon.assert.notCalled(parse)
        })
    }
})
