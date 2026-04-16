import * as path from 'path'
import type { ChildProcess } from 'child_process'
import * as sinon from 'sinon'
import { assert, mock } from '../utils'
import { lw } from '../../../src/lw'
import { queue } from '../../../src/compile/queue'
import { terminate } from '../../../src/compile/terminate'

describe(path.basename(__filename).split('.')[0] + ':', () => {
	let syncStub: sinon.SinonStub
	let clearStub: sinon.SinonStub
	let platform: PropertyDescriptor | undefined

	const setPlatform = (newPlatform: NodeJS.Platform) => {
		Object.defineProperty(process, 'platform', { value: newPlatform })
	}

	const setCompileProcess = (pid: number = 1234) => {
		const killStub = sinon.stub()
		lw.compile.process = { pid, kill: killStub } as unknown as ChildProcess
		return killStub
	}

	before(() => {
		mock.init(lw)
		syncStub = sinon.stub(lw.external, 'sync')
		clearStub = sinon.stub(queue, 'clear')
		platform = Object.getOwnPropertyDescriptor(process, 'platform')
	})

	beforeEach(() => {
		lw.compile.process = undefined
	})

	afterEach(() => {
		syncStub.resetHistory()
		clearStub.resetHistory()
		if (platform !== undefined) {
			Object.defineProperty(process, 'platform', platform)
		}
	})

	after(() => {
		sinon.restore()
	})

	describe('lw.compile->terminate', () => {
		it('should do nothing when no running process is found', () => {
			terminate()

			assert.ok(!syncStub.called)
			assert.ok(!clearStub.called)
			assert.hasLog('LaTeX build process to kill is not found.')
		})

		it('should use pkill on Linux and then clear the queue and kill the process', () => {
			setPlatform('linux')
			const killStub = setCompileProcess(314)
			syncStub.returns({ status: 0, stdout: '', stderr: '' })

			terminate()

			assert.ok(syncStub.calledOnce)
			assert.ok(clearStub.calledOnce)
			assert.ok(killStub.calledOnce)
			assert.deepStrictEqual(syncStub.getCall(0).args[0], 'pkill')
			assert.deepStrictEqual(syncStub.getCall(0).args[1], ['-P', '314'])
			assert.deepStrictEqual(syncStub.getCall(0).args[2], { timeout: 1000, encoding: 'utf8' })
			assert.hasLog('Killed the current process with PID 314')
		})

		it('should use taskkill on Windows and then clear the queue and kill the process', () => {
			setPlatform('win32')
			const killStub = setCompileProcess(2718)
			syncStub.returns({ status: 0, stdout: '', stderr: '' })

			terminate()

			assert.ok(syncStub.calledOnce)
			assert.ok(clearStub.calledOnce)
			assert.ok(killStub.calledOnce)
			assert.deepStrictEqual(syncStub.getCall(0).args[0], 'taskkill')
			assert.deepStrictEqual(syncStub.getCall(0).args[1], ['/F', '/T', '/PID', '2718'])
			assert.deepStrictEqual(syncStub.getCall(0).args[2], { timeout: 1000, encoding: 'utf8' })
			assert.hasLog('Killed the current process with PID 2718')
		})

		it('should log an error when kill command fails but still clear queue and kill process', () => {
			setPlatform('darwin')
			const killStub = setCompileProcess(42)
			syncStub.returns({ status: 1, stdout: '', stderr: 'failed' })

			terminate()

			assert.ok(syncStub.calledOnce)
			assert.ok(clearStub.calledOnce)
			assert.ok(killStub.calledOnce)
			assert.hasLog('Failed killing child processes of the current process.')
			assert.hasLog('Killed the current process with PID 42')
		})
	})
})
