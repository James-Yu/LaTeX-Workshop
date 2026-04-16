import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { assert, mock, set, TextDocument } from '../utils'
import { lw } from '../../../src/lw'
import { lint } from '../../../src/lint/latex-linter'
import { chkTeX } from '../../../src/lint/latex-linter/chktex'
import { laCheck } from '../../../src/lint/latex-linter/lacheck'

describe.only(path.basename(__filename).split('.')[0] + ':', () => {
    before(() => {
        mock.init(lw, 'lint')
    })

    beforeEach(() => {
        set.config('linting.chktex.enabled', true)
        set.config('linting.lacheck.enabled', true)
        set.config('linting.run', 'onType')
        set.config('linting.delay', 300)
        ;(lw.root.getWorkspace as sinon.SinonStub).returns(vscode.workspace.workspaceFolders?.[0].uri)
        lw.root.file.path = '/tmp/main.tex'
    })

    after(() => {
        sinon.restore()
    })

    describe('lint.root', () => {
        it('should lint root file with both linters when enabled', () => {
            const chktexLintRootFileStub = sinon.stub(chkTeX, 'lintRootFile').resolves()
            const lacheckLintRootFileStub = sinon.stub(laCheck, 'lintRootFile').resolves()

            lint.root()

            chktexLintRootFileStub.restore()
            lacheckLintRootFileStub.restore()

            assert.strictEqual(chktexLintRootFileStub.callCount, 1)
            assert.strictEqual(chktexLintRootFileStub.firstCall.args[0], '/tmp/main.tex')
            assert.strictEqual(lacheckLintRootFileStub.callCount, 1)
            assert.strictEqual(lacheckLintRootFileStub.firstCall.args[0], '/tmp/main.tex')
        })

        it('should only lint with chktex and clear lacheck diagnostics when lacheck is disabled', () => {
            set.config('linting.lacheck.enabled', false)
            const chktexLintRootFileStub = sinon.stub(chkTeX, 'lintRootFile').resolves()
            const lacheckLintRootFileStub = sinon.stub(laCheck, 'lintRootFile').resolves()
            const lacheckClearStub = sinon.stub(laCheck.linterDiagnostics, 'clear')

            lint.root()

            chktexLintRootFileStub.restore()
            lacheckLintRootFileStub.restore()
            lacheckClearStub.restore()

            assert.strictEqual(chktexLintRootFileStub.callCount, 1)
            assert.strictEqual(lacheckLintRootFileStub.callCount, 0)
            assert.strictEqual(lacheckClearStub.callCount, 1)
        })

        it('should only lint with lacheck and clear chktex diagnostics when chktex is disabled', () => {
            set.config('linting.chktex.enabled', false)
            const chktexLintRootFileStub = sinon.stub(chkTeX, 'lintRootFile').resolves()
            const lacheckLintRootFileStub = sinon.stub(laCheck, 'lintRootFile').resolves()
            const chktexClearStub = sinon.stub(chkTeX.linterDiagnostics, 'clear')

            lint.root()

            chktexLintRootFileStub.restore()
            lacheckLintRootFileStub.restore()
            chktexClearStub.restore()

            assert.strictEqual(chktexLintRootFileStub.callCount, 0)
            assert.strictEqual(lacheckLintRootFileStub.callCount, 1)
            assert.strictEqual(chktexClearStub.callCount, 1)
        })

        it('should clear both diagnostics and skip linting when both linters are disabled', () => {
            set.config('linting.chktex.enabled', false)
            set.config('linting.lacheck.enabled', false)
            const chktexLintRootFileStub = sinon.stub(chkTeX, 'lintRootFile').resolves()
            const lacheckLintRootFileStub = sinon.stub(laCheck, 'lintRootFile').resolves()
            const chktexClearStub = sinon.stub(chkTeX.linterDiagnostics, 'clear')
            const lacheckClearStub = sinon.stub(laCheck.linterDiagnostics, 'clear')

            lint.root()

            chktexLintRootFileStub.restore()
            lacheckLintRootFileStub.restore()
            chktexClearStub.restore()
            lacheckClearStub.restore()

            assert.strictEqual(chktexLintRootFileStub.callCount, 0)
            assert.strictEqual(lacheckLintRootFileStub.callCount, 0)
            assert.strictEqual(chktexClearStub.callCount, 1)
            assert.strictEqual(lacheckClearStub.callCount, 1)
        })

        it('should not lint when root file path is undefined', () => {
            lw.root.file.path = undefined
            const chktexLintRootFileStub = sinon.stub(chkTeX, 'lintRootFile').resolves()
            const lacheckLintRootFileStub = sinon.stub(laCheck, 'lintRootFile').resolves()

            lint.root()

            chktexLintRootFileStub.restore()
            lacheckLintRootFileStub.restore()

            assert.strictEqual(chktexLintRootFileStub.callCount, 0)
            assert.strictEqual(lacheckLintRootFileStub.callCount, 0)
        })
    })

    describe('lint.on', () => {
        it('should lint on type after configured delay', async () => {
            const clock = sinon.useFakeTimers({ shouldClearNativeTimers: true })
            const chktexLintFileStub = sinon.stub(chkTeX, 'lintFile').resolves()
            const lacheckLintFileStub = sinon.stub(laCheck, 'lintFile').resolves()
            const document = new TextDocument('/tmp/main.tex', '\\section{A}', {})

            lint.on(document)
            await clock.tickAsync(299)
            const chktexCallCountBeforeDelay = chktexLintFileStub.callCount
            const lacheckCallCountBeforeDelay = lacheckLintFileStub.callCount

            await clock.tickAsync(1)

            chktexLintFileStub.restore()
            lacheckLintFileStub.restore()
            clock.restore()

            assert.strictEqual(chktexCallCountBeforeDelay, 0)
            assert.strictEqual(lacheckCallCountBeforeDelay, 0)
            assert.strictEqual(chktexLintFileStub.callCount, 1)
            assert.strictEqual(lacheckLintFileStub.callCount, 1)
        })

        it('should not lint on type when run mode is not onType', async () => {
            set.config('linting.run', 'never')
            const clock = sinon.useFakeTimers({ shouldClearNativeTimers: true })
            const chktexLintFileStub = sinon.stub(chkTeX, 'lintFile').resolves()
            const lacheckLintFileStub = sinon.stub(laCheck, 'lintFile').resolves()
            const document = new TextDocument('/tmp/main.tex', '\\section{A}', {})

            lint.on(document)
            await clock.tickAsync(500)

            chktexLintFileStub.restore()
            lacheckLintFileStub.restore()
            clock.restore()

            assert.strictEqual(chktexLintFileStub.callCount, 0)
            assert.strictEqual(lacheckLintFileStub.callCount, 0)
        })

        it('should clear disabled linter diagnostics and not schedule lint when no linter is enabled', async () => {
            set.config('linting.chktex.enabled', false)
            set.config('linting.lacheck.enabled', false)
            const clock = sinon.useFakeTimers({ shouldClearNativeTimers: true })
            const chktexLintFileStub = sinon.stub(chkTeX, 'lintFile').resolves()
            const lacheckLintFileStub = sinon.stub(laCheck, 'lintFile').resolves()
            const chktexClearStub = sinon.stub(chkTeX.linterDiagnostics, 'clear')
            const lacheckClearStub = sinon.stub(laCheck.linterDiagnostics, 'clear')
            const document = new TextDocument('/tmp/main.tex', '\\section{A}', {})

            lint.on(document)
            await clock.tickAsync(500)

            chktexLintFileStub.restore()
            lacheckLintFileStub.restore()
            chktexClearStub.restore()
            lacheckClearStub.restore()
            clock.restore()

            assert.strictEqual(chktexLintFileStub.callCount, 0)
            assert.strictEqual(lacheckLintFileStub.callCount, 0)
            assert.strictEqual(chktexClearStub.callCount, 1)
            assert.strictEqual(lacheckClearStub.callCount, 1)
        })

        it('should replace pending timeout with latest lint request', async () => {
            const clock = sinon.useFakeTimers({ shouldClearNativeTimers: true })
            const chktexLintFileStub = sinon.stub(chkTeX, 'lintFile').resolves()
            const lacheckLintFileStub = sinon.stub(laCheck, 'lintFile').resolves()
            const firstDocument = new TextDocument('/tmp/first.tex', '\\section{First}', {})
            const secondDocument = new TextDocument('/tmp/second.tex', '\\section{Second}', {})

            lint.on(firstDocument)
            await clock.tickAsync(200)
            lint.on(secondDocument)
            await clock.tickAsync(299)
            const chktexCallCountBeforeReplacementDelay = chktexLintFileStub.callCount
            const lacheckCallCountBeforeReplacementDelay = lacheckLintFileStub.callCount

            await clock.tickAsync(1)

            chktexLintFileStub.restore()
            lacheckLintFileStub.restore()
            clock.restore()

            assert.strictEqual(chktexCallCountBeforeReplacementDelay, 0)
            assert.strictEqual(lacheckCallCountBeforeReplacementDelay, 0)
            assert.strictEqual(chktexLintFileStub.callCount, 1)
            assert.strictEqual(lacheckLintFileStub.callCount, 1)
            assert.strictEqual((chktexLintFileStub.firstCall.args[0] as vscode.TextDocument).fileName, '/tmp/second.tex')
            assert.strictEqual((lacheckLintFileStub.firstCall.args[0] as vscode.TextDocument).fileName, '/tmp/second.tex')
        })

        it('should lint with enabled linter only and clear disabled linter diagnostics', async () => {
            set.config('linting.chktex.enabled', false)
            const clock = sinon.useFakeTimers({ shouldClearNativeTimers: true })
            const chktexLintFileStub = sinon.stub(chkTeX, 'lintFile').resolves()
            const lacheckLintFileStub = sinon.stub(laCheck, 'lintFile').resolves()
            const chktexClearStub = sinon.stub(chkTeX.linterDiagnostics, 'clear')
            const document = new TextDocument('/tmp/main.tex', '\\section{A}', {})

            lint.on(document)
            await clock.tickAsync(300)

            chktexLintFileStub.restore()
            lacheckLintFileStub.restore()
            chktexClearStub.restore()
            clock.restore()

            assert.strictEqual(chktexLintFileStub.callCount, 0)
            assert.strictEqual(lacheckLintFileStub.callCount, 1)
            assert.strictEqual(chktexClearStub.callCount, 1)
        })
    })
})
