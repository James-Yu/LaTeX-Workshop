import * as vscode from 'vscode'
import * as path from 'path'
import * as os from 'os'
import * as sinon from 'sinon'
import { EventEmitter } from 'events'
import type { ChildProcess } from 'child_process'
import { assert, mock, set, TextDocument } from '../utils'
import { lw } from '../../../src/lw'
import { lint } from '../../../src/lint/latex-linter'
import { chkTeX } from '../../../src/lint/latex-linter/chktex'
import { laCheck } from '../../../src/lint/latex-linter/lacheck'
import { processWrapper } from '../../../src/lint/latex-linter/utils'

describe(path.basename(__filename).split('.')[0] + ':', () => {
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
        let chktexLintRootFileStub: sinon.SinonStub
        let lacheckLintRootFileStub: sinon.SinonStub
        let chktexClearStub: sinon.SinonStub | undefined
        let lacheckClearStub: sinon.SinonStub | undefined

        beforeEach(() => {
            chktexLintRootFileStub = sinon.stub(chkTeX, 'lintRootFile').resolves()
            lacheckLintRootFileStub = sinon.stub(laCheck, 'lintRootFile').resolves()
            chktexClearStub = undefined
            lacheckClearStub = undefined
        })

        afterEach(() => {
            chktexLintRootFileStub.restore()
            lacheckLintRootFileStub.restore()
            chktexClearStub?.restore()
            lacheckClearStub?.restore()
        })

        it('should lint root file with both linters when enabled', () => {
            lint.root()

            assert.strictEqual(chktexLintRootFileStub.callCount, 1)
            assert.strictEqual(chktexLintRootFileStub.firstCall.args[0], '/tmp/main.tex')
            assert.strictEqual(lacheckLintRootFileStub.callCount, 1)
            assert.strictEqual(lacheckLintRootFileStub.firstCall.args[0], '/tmp/main.tex')
        })

        it('should only lint with chktex and clear lacheck diagnostics when lacheck is disabled', () => {
            set.config('linting.lacheck.enabled', false)
            lacheckClearStub = sinon.stub(laCheck.linterDiagnostics, 'clear')

            lint.root()

            assert.strictEqual(chktexLintRootFileStub.callCount, 1)
            assert.strictEqual(lacheckLintRootFileStub.callCount, 0)
            assert.strictEqual(lacheckClearStub.callCount, 1)
        })

        it('should only lint with lacheck and clear chktex diagnostics when chktex is disabled', () => {
            set.config('linting.chktex.enabled', false)
            chktexClearStub = sinon.stub(chkTeX.linterDiagnostics, 'clear')

            lint.root()

            assert.strictEqual(chktexLintRootFileStub.callCount, 0)
            assert.strictEqual(lacheckLintRootFileStub.callCount, 1)
            assert.strictEqual(chktexClearStub.callCount, 1)
        })

        it('should clear both diagnostics and skip linting when both linters are disabled', () => {
            set.config('linting.chktex.enabled', false)
            set.config('linting.lacheck.enabled', false)
            chktexClearStub = sinon.stub(chkTeX.linterDiagnostics, 'clear')
            lacheckClearStub = sinon.stub(laCheck.linterDiagnostics, 'clear')

            lint.root()

            assert.strictEqual(chktexLintRootFileStub.callCount, 0)
            assert.strictEqual(lacheckLintRootFileStub.callCount, 0)
            assert.strictEqual(chktexClearStub.callCount, 1)
            assert.strictEqual(lacheckClearStub.callCount, 1)
        })

        it('should not lint when root file path is undefined', () => {
            lw.root.file.path = undefined

            lint.root()

            assert.strictEqual(chktexLintRootFileStub.callCount, 0)
            assert.strictEqual(lacheckLintRootFileStub.callCount, 0)
        })
    })

    describe('lint.on', () => {
        let clock: sinon.SinonFakeTimers
        let chktexLintFileStub: sinon.SinonStub
        let lacheckLintFileStub: sinon.SinonStub
        let chktexClearStub: sinon.SinonStub | undefined
        let lacheckClearStub: sinon.SinonStub | undefined
        let document: TextDocument

        beforeEach(() => {
            clock = sinon.useFakeTimers({ shouldClearNativeTimers: true })
            chktexLintFileStub = sinon.stub(chkTeX, 'lintFile').resolves()
            lacheckLintFileStub = sinon.stub(laCheck, 'lintFile').resolves()
            chktexClearStub = undefined
            lacheckClearStub = undefined
            document = new TextDocument('/tmp/main.tex', '\\section{A}', {})
        })

        afterEach(() => {
            chktexLintFileStub.restore()
            lacheckLintFileStub.restore()
            chktexClearStub?.restore()
            lacheckClearStub?.restore()
            clock.restore()
        })

        it('should lint on type after configured delay', async () => {
            lint.on(document)
            await clock.tickAsync(299)
            const chktexCallCountBeforeDelay = chktexLintFileStub.callCount
            const lacheckCallCountBeforeDelay = lacheckLintFileStub.callCount

            await clock.tickAsync(1)

            assert.strictEqual(chktexCallCountBeforeDelay, 0)
            assert.strictEqual(lacheckCallCountBeforeDelay, 0)
            assert.strictEqual(chktexLintFileStub.callCount, 1)
            assert.strictEqual(lacheckLintFileStub.callCount, 1)
        })

        it('should not lint on type when run mode is not onType', async () => {
            set.config('linting.run', 'never')

            lint.on(document)
            await clock.tickAsync(500)

            assert.strictEqual(chktexLintFileStub.callCount, 0)
            assert.strictEqual(lacheckLintFileStub.callCount, 0)
        })

        it('should clear disabled linter diagnostics and not schedule lint when no linter is enabled', async () => {
            set.config('linting.chktex.enabled', false)
            set.config('linting.lacheck.enabled', false)
            chktexClearStub = sinon.stub(chkTeX.linterDiagnostics, 'clear')
            lacheckClearStub = sinon.stub(laCheck.linterDiagnostics, 'clear')

            lint.on(document)
            await clock.tickAsync(500)

            assert.strictEqual(chktexLintFileStub.callCount, 0)
            assert.strictEqual(lacheckLintFileStub.callCount, 0)
            assert.strictEqual(chktexClearStub.callCount, 1)
            assert.strictEqual(lacheckClearStub.callCount, 1)
        })

        it('should replace pending timeout with latest lint request', async () => {
            const firstDocument = new TextDocument('/tmp/first.tex', '\\section{First}', {})
            const secondDocument = new TextDocument('/tmp/second.tex', '\\section{Second}', {})

            lint.on(firstDocument)
            await clock.tickAsync(200)
            lint.on(secondDocument)
            await clock.tickAsync(299)
            const chktexCallCountBeforeReplacementDelay = chktexLintFileStub.callCount
            const lacheckCallCountBeforeReplacementDelay = lacheckLintFileStub.callCount

            await clock.tickAsync(1)

            assert.strictEqual(chktexCallCountBeforeReplacementDelay, 0)
            assert.strictEqual(lacheckCallCountBeforeReplacementDelay, 0)
            assert.strictEqual(chktexLintFileStub.callCount, 1)
            assert.strictEqual(lacheckLintFileStub.callCount, 1)
            assert.strictEqual((chktexLintFileStub.firstCall.args[0] as vscode.TextDocument).fileName, '/tmp/second.tex')
            assert.strictEqual((lacheckLintFileStub.firstCall.args[0] as vscode.TextDocument).fileName, '/tmp/second.tex')
        })

        it('should lint with enabled linter only and clear disabled linter diagnostics', async () => {
            set.config('linting.chktex.enabled', false)
            chktexClearStub = sinon.stub(chkTeX.linterDiagnostics, 'clear')

            lint.on(document)
            await clock.tickAsync(300)

            assert.strictEqual(chktexLintFileStub.callCount, 0)
            assert.strictEqual(lacheckLintFileStub.callCount, 1)
            assert.strictEqual(chktexClearStub.callCount, 1)
        })
    })

    describe('utils.processWrapper', () => {
        type EncodableStream = EventEmitter & { setEncoding: (encoding: string) => void }
        type WritableStream = { write: (chunk: string) => void, end: () => void }

        type FakeProcess = ChildProcess & {
            triggerExit: (exitCode?: number) => void,
            triggerError: (error: Error) => void,
            stdoutEncodings: string[],
            stderrEncodings: string[],
            stdinWrites: string[],
            stdinEnded: boolean
        }

        function createFakeProcess({
            stdout = true,
            stderr = true,
            stdin = true,
            flakyStdin = false
        }: {
            stdout?: boolean,
            stderr?: boolean,
            stdin?: boolean,
            flakyStdin?: boolean
        } = {}): FakeProcess {
            const proc = new EventEmitter() as FakeProcess
            proc.stdoutEncodings = []
            proc.stderrEncodings = []
            proc.stdinWrites = []
            proc.stdinEnded = false
            proc.stdout = null
            proc.stderr = null
            proc.stdin = null

            if (stdout) {
                const stdoutStream = new EventEmitter() as EncodableStream
                stdoutStream.setEncoding = encoding => {
                    proc.stdoutEncodings.push(encoding)
                }
                proc.stdout = stdoutStream as unknown as NonNullable<ChildProcess['stdout']>
            }

            if (stderr) {
                const stderrStream = new EventEmitter() as EncodableStream
                stderrStream.setEncoding = encoding => {
                    proc.stderrEncodings.push(encoding)
                }
                proc.stderr = stderrStream as unknown as NonNullable<ChildProcess['stderr']>
            }

            if (stdin) {
                const stdinStream: WritableStream = {
                    write: (chunk: string) => {
                        proc.stdinWrites.push(chunk)
                    },
                    end: () => {
                        proc.stdinEnded = true
                    }
                }

                if (flakyStdin) {
                    let reads = 0
                    Object.defineProperty(proc, 'stdin', {
                        configurable: true,
                        get: () => {
                            reads += 1
                            return reads === 1 ? stdinStream as unknown as NonNullable<ChildProcess['stdin']> : null
                        }
                    })
                } else {
                    proc.stdin = stdinStream as unknown as NonNullable<ChildProcess['stdin']>
                }
            }

            proc.triggerExit = (exitCode = 0) => {
                setImmediate(() => {
                    proc.emit('exit', exitCode)
                })
            }
            proc.triggerError = (error: Error) => {
                setImmediate(() => {
                    proc.emit('error', error)
                })
            }
            return proc
        }

        it('should reject when stdout or stderr streams are missing', async () => {
            const proc = createFakeProcess({ stdout: false })

            await assert.rejects(processWrapper('ChkTeX', proc), /does not provide stdout\/stderr streams/)
        })

        it('should reject when stdin content is provided but the process has no stdin stream', async () => {
            const proc = createFakeProcess({ stdin: false })

            await assert.rejects(processWrapper('LaCheck', proc, 'content'), /does not provide a stdin stream/)
        })

        it('should reject when stdin becomes unavailable before writing', async () => {
            const proc = createFakeProcess({ flakyStdin: true })

            await assert.rejects(processWrapper('LaCheck', proc, 'content'), /does not provide a stdin stream/)
        })

        it('should resolve stdout on successful exit and encode both streams as binary', async () => {
            const proc = createFakeProcess()
            const promise = processWrapper('ChkTeX', proc)

            proc.stdout?.emit('data', 'first ')
            proc.stdout?.emit('data', 'second')
            proc.stderr?.emit('data', 'ignored stderr')
            proc.triggerExit(0)

            const output = await promise

            assert.strictEqual(output, 'first second')
            assert.deepStrictEqual(proc.stdoutEncodings, ['binary'])
            assert.deepStrictEqual(proc.stderrEncodings, ['binary'])
        })

        it('should write stdin, append EOL when missing, and end stdin', async () => {
            const proc = createFakeProcess()
            const promise = processWrapper('ChkTeX', proc, 'content')
            proc.triggerExit(0)

            await promise

            assert.deepStrictEqual(proc.stdinWrites, ['content', os.EOL])
            assert.strictEqual(proc.stdinEnded, true)
        })

        it('should not append an extra EOL when stdin already ends with one', async () => {
            const proc = createFakeProcess()
            const promise = processWrapper('ChkTeX', proc, `content${os.EOL}`)
            proc.triggerExit(0)

            await promise

            assert.deepStrictEqual(proc.stdinWrites, [`content${os.EOL}`])
            assert.strictEqual(proc.stdinEnded, true)
        })

        it('should reject when the process emits an error event', async () => {
            const proc = createFakeProcess()
            const promise = processWrapper('ChkTeX', proc)
            proc.triggerError(new Error('spawn failed'))

            await assert.rejects(promise, /spawn failed/)
        })

        it('should reject with exit details when the process exits with a non-zero code', async () => {
            const proc = createFakeProcess()
            const promise = processWrapper('LaCheck', proc)

            proc.stdout?.emit('data', 'partial stdout')
            proc.stderr?.emit('data', 'stderr output')
            proc.triggerExit(2)

            let rejection: { exitCode: number, stdout: string, stderr: string } | undefined
            try {
                await promise
            } catch (error) {
                rejection = error as { exitCode: number, stdout: string, stderr: string }
            }

            assert.deepStrictEqual(rejection, {
                exitCode: 2,
                stdout: 'partial stdout',
                stderr: 'stderr output'
            })
        })
    })
})
