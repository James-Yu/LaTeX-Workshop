import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { assert, get, mock, set, TextEditor } from './utils'
import { provider } from '../../src/completion/completer/environment'
import { provider as macro } from '../../src/completion/completer/macro'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]
    const texPath = get.path(fixture, 'main.tex')
    let readStub: sinon.SinonStub

    before(() => {
        mock.init(lw, 'root', 'cache', 'parser', 'completion')
        readStub = sinon.stub(lw.file, 'read')
    })

    beforeEach(() => {
        set.root(texPath)
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.completion->environment', () => {
        function getSuggestions() {
            return provider.from(['', ''], {
                uri: lw.file.toUri(texPath),
                langId: 'latex',
                line: '',
                position: new vscode.Position(0, 0),
            })
        }

        function getEnvs() {
            return getSuggestions().map((s) => s.label)
        }

        it('should provide default environments', () => {
            const labels = getEnvs()

            assert.ok(labels.includes('document'))
        })

        it('should provide environments in the form of macros', () => {
            const labels = provider
                .from(['', ''], {
                    uri: lw.file.toUri(texPath),
                    langId: 'latex',
                    line: '',
                    position: new vscode.Position(0, 0),
                })
                .map((s) => s.label)

            assert.ok(labels.includes('document'))
        })

        it('should provide environment snippet when the cursor is `\\begin{|`', () => {
            const stub = mock.activeTextEditor(texPath, '\\begin{')
            const suggestion = provider
                .from(['\\begin{', ''], {
                    uri: lw.file.toUri(texPath),
                    langId: 'latex',
                    line: '\\begin{',
                    position: new vscode.Position(0, 7),
                })
                .find(s => s.label === 'itemize')
            stub.restore()

            assert.ok(suggestion)
            assert.ok(suggestion.insertText instanceof vscode.SnippetString)
            assert.ok(suggestion.insertText.value.startsWith('itemize}\n'), suggestion.insertText.value)
        })

        it('should provide environment name when the cursor is `\\begin{|}`', () => {
            const stub = mock.activeTextEditor(texPath, '\\begin{}')
            const suggestion = provider
                .from(['\\begin{', ''], {
                    uri: lw.file.toUri(texPath),
                    langId: 'latex',
                    line: '\\begin{}',
                    position: new vscode.Position(0, 7),
                })
                .find(s => s.label === 'itemize')
            stub.restore()

            assert.ok(suggestion)
            assert.strictEqual(suggestion.insertText, undefined)
        })

        it('should provide environment name when the cursor is `\\begin{|}\\end{|}`', () => {
            const editor = new TextEditor(texPath, '\\begin{}\\end{}', {})
            editor.setSelections([
                new vscode.Selection(new vscode.Position(0, 7), new vscode.Position(0, 7)),
                new vscode.Selection(new vscode.Position(0, 13), new vscode.Position(0, 13))
            ])
            const stub = sinon.stub(vscode.window, 'activeTextEditor').value(editor)
            const suggestion = provider
                .from(['\\begin{', ''], {
                    uri: lw.file.toUri(texPath),
                    langId: 'latex',
                    line: '\\begin{',
                    position: new vscode.Position(0, 7),
                })
                .find(s => s.label === 'itemize')
            stub.restore()

            assert.ok(suggestion)
            assert.strictEqual(suggestion.insertText, undefined)
        })

        it('should provide environment name when the cursor is `\\end{|`', () => {
            const stub = mock.activeTextEditor(texPath, '\\begin{itemize}\\end{')
            const suggestion = provider
                .from(['\\end{', ''], {
                    uri: lw.file.toUri(texPath),
                    langId: 'latex',
                    line: '\\begin{itemize}\\end{',
                    position: new vscode.Position(0, 20),
                })
                .find(s => s.label === 'itemize')
            stub.restore()

            assert.ok(suggestion)
            assert.strictEqual(suggestion.insertText, undefined)
        })

        it('should provide environments defined in packages', async () => {
            assert.ok(!getEnvs().includes('algorithm'))

            readStub.resolves('\\usepackage{algorithm2e}')
            await lw.cache.refreshCache(texPath)
            assert.ok(getEnvs().includes('algorithm'))
        })

        it('should provide environments defined in packages and filtered by package arguments', async () => {
            readStub.resolves('\\usepackage{algorithm2e}')
            await lw.cache.refreshCache(texPath)
            assert.ok(!getEnvs().includes('algorithm2e'))

            readStub.resolves('\\usepackage[algo2e]{algorithm2e}')
            await lw.cache.refreshCache(texPath)
            assert.ok(getEnvs().includes('algorithm2e'))
        })

        it('should provide environments in the form of macros', async () => {
            readStub.resolves('\\usepackage{algorithm2e}')
            await lw.cache.refreshCache(texPath)

            const labels = macro
                .from(['', ''], {
                    uri: lw.file.toUri(texPath),
                    langId: 'latex',
                    line: '',
                    position: new vscode.Position(0, 0),
                })
                .map((s) => s.label)

            assert.ok(labels.includes('algorithm'))
        })
    })
})
