import * as vscode from 'vscode'
import * as path from 'path'
import { EventEmitter } from 'events'
import type { ChildProcess } from 'child_process'
import * as sinon from 'sinon'
import { assert, mock, set, TextDocument } from '../utils'
import { lw } from '../../../src/lw'
import { laCheck } from '../../../src/lint/latex-linter/lacheck'
import * as convertFilename from '../../../src/utils/convertfilename'

describe.only(path.basename(__filename).split('.')[0] + ':', () => {
	before(() => {
		mock.init(lw, 'lint')
	})

	after(() => {
		sinon.restore()
	})

	beforeEach(() => {
		set.config('linting.lacheck.exec.path', 'lacheck')
		set.config('message.convertFilenameEncoding', false)
		;(lw.root.getWorkspace as sinon.SinonStub).returns(vscode.workspace.workspaceFolders?.[0].uri)
		lw.root.file.path = '/tmp/main.tex'
		lw.root.dir.path = '/tmp'
		laCheck.linterDiagnostics.clear()
	})

	interface FakeProc extends ChildProcess {
		triggerExit: () => void,
		stdinWrite: sinon.SinonStub,
		kill: sinon.SinonStub
	}

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

	describe('laCheck.getName', () => {
		it('should return LaCheck', () => {
			assert.strictEqual(laCheck.getName(), 'LaCheck')
		})
	})

	describe('laCheck.linterDiagnostics', () => {
		it('should have name LaCheck', () => {
			assert.strictEqual(laCheck.linterDiagnostics.name, 'LaCheck')
		})
	})

	describe('laCheck.parseLog', () => {
		it('should parse a basic log entry for a single file', async () => {
			const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

			laCheck.parseLog('"main.tex", line 7: double space at "~~"\n', '/tmp/main.tex')
			await new Promise(resolve => setImmediate(resolve))

			fileExistsStub.restore()

			const diags = laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
			assert.strictEqual(diags?.length, 1)
			assert.match(diags?.[0].message ?? '', /double space at/)
			assert.strictEqual(diags?.[0].severity, vscode.DiagnosticSeverity.Warning)
			assert.strictEqual(diags?.[0].source, 'LaCheck')
			assert.strictEqual(diags?.[0].range.start.line, 6)
			assert.strictEqual(diags?.[0].range.start.character, 0)
			assert.strictEqual(diags?.[0].range.end.character, 65535)
		})

		it('should parse entries for multiple files as in integration tests', async () => {
			const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
			const log = '"main.tex", line 7: double space at "~~"\n** sub/sub:\n"sub/s.tex", line 2: double space at "~~"\n'

			laCheck.parseLog(log, '/tmp/main.tex')
			await new Promise(resolve => setImmediate(resolve))

			fileExistsStub.restore()

			assert.strictEqual(laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))?.length, 1)
			assert.strictEqual(laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/sub/s.tex'))?.length, 1)
			assert.match(laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/sub/s.tex'))?.[0].message ?? '', /double space at/)
		})

		it('should parse two-line arrow format and combine messages', async () => {
			const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
			const log = '"main.tex", line 3: <- perhaps a typo\n... line 9 ... -> consider rewriting\n'

			laCheck.parseLog(log, '/tmp/main.tex')
			await new Promise(resolve => setImmediate(resolve))

			fileExistsStub.restore()

			const diags = laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
			assert.strictEqual(diags?.length, 1)
			assert.strictEqual(diags?.[0].message, 'perhaps a typo -> consider rewriting at Line 9')
		})

		it('should keep original message when arrow format has no valid next line', async () => {
			const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
			const log = '"main.tex", line 3: <- perhaps a typo\nthis line does not match\n'

			laCheck.parseLog(log, '/tmp/main.tex')
			await new Promise(resolve => setImmediate(resolve))

			fileExistsStub.restore()

			const diags = laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))
			assert.strictEqual(diags?.length, 1)
			assert.strictEqual(diags?.[0].message, 'perhaps a typo')
		})

		it('should ignore malformed lines', async () => {
			const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

			laCheck.parseLog('not a lacheck log line\nanother malformed line\n', '/tmp/main.tex')
			await new Promise(resolve => setImmediate(resolve))

			fileExistsStub.restore()

			assert.strictEqual(laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))?.length, 0)
		})

		it('should clear previous diagnostics before adding new diagnostics', async () => {
			const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

			laCheck.linterDiagnostics.set(vscode.Uri.file('/tmp/old.tex'), [
				new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), 'old warning', vscode.DiagnosticSeverity.Warning)
			])

			laCheck.parseLog('')
			await new Promise(resolve => setImmediate(resolve))

			fileExistsStub.restore()

			assert.strictEqual(laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/old.tex'))?.length, 0)
		})

		it('should resolve relative paths from provided filePath directory', async () => {
			const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)

			laCheck.parseLog('"sub/s.tex", line 2: warning\n', '/tmp/main.tex')
			await new Promise(resolve => setImmediate(resolve))

			fileExistsStub.restore()

			assert.strictEqual(laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/sub/s.tex'))?.length, 1)
		})

		it('should resolve relative paths from lw.root.file.path when filePath is undefined', async () => {
			const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
			lw.root.file.path = '/workspace/project/main.tex'

			laCheck.parseLog('"sub/s.tex", line 4: warning\n')
			await new Promise(resolve => setImmediate(resolve))

			fileExistsStub.restore()

			assert.strictEqual(laCheck.linterDiagnostics.get(vscode.Uri.file('/workspace/project/sub/s.tex'))?.length, 1)
		})

		it('should report diagnostics only on supported file extensions', async () => {
			const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
			const log = [
				'"main.tex", line 1: tex warning',
				'"style.sty", line 2: sty warning',
				'"bibstyle.bbx", line 3: bbx warning',
				'"citation.cbx", line 4: cbx warning',
				'"doc.dtx", line 5: dtx warning'
			].join('\n') + '\n'

			laCheck.parseLog(log, '/tmp/main.tex')
			await new Promise(resolve => setImmediate(resolve))

			fileExistsStub.restore()

			assert.strictEqual(laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))?.length, 1)
			assert.strictEqual(laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/bibstyle.bbx'))?.length, 1)
			assert.strictEqual(laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/citation.cbx'))?.length, 1)
			assert.strictEqual(laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/doc.dtx'))?.length, 1)
			assert.ok(!laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/style.sty'))?.length)
		})

		it('should convert filename encoding when file does not exist and conversion is enabled', async () => {
			set.config('message.convertFilenameEncoding', true)
			const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
			const convertStub = sinon.stub(convertFilename, 'convertFilenameEncoding').resolves('/tmp/converted.tex')

			laCheck.parseLog('"missing.tex", line 6: converted warning\n', '/tmp/main.tex')
			await new Promise(resolve => setImmediate(resolve))

			fileExistsStub.restore()
			convertStub.restore()

			assert.strictEqual(laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/converted.tex'))?.length, 1)
			assert.ok(!laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/missing.tex'))?.length)
		})

		it('should keep original filename when conversion returns undefined', async () => {
			set.config('message.convertFilenameEncoding', true)
			const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
			const convertStub = sinon.stub(convertFilename, 'convertFilenameEncoding').resolves(undefined)

			laCheck.parseLog('"missing.tex", line 6: fallback warning\n', '/tmp/main.tex')
			await new Promise(resolve => setImmediate(resolve))

			fileExistsStub.restore()
			convertStub.restore()

			assert.strictEqual(laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/missing.tex'))?.length, 1)
		})
	})

	describe('laCheck.lintRootFile', () => {
		it('should spawn lacheck with root file path and cwd', async () => {
			const proc = makeFakeProc('')
			const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
			proc.triggerExit()

			await laCheck.lintRootFile('/tmp/sub/main.tex')

			spawnStub.restore()

			assert.ok(spawnStub.calledOnce)
			assert.strictEqual(spawnStub.firstCall.args[0], 'lacheck')
			assert.deepStrictEqual(spawnStub.firstCall.args[1], ['/tmp/sub/main.tex'])
			assert.strictEqual(spawnStub.firstCall.args[2].cwd, '/tmp/sub')
		})

		it('should parse stdout and set diagnostics when spawn throws with stdout', async () => {
			const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
			const log = '"main.tex", line 5: warning from error stdout\n'
			const spawnStub = sinon.stub(lw.external, 'spawn').throws({ stdout: log })

			await laCheck.lintRootFile('/tmp/main.tex')
			await new Promise(resolve => setImmediate(resolve))

			spawnStub.restore()
			fileExistsStub.restore()

			assert.strictEqual(laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/main.tex'))?.length, 1)
		})

		it('should return without parsing when spawn throws without stdout', async () => {
			const spawnStub = sinon.stub(lw.external, 'spawn').throws(new Error('spawn failed'))

			await laCheck.lintRootFile('/tmp/main.tex')

			spawnStub.restore()

			let totalDiags = 0
			laCheck.linterDiagnostics.forEach((_uri, diagnostics) => { totalDiags += diagnostics.length })
			assert.strictEqual(totalDiags, 0)
		})

		it('should kill previous linter process before starting a new one', async () => {
			const firstProc = makeFakeProc('')
			const secondProc = makeFakeProc('')
			const spawnStub = sinon.stub(lw.external, 'spawn')
			spawnStub.onFirstCall().returns(firstProc)
			spawnStub.onSecondCall().returns(secondProc)
			firstProc.triggerExit()

			await laCheck.lintRootFile('/tmp/main.tex')

			secondProc.triggerExit()
			await laCheck.lintRootFile('/tmp/other.tex')

			spawnStub.restore()

			assert.strictEqual(firstProc.kill.callCount, 1)
			assert.strictEqual(spawnStub.callCount, 2)
		})
	})

	describe('laCheck.lintFile', () => {
		it('should spawn lacheck for active document and pass content via stdin', async () => {
			const proc = makeFakeProc('')
			const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
			const document = new TextDocument('/tmp/sub/main.tex', '\\documentclass{article}', {})

			await laCheck.lintFile(document)

			spawnStub.restore()

			assert.ok(spawnStub.calledOnce)
			assert.strictEqual(spawnStub.firstCall.args[0], 'lacheck')
			assert.deepStrictEqual(spawnStub.firstCall.args[1], ['/tmp/sub/main.tex'])
			assert.strictEqual(spawnStub.firstCall.args[2].cwd, '/tmp/sub')
			assert.ok(proc.stdinWrite.calledWith('\\documentclass{article}'))
		})

		it('should parse lintFile output relative to document path', async () => {
			const fileExistsStub = sinon.stub(lw.file, 'exists').resolves(false)
			const proc = makeFakeProc('"main.tex", line 2: active file warning\n')
			const spawnStub = sinon.stub(lw.external, 'spawn').returns(proc)
			const document = new TextDocument('/tmp/project/main.tex', '', {})

			await laCheck.lintFile(document)
			await new Promise(resolve => setImmediate(resolve))

			spawnStub.restore()
			fileExistsStub.restore()

			assert.strictEqual(laCheck.linterDiagnostics.get(vscode.Uri.file('/tmp/project/main.tex'))?.length, 1)
		})

		it('should return without parsing when lintFile spawn throws without stdout', async () => {
			const spawnStub = sinon.stub(lw.external, 'spawn').throws(new Error('spawn failed'))
			const document = new TextDocument('/tmp/main.tex', '', {})

			await laCheck.lintFile(document)

			spawnStub.restore()

			let totalDiags = 0
			laCheck.linterDiagnostics.forEach((_uri, diagnostics) => { totalDiags += diagnostics.length })
			assert.strictEqual(totalDiags, 0)
		})
	})
})
