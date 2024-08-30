import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { assert, get, mock, set } from './utils'
import { lw } from '../../src/lw'
import * as lwUtils from '../../src/utils/utils'
import { queue } from '../../src/compile/queue'
import { build } from '../../src/compile/external'
import type { ExternalStep } from '../../src/types'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]

    before(() => {
        mock.object(lw, 'file', 'root')
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.compile->external.build', () => {
        afterEach(() => {
            queue.clear()
        })

        it('should save all open files in the workspace', async () => {
            const saveAllStub = sinon.stub(vscode.workspace, 'saveAll') as sinon.SinonStub
            await build('command', ['arg1', 'arg2'], '/cwd', sinon.stub())
            saveAllStub.restore()

            assert.ok(saveAllStub.calledOnce)
        })

        it('should create a Tool object representing the build command and arguments', async () => {
            const rootFile = set.root(fixture, 'main.tex')

            await build('command', ['arg1', 'arg2'], '/cwd', sinon.stub(), rootFile)

            assert.strictEqual(queue._test.getQueue().steps.length, 1)

            const step = queue._test.getQueue().steps[0] as ExternalStep
            assert.strictEqual(step.name, 'command')
            assert.strictEqual(step.command, 'command')
            assert.strictEqual(step.isExternal, true)
            assert.deepStrictEqual(step.args, ['arg1', 'arg2'])
        })

        it('should determine the current working directory for the build', async () => {
            await build('command', ['arg1', 'arg2'], '/cwd', sinon.stub())

            const step = queue._test.getQueue().steps[0] as ExternalStep
            assert.pathStrictEqual(step.cwd, get.path())
        })

        it('should default to cwd if no workspace folder is available', async () => {
            const stub = sinon.stub(vscode.workspace, 'workspaceFolders').get(() => undefined)
            await build('command', ['arg1', 'arg2'], '/cwd', sinon.stub())
            stub.restore()

            const step = queue._test.getQueue().steps[0] as ExternalStep
            assert.pathStrictEqual(step.cwd, '/cwd')
        })

        it('should replace argument placeholders if a root file is provided', async () => {
            const stub = sinon.stub().returnsArg(0)
            const replaceStub = sinon.stub(lwUtils, 'replaceArgumentPlaceholders').returns(stub)
            const pathStub = sinon.stub(lw.file, 'getPdfPath').returns('main.pdf')
            const rootFile = set.root(fixture, 'main.tex')

            await build('command', ['arg1', 'arg2'], '/cwd', sinon.stub(), rootFile)
            replaceStub.restore()
            pathStub.restore()

            assert.ok(stub.calledTwice)
            assert.ok(replaceStub.calledOnce)
            assert.strictEqual(stub.firstCall.args[0], 'arg1')
            assert.strictEqual(stub.secondCall.args[0], 'arg2')
            assert.strictEqual(replaceStub.firstCall.args[0], rootFile)
        })

        it('should not replace argument placeholders if no root file is provided', async () => {
            const stub = sinon.stub().returnsArg(0)
            const replaceStub = sinon.stub(lwUtils, 'replaceArgumentPlaceholders').returns(stub)

            await build('command', ['arg1', 'arg2'], '/cwd', sinon.stub())
            replaceStub.restore()

            assert.ok(stub.notCalled)
            assert.ok(replaceStub.notCalled)
        })

        it('should set the compiledPDFPath if a root file is provided', async () => {
            const rootFile = set.root(fixture, 'main.tex')

            await build('command', ['arg1', 'arg2'], '/cwd', sinon.stub(), rootFile)

            assert.pathStrictEqual(lw.compile.compiledPDFPath, get.path(fixture, 'main.pdf'))
        })

        it('should not set the compiledPDFPath if no root file is provided', async () => {
            await build('command', ['arg1', 'arg2'], '/cwd', sinon.stub())

            assert.strictEqual(lw.compile.compiledPDFPath, '')
        })

        it('should execute the build loop', async () => {
            const stub = sinon.stub().resolves()

            await build('command', ['arg1', 'arg2'], '/cwd', stub)

            assert.ok(stub.calledOnce)
        })

        it('should add the build tool to the queue for execution', async () => {
            const rootFile = set.root(fixture, 'main.tex')

            await build('command', ['arg1', 'arg2'], '/cwd', sinon.stub(), rootFile)

            assert.strictEqual(queue._test.getQueue().steps.length, 1)
        })
    })
})
