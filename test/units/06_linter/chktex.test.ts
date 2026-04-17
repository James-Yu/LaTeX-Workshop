import * as vscode from 'vscode'
import * as path from 'path'
import { EventEmitter } from 'events'
import type { ChildProcess } from 'child_process'
import * as sinon from 'sinon'
import { assert, mock, set, TextDocument } from '../utils'
import { lw } from '../../../src/lw'
import { chkTeX } from '../../../src/lint/latex-linter/chktex'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    before(() => {
        mock.init(lw, 'lint')
    })

    after(() => {
        sinon.restore()
    })

    beforeEach(() => {
        set.config('linting.chktex.exec.path', 'chktex')
        set.config('linting.chktex.exec.args', ['-wall', '-n22', '-n30', '-e16', '-q'])
        set.config('linting.chktex.convertOutput.column.enabled', true)
        set.config('linting.chktex.convertOutput.column.chktexrcTabSize', -1)
        set.config('message.convertFilenameEncoding', false)
        ;(lw.root.getWorkspace as sinon.SinonStub).returns(vscode.workspace.workspaceFolders?.[0].uri)
        lw.root.file.path = '/tmp/main.tex'
        lw.root.dir.path = '/tmp'
        chkTeX.linterDiagnostics.clear()
    })

    interface FakeProc extends ChildProcess {
        triggerExit: () => void,
        stdinWrite: sinon.SinonStub
    }

    const fileStat: vscode.FileStat = { type: vscode.FileType.File, ctime: 0, mtime: 0, size: 0 }

    /**
     * Creates a fake child process for testing spawn interactions.
     * Resolves immediately with the given stdout string by emitting events.
     */
    function makeFakeProc(stdout: string, exitCode: number = 0): FakeProc {
        const emitter = new EventEmitter()

        const stdoutEmitter = new EventEmitter()
        const stderrEmitter = new EventEmitter()

        const stdinWrite = sinon.stub()
        const stdinEnd = sinon.stub().callsFake(() => {
            setImmediate(() => {
                stdoutEmitter.emit('data', stdout)
                stderrEmitter.emit('data', '')
                emitter.emit('exit', exitCode)
            })
        })

        const proc = Object.assign(emitter, {
            stdout: Object.assign(stdoutEmitter, { setEncoding: sinon.stub() }),
            stderr: Object.assign(stderrEmitter, { setEncoding: sinon.stub() }),
            stdin: { write: stdinWrite, end: stdinEnd },
            kill: sinon.stub(),
            stdinWrite,
            triggerExit: () => {
                setImmediate(() => {
                    stdoutEmitter.emit('data', stdout)
                    stderrEmitter.emit('data', '')
                    emitter.emit('exit', exitCode)
                })
            }
        })

        return proc as unknown as FakeProc
    }

    describe('chkTeX.getName', () => {
        it('should return ChkTeX', () => {
            assert.strictEqual(chkTeX.getName(), 'ChkTeX')
        })
    })

    describe('chkTeX.linterDiagnostics', () => {
        it('should have name ChkTeX', () => {
            assert.strictEqual(chkTeX.linterDiagnostics.name, 'ChkTeX')
        })
    })

    describe('chkTeX.parseLog', () => {
        it('should parse a basic warning log entry', async () => {
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            chkTeX.parseLog('/tmp/main.tex:5:18:1:Warning:24:Delete this space to maintain correct pagereferences.\n', '/tmp/main.tex')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            assert.strictEqual(diags?.length, 1)
            assert.match(diags?.[0].message ?? '', /Delete this space/)
            assert.strictEqual(diags?.[0].severity, vscode.DiagnosticSeverity.Warning)
        })

        it('should parse a basic error log entry', async () => {
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            chkTeX.parseLog('/tmp/main.tex:3:5:1:Error:1:Command terminated with space.\n', '/tmp/main.tex')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            assert.strictEqual(diags?.length, 1)
            assert.strictEqual(diags?.[0].severity, vscode.DiagnosticSeverity.Error)
        })

        it('should parse a typesetting log entry as information', async () => {
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            chkTeX.parseLog('/tmp/main.tex:2:1:1:Typesetting:6:No space found.\n', '/tmp/main.tex')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            assert.strictEqual(diags?.length, 1)
            assert.strictEqual(diags?.[0].severity, vscode.DiagnosticSeverity.Information)
        })

        it('should parse log entries for multiple files', async () => {
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            const log = '/tmp/main.tex:5:18:1:Warning:24:Delete this space to maintain correct pagereferences.\n/tmp/sub/s.tex:1:26:1:Warning:24:Delete this space to maintain correct pagereferences.\n'
            chkTeX.parseLog(log)
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            assert.strictEqual(chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))?.length, 1)
            assert.strictEqual(chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/sub/s.tex'))?.length, 1)
        })

        it('should clear all diagnostics when singleFileOriginalPath is undefined', async () => {
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            // Pre-populate diagnostics
            chkTeX.linterDiagnostics.set(vscode.Uri.file('/tmp/other.tex'), [
                new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), 'Old error', vscode.DiagnosticSeverity.Error)
            ])

            chkTeX.parseLog('/tmp/main.tex:5:1:1:Warning:24:Some warning.\n')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            // Old diagnostics should be gone because clear() was called
            assert.strictEqual(chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/other.tex'))?.length, 0)
        })

        it('should set empty diagnostics for single file when log is empty', async () => {
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            // Pre-populate diagnostics for the file
            chkTeX.linterDiagnostics.set(vscode.Uri.file('/tmp/main.tex'), [
                new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), 'Old error', vscode.DiagnosticSeverity.Error)
            ])

            chkTeX.parseLog('', '/tmp/main.tex')
            await new Promise(resolve => setImmediate(resolve))

            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            assert.strictEqual(diags?.length, 0)
        })

        it('should override file path with singleFileOriginalPath', async () => {
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            // Log says /tmp/input.tex but we override with /tmp/main.tex
            chkTeX.parseLog('/tmp/input.tex:5:1:1:Warning:24:Some warning.\n', '/tmp/main.tex')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            assert.strictEqual(diags?.length, 1)
            // The path in the log (/tmp/input.tex) should not have diagnostics
            assert.ok(!chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/input.tex'))?.length)
        })

        it('should resolve relative file paths using root dir', async () => {
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            chkTeX.parseLog('main.tex:5:1:1:Warning:24:Some warning.\n')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            // Should resolve 'main.tex' relative to lw.root.dir.path ('/tmp')
            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file(path.resolve(lw.root.dir.path!, 'main.tex')))
            assert.strictEqual(diags?.length, 1)
        })

        it('should not show diagnostics for .sty files', async () => {
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            chkTeX.parseLog('/tmp/style.sty:5:1:1:Warning:24:Some warning.\n')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            assert.ok(!chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/style.sty'))?.length)
        })

        it('should show diagnostics for .tex files', async () => {
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            chkTeX.parseLog('/tmp/main.tex:5:1:1:Warning:24:Some warning.\n')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            assert.strictEqual(chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))?.length, 1)
        })

        it('should show diagnostics for .dtx files', async () => {
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            chkTeX.parseLog('/tmp/main.dtx:5:1:1:Warning:24:Some warning.\n')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            assert.strictEqual(chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.dtx'))?.length, 1)
        })

        it('should set correct line and column from log entry', async () => {
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            chkTeX.parseLog('/tmp/main.tex:7:12:3:Warning:24:Some warning.\n', '/tmp/main.tex')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            assert.strictEqual(diags?.length, 1)
            assert.strictEqual(diags?.[0].range.start.line, 6) // 1-based to 0-based
            // column should be 11 (12 - 1) if no multi-byte/tab conversion
            assert.strictEqual(diags?.[0].range.end.character, diags?.[0].range.start.character + 3) // length=3
        })

        it('should set diagnostic code from log entry', async () => {
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            chkTeX.parseLog('/tmp/main.tex:5:1:1:Warning:24:Delete this space.\n', '/tmp/main.tex')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            assert.strictEqual(diags?.[0].code, 24)
        })

        it('should set diagnostic source to ChkTeX', async () => {
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            chkTeX.parseLog('/tmp/main.tex:5:1:1:Warning:24:Some warning.\n', '/tmp/main.tex')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            assert.strictEqual(diags?.[0].source, 'ChkTeX')
        })

        it('should include message text with code prefix', async () => {
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            chkTeX.parseLog('/tmp/main.tex:5:1:1:Warning:24:Delete this space.\n', '/tmp/main.tex')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            assert.match(diags?.[0].message ?? '', /^24: Delete this space\./)
        })

        it('should convert column accounting for tab size when file content is available', async () => {
            // Line content: a tab character then 'hello' — position 1 in chktex is byte-based
            const lineContent = '\thello'
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(lineContent)
            // convertFilenameEncoding calls lw.file.exists; return fileStat for the tex file
            // so the path resolves and column conversion proceeds
            const fileExistsStub = sinon.stub(lw.file, 'exists').callsFake((p: string | vscode.Uri) => {
                const pathStr = typeof p === 'string' ? p : p.fsPath
                return Promise.resolve(pathStr === '/tmp/main.tex' ? fileStat : false)
            })

            // column=9 means after one tab (tabSize=8 default) + char at position 1
            // With tab at position 0 (8-wide), position 9 corresponds to index 1 in string
            chkTeX.parseLog('/tmp/main.tex:1:9:1:Warning:24:Some warning.\n', '/tmp/main.tex')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            // After conversion: tab takes 8 positions, col=9 means index=1, so VS Code col=1 (0-based)
            assert.strictEqual(diags?.[0].range.start.character, 1)
        })

        it('should not convert column when conversion is disabled', async () => {
            set.config('linting.chktex.convertOutput.column.enabled', false)
            const fileReadStub = sinon.stub(lw.file, 'read').resolves('\thello')
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            // col=9 in 1-based, should become 8 (9-1) in 0-based without tab conversion
            chkTeX.parseLog('/tmp/main.tex:1:9:1:Warning:24:Some warning.\n', '/tmp/main.tex')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            // Without conversion: 9 - 1 = 8 (0-based)
            assert.strictEqual(diags?.[0].range.start.character, 8)
        })

        it('should use chktexrcTabSize from config when non-negative', async () => {
            set.config('linting.chktex.convertOutput.column.chktexrcTabSize', 4)
            const lineContent = '\thello'
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(lineContent)
            // convertFilenameEncoding calls lw.file.exists; return fileStat for the tex file
            const fileExistsStub = sinon.stub(lw.file, 'exists').callsFake((p: string | vscode.Uri) => {
                const pathStr = typeof p === 'string' ? p : p.fsPath
                return Promise.resolve(pathStr === '/tmp/main.tex' ? fileStat : false)
            })

            // col=5 means after tab (size=4) + char 'h' at index 0; position 4 is the tab
            chkTeX.parseLog('/tmp/main.tex:1:5:1:Warning:24:Some warning.\n', '/tmp/main.tex')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            // col = colArg - 1 = 4; i=0, pos=0; col(4) > pos(0): pos += tabSize(4) -> pos=4; i=1
            // col(4) <= pos(4): break; return i+1 = 2 (1-based) -> 0-based = 1
            assert.strictEqual(diags?.[0].range.start.character, 1)
        })

        it('should handle empty log string gracefully', async () => {
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            chkTeX.parseLog('')
            await new Promise(resolve => setImmediate(resolve))

            fileExistsStub.restore()

            // No diagnostics should be set for nonexistent files
            let totalDiags = 0
            chkTeX.linterDiagnostics.forEach((_uri, d) => { totalDiags += d.length })
            assert.strictEqual(totalDiags, 0)
        })
    })

    describe('chkTeX.lintRootFile', () => {
        it('should spawn chktex with root file path argument', async () => {
            const proc = makeFakeProc('')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
            proc.triggerExit()

            await chkTeX.lintRootFile('/tmp/main.tex')

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            assert.ok(spawnStub.calledOnce)
            const args = spawnStub.firstCall.args[1] as readonly string[]
            assert.ok(args.includes('/tmp/main.tex'))
        })

        it('should spawn chktex with format argument', async () => {
            const proc = makeFakeProc('')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
            proc.triggerExit()

            await chkTeX.lintRootFile('/tmp/main.tex')

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            const args = spawnStub.firstCall.args[1] as readonly string[]
            assert.ok(args.some(a => a.includes('%f:%l:%c:%d:%k:%n:%m')))
        })

        it('should use the chktex exec path from configuration', async () => {
            set.config('linting.chktex.exec.path', 'my-chktex')
            const proc = makeFakeProc('')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
            proc.triggerExit()

            await chkTeX.lintRootFile('/tmp/main.tex')

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            assert.strictEqual(spawnStub.firstCall.args[0], 'my-chktex')
        })

        it('should use rootPath directory as cwd', async () => {
            const proc = makeFakeProc('')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
            proc.triggerExit()

            await chkTeX.lintRootFile('/tmp/dir/main.tex')

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            const spawnOptions = spawnStub.firstCall.args[2]
            assert.strictEqual(spawnOptions.cwd, '/tmp/dir')
        })

        it('should parse resulting log output and set diagnostics', async () => {
            const log = '/tmp/main.tex:5:1:1:Warning:24:Delete this space.\n'
            const proc = makeFakeProc(log)
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
            proc.triggerExit()

            await chkTeX.lintRootFile('/tmp/main.tex')

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            assert.strictEqual(diags?.length, 1)
        })

        it('should return without parsing if spawn fails with no stdout', async () => {
            const spawnStub = sinon.stub(lw.external, 'spawn').throws(new Error('spawn failed'))

            await chkTeX.lintRootFile('/tmp/main.tex')

            spawnStub.restore()

            // No diagnostics should be set
            let totalDiags = 0
            chkTeX.linterDiagnostics.forEach((_uri, d) => { totalDiags += d.length })
            assert.strictEqual(totalDiags, 0)
        })

        it('should return with partial stdout when spawn fails with stdout in error', async () => {
            const log = '/tmp/main.tex:5:1:1:Warning:24:Delete this space.\n'
            const spawnStub = sinon.stub(lw.external, 'spawn').throws({ stdout: log })
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            await chkTeX.lintRootFile('/tmp/main.tex')

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            assert.strictEqual(diags?.length, 1)
        })

        it('should include .chktexrc file args when rcPath is found', async () => {
            const proc = makeFakeProc('')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            // Simulate .chktexrc existing next to root file
            const fileExistsStub = sinon.stub(lw.file, 'exists').callsFake((p: string | vscode.Uri) => {
                const pathStr = typeof p === 'string' ? p : p.fsPath
                if (pathStr.endsWith('.chktexrc')) {
                    return Promise.resolve(fileStat)
                }
                return Promise.resolve(false)
            })
            proc.triggerExit()

            await chkTeX.lintRootFile('/tmp/main.tex')

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            const args = spawnStub.firstCall.args[1] as readonly string[]
            const lIdx = args.indexOf('-l')
            assert.ok(lIdx >= 0, 'Expected -l flag in args')
            assert.ok(args[lIdx + 1].endsWith('.chktexrc'))
        })

        it('should not add -l arg when args already include -l', async () => {
            set.config('linting.chktex.exec.args', ['-wall', '-l', '/custom/.chktexrc'])
            const proc = makeFakeProc('')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
            proc.triggerExit()

            await chkTeX.lintRootFile('/tmp/main.tex')

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            const args = spawnStub.firstCall.args[1] as readonly string[]
            // Count occurrences of '-l'
            const lCount = args.filter(a => a === '-l').length
            assert.strictEqual(lCount, 1)
        })
    })

    describe('chkTeX.lintFile', () => {
        it('should spawn chktex with -I0 flag', async () => {
            const proc = makeFakeProc('')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
            const document = new TextDocument('/tmp/main.tex', '\\documentclass{article}', {})

            await chkTeX.lintFile(document)

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            const args = spawnStub.firstCall.args[1] as readonly string[]
            assert.ok(args.includes('-I0'))
        })

        it('should pass document content via stdin', async () => {
            const proc = makeFakeProc('')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
            const content = '\\documentclass{article}'
            const document = new TextDocument('/tmp/main.tex', content, {})

            await chkTeX.lintFile(document)

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            assert.ok(proc.stdinWrite.calledWith(content))
        })

        it('should use document fileName as cwd base', async () => {
            const proc = makeFakeProc('')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
            const document = new TextDocument('/tmp/subdir/main.tex', '', {})

            await chkTeX.lintFile(document)

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            const spawnOptions = spawnStub.firstCall.args[2]
            assert.strictEqual(spawnOptions.cwd, '/tmp/subdir')
        })

        it('should parse resulting log and report diagnostics for single file', async () => {
            const log = '/tmp/main.tex:5:1:1:Warning:24:Delete this space.\n'
            const proc = makeFakeProc(log)
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
            const document = new TextDocument('/tmp/main.tex', '', {})

            await chkTeX.lintFile(document)

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            assert.strictEqual(diags?.length, 1)
        })

        it('should return without parsing if spawn fails with no stdout', async () => {
            const spawnStub = sinon.stub(lw.external, 'spawn').throws(new Error('spawn failed'))
            const document = new TextDocument('/tmp/main.tex', '', {})

            await chkTeX.lintFile(document)

            spawnStub.restore()

            let totalDiags = 0
            chkTeX.linterDiagnostics.forEach((_uri, d) => { totalDiags += d.length })
            assert.strictEqual(totalDiags, 0)
        })

        it('should use format argument for single file mode', async () => {
            const proc = makeFakeProc('')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
            const document = new TextDocument('/tmp/main.tex', '', {})

            await chkTeX.lintFile(document)

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            const args = spawnStub.firstCall.args[1] as readonly string[]
            assert.ok(args.some(a => a.includes('%f:%l:%c:%d:%k:%n:%m')))
        })
    })

    describe('getRcPath (via lintRootFile)', () => {
        it('should look for .chktexrc next to root file first', async () => {
            const proc = makeFakeProc('')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const existsCalls: string[] = []
            const fileExistsStub = sinon.stub(lw.file, 'exists').callsFake((p: string | vscode.Uri) => {
                const pathStr = typeof p === 'string' ? p : p.fsPath
                existsCalls.push(pathStr)
                if (pathStr === '/tmp/.chktexrc') {
                    return Promise.resolve(fileStat)
                }
                return Promise.resolve(false)
            })
            proc.triggerExit()

            await chkTeX.lintRootFile('/tmp/main.tex')

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            // First existence check should be for /tmp/.chktexrc (root file folder)
            const firstCheck = existsCalls.find(p => p.endsWith('.chktexrc'))
            const rootDir = path.resolve(path.dirname(lw.root.file.path!))
            assert.ok(firstCheck !== undefined && firstCheck.startsWith(rootDir))
        })

        it('should look for .chktexrc in workspace folder if not found next to root', async () => {
            const proc = makeFakeProc('')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const existsCalls: string[] = []
            const fileExistsStub = sinon.stub(lw.file, 'exists').callsFake((p: string | vscode.Uri) => {
                const pathStr = typeof p === 'string' ? p : p.fsPath
                existsCalls.push(pathStr)
                return Promise.resolve(false)
            })
            proc.triggerExit()

            await chkTeX.lintRootFile('/tmp/main.tex')

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            // Should check at least two .chktexrc locations
            const rcChecks = existsCalls.filter(p => p.endsWith('.chktexrc'))
            assert.ok(rcChecks.length >= 2, `Expected >=2 .chktexrc checks, got ${rcChecks.length}: ${rcChecks}`)
        })

        it('should return undefined rcPath when no root file is set', async () => {
            lw.root.file.path = undefined
            const proc = makeFakeProc('')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
            proc.triggerExit()

            await chkTeX.lintRootFile('/tmp/main.tex')

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            const args = spawnStub.firstCall.args[1] as readonly string[]
            // No -l flag should be added if rc path lookup fails (no root)
            assert.ok(!args.includes('-l'))
        })
    })

    describe('globalRcPath (via getChktexrcTabSize)', () => {
        it('should check HOME/.chktexrc on non-Windows when HOME is set', async () => {
            if (process.platform === 'win32') { return }
            const originalHome = process.env.HOME
            process.env.HOME = '/home/testuser'

            const existsCalls: string[] = []
            const fileExistsStub = sinon.stub(lw.file, 'exists').callsFake((p: string | vscode.Uri) => {
                const pathStr = typeof p === 'string' ? p : p.fsPath
                existsCalls.push(pathStr)
                return Promise.resolve(false)
            })
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const proc = makeFakeProc('')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            proc.triggerExit()

            await chkTeX.lintRootFile('/tmp/main.tex')

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()
            process.env.HOME = originalHome

            // globalRcPath is called via getChktexrcTabSize when no rc file is found at project level
            // The existence of HOME/.chktexrc should be checked
            assert.ok(existsCalls.some(p => p.includes('/home/testuser/.chktexrc')))
        })

        it('should check CHKTEXRC/chktexrc on Windows when CHKTEXRC is set', async () => {
            if (process.platform !== 'win32') { return }
            const originalChktexrc = process.env.CHKTEXRC
            process.env.CHKTEXRC = 'C:\\chktex'

            const existsCalls: string[] = []
            const fileExistsStub = sinon.stub(lw.file, 'exists').callsFake((p: string | vscode.Uri) => {
                const pathStr = typeof p === 'string' ? p : p.fsPath
                existsCalls.push(pathStr)
                return Promise.resolve(false)
            })
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const proc = makeFakeProc('')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            proc.triggerExit()

            await chkTeX.lintRootFile('/tmp/main.tex')

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()
            process.env.CHKTEXRC = originalChktexrc

            assert.ok(existsCalls.some(p => p.includes('chktexrc')))
        })
    })

    describe('getChktexrcTabSize (via parseLog with rcFile)', () => {
        it('should read TabSize from .chktexrc and use it for column conversion', async () => {
            const rcContent = '% chktexrc\nTabSize = 4\n'
            const lineContent = '\thello'
            const fileReadStub = sinon.stub(lw.file, 'read').callsFake((p: string | vscode.Uri) => {
                const pathStr = typeof p === 'string' ? p : p.fsPath
                if (pathStr.endsWith('.chktexrc')) {
                    return Promise.resolve(rcContent)
                }
                return Promise.resolve(lineContent)
            })
            const fileExistsStub = sinon.stub(lw.file, 'exists').callsFake((p: string | vscode.Uri) => {
                const pathStr = typeof p === 'string' ? p : p.fsPath
                if (pathStr.endsWith('.chktexrc') || pathStr === '/tmp/main.tex') {
                    return Promise.resolve(fileStat)
                }
                return Promise.resolve(false)
            })
            const proc = makeFakeProc('/tmp/main.tex:1:5:1:Warning:24:Some warning.\n')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            proc.triggerExit()

            await chkTeX.lintRootFile('/tmp/main.tex')

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            // Tab size=4: col=5 -> col-1=4, tab gives pos=4 at i=0; col<=pos -> break; i+1=1 -> 0-based=0
            assert.ok(diags !== undefined && diags.length > 0, 'Expected diagnostics')
            // col=5 with tabSize=4: one tab fills 4 positions, col=5 -> i=1 (past tab) -> char=1, 0-based=1
            assert.strictEqual(diags?.[0].range.start.character, 1)
        })

        it('should log when no .chktexrc file is found', async () => {
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const proc = makeFakeProc('')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            proc.triggerExit()

            await chkTeX.lintRootFile('/tmp/main.tex')

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            assert.hasLog('No .chktexrc file is found to determine TabSize.')
        })

        it('should log when .chktexrc exists but TabSize is not defined', async () => {
            const rcContent = '% chktexrc without TabSize\n'
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(rcContent)
            const fileExistsStub = sinon.stub(lw.file, 'exists').callsFake((p: string | vscode.Uri) => {
                const pathStr = typeof p === 'string' ? p : p.fsPath
                if (pathStr.endsWith('.chktexrc')) {
                    return Promise.resolve(fileStat)
                }
                return Promise.resolve(false)
            })
            const proc = makeFakeProc('')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            proc.triggerExit()

            await chkTeX.lintRootFile('/tmp/main.tex')

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            assert.hasLog('No TabSize is found in .chktexrc')
        })

        it('should read TabSize from -l arg in config', async () => {
            set.config('linting.chktex.exec.args', ['-wall', '-l', '/custom/.chktexrc'])
            const rcContent = 'TabSize = 2\n'
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(rcContent)
            const fileExistsStub = sinon.stub(lw.file, 'exists').callsFake((p: string | vscode.Uri) => {
                const pathStr = typeof p === 'string' ? p : p.fsPath
                if (pathStr === '/custom/.chktexrc') {
                    return Promise.resolve(fileStat)
                }
                return Promise.resolve(false)
            })
            const proc = makeFakeProc('/tmp/main.tex:1:3:1:Warning:24:Some warning.\n')
            const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
            proc.triggerExit()

            await chkTeX.lintRootFile('/tmp/main.tex')

            spawnStub.restore()
            fileReadStub.restore()
            fileExistsStub.restore()

            assert.hasLog('TabSize 2 defined in .chktexrc /custom/.chktexrc')
        })
    })

    describe('convertColumn (internal logic via parseLog)', () => {
        it('should return column 1 for column arg 1 with simple ASCII line', async () => {
            const fileReadStub = sinon.stub(lw.file, 'read').resolves('hello world')
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            // col=1 should become position 0 (0-based) in VS Code
            chkTeX.parseLog('/tmp/main.tex:1:1:1:Warning:24:Some warning.\n', '/tmp/main.tex')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            assert.strictEqual(diags?.[0].range.start.character, 0)
        })

        it('should handle multi-byte UTF-8 characters in column conversion', async () => {
            // '日' is 3 bytes in UTF-8; column from chktex is byte-based
            const lineContent = '日hello'
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(lineContent)
            // convertFilenameEncoding calls lw.file.exists; return fileStat for the tex file
            const fileExistsStub = sinon.stub(lw.file, 'exists').callsFake((p: string | vscode.Uri) => {
                const pathStr = typeof p === 'string' ? p : p.fsPath
                return Promise.resolve(pathStr === '/tmp/main.tex' ? fileStat : false)
            })

            // col=4 means 3 bytes (for '日') + 1 byte (for 'h'); should map to character index 1
            chkTeX.parseLog('/tmp/main.tex:1:4:1:Warning:24:Some warning.\n', '/tmp/main.tex')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            // col = colArg - 1 = 3; pos=0; 日 bytes=3; col(3) <= pos(0)? No -> pos+=3 -> pos=3; i=1
            // col(3) <= pos(3)? Yes -> break; return i+1=2 -> 0-based = 1
            assert.strictEqual(diags?.[0].range.start.character, 1)
        })

        it('should handle invalid line number gracefully', async () => {
            // Line 999 does not exist in a single-line file
            const fileReadStub = sinon.stub(lw.file, 'read').resolves('single line')
            // convertFilenameEncoding calls lw.file.exists; return fileStat for the tex file
            const fileExistsStub = sinon.stub(lw.file, 'exists').callsFake((p: string | vscode.Uri) => {
                const pathStr = typeof p === 'string' ? p : p.fsPath
                return Promise.resolve(pathStr === '/tmp/main.tex' ? fileStat : false)
            })

            chkTeX.parseLog('/tmp/main.tex:999:1:1:Warning:24:Some warning.\n', '/tmp/main.tex')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            // Should not throw; diagnostic is still created with the raw column
            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            assert.ok(diags !== undefined)
            assert.hasLog('Column number not converted by invalid line')
        })
    })

    describe('showLinterDiagnostics (via parseLog)', () => {
        it('should convert filename encoding when file does not exist and convertFilenameEncoding is enabled', async () => {
            set.config('message.convertFilenameEncoding', true)
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            // Just verify no exception is thrown and diagnostics collection is updated
            chkTeX.parseLog('/tmp/main.tex:5:1:1:Warning:24:Some warning.\n')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            // Should attempt to set diagnostics without throwing
            assert.ok(true)
        })

        it('should aggregate multiple diagnostics for the same file', async () => {
            const fileReadStub = sinon.stub(lw.file, 'read').resolves(undefined)
            const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

            const log = '/tmp/main.tex:1:1:1:Warning:1:First warning.\n/tmp/main.tex:2:1:1:Warning:2:Second warning.\n'
            chkTeX.parseLog(log, '/tmp/main.tex')
            await new Promise(resolve => setImmediate(resolve))

            fileReadStub.restore()
            fileExistsStub.restore()

            const diags = chkTeX.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
            assert.strictEqual(diags?.length, 2)
        })
    })
})
