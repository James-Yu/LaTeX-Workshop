import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import * as sinon from 'sinon'
import { getPath, resetConfig, resetRoot, sleep, stubObject } from './utils'
import { lw } from '../../src/lw'

const testLabel = path.basename(__filename).split('.')[0]

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const rootDir = getPath(testLabel, '01')
    const texPath = getPath(testLabel, '01', 'main.tex')

    before(() => {
        stubObject(lw, 'file', 'watcher')
        resetRoot()
    })

    afterEach(async () => {
        resetRoot()
        await resetConfig()
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.watcher', () => {
        it('should initialize watcher.src with default file extension', () => {
            assert.strictEqual(lw.watcher.src.fileExt, '.*')
        })

        it('should initialize watcher.pdf with .pdf file extension', () => {
            assert.strictEqual(lw.watcher.pdf.fileExt, '.pdf')
        })

        it('should initialize watcher.bib with .bib file extension', () => {
            assert.strictEqual(lw.watcher.bib.fileExt, '.bib')
        })
    })

    describe('lw.watcher.src.add', () => {
        afterEach(() => {
            lw.watcher.src.reset()
        })

        it('should add a new file to be watched and create a new watcher if necessary', () => {
            const stub = sinon.spy(lw.watcher.src as any, 'createWatcher')
            lw.watcher.src.add(texPath)
            assert.ok(stub.called)
            assert.ok(Object.keys(lw.watcher.src._test.getWatchers()).includes(rootDir))
            assert.ok(lw.watcher.src._test.getWatchers()[rootDir].files.has('main.tex'))
        })

        it('should add a file to the existing watcher if a watcher already exists for the folder', () => {
            lw.watcher.src.add(texPath)
            lw.watcher.src.add(getPath(testLabel, '01', 'another.tex'))
            assert.strictEqual(Object.keys(lw.watcher.src._test.getWatchers()).length, 1)
            assert.ok(lw.watcher.src._test.getWatchers()[rootDir].files.has('another.tex'))
        })
    })

    describe('lw.watcher.src.remove', () => {
        afterEach(() => {
            lw.watcher.src.reset()
        })

        it('should remove a file from being watched', () => {
            lw.watcher.src.add(texPath)
            assert.ok(lw.watcher.src._test.getWatchers()[rootDir].files.has('main.tex'))
            lw.watcher.src.remove(texPath)
            assert.ok(!lw.watcher.src._test.getWatchers()[rootDir].files.has('main.tex'))
        })

        it('should not throw an error if the file is not being watched', () => {
            lw.watcher.src.remove(texPath)
            assert.ok(true)
        })
    })

    describe('lw.watcher.src.has', () => {
        afterEach(() => {
            lw.watcher.src.reset()
        })

        it('should return true if a file is being watched', () => {
            lw.watcher.src.add(texPath)
            assert.ok(lw.watcher.src._test.getWatchers()[rootDir].files.has('main.tex'))
        })

        it('should return false if a file is not being watched', () => {
            lw.watcher.src.add(texPath)
            assert.ok(!lw.watcher.src._test.getWatchers()[rootDir].files.has('another.tex'))
        })
    })

    describe('lw.watcher.src.reset', () => {
        afterEach(() => {
            lw.watcher.src.reset()
        })

        it('should dispose of all watchers and reset the watchers map', () => {
            lw.watcher.src.add(texPath)
            const spy = sinon.spy(lw.watcher.src._test.getWatchers()[rootDir].watcher, 'dispose')
            lw.watcher.src.reset()
            spy.restore()
            assert.ok(spy.called)
            assert.strictEqual(Object.keys(lw.watcher.src._test.getWatchers()).length, 0)
        })
    })

    describe('lw.watcher.src.onDidChange', () => {
        const stub = sinon.stub()
        const handler = (filePath: string) => { stub(filePath) }

        beforeEach(() => {
            stub.reset()
            lw.watcher.src.onChange(handler)
        })

        afterEach(() => {
            lw.watcher.src.reset()
            lw.watcher.src._test.handlers.onChangeHandlers.delete(handler)
        })

        it('should call onChangeHandlers when creating watched file', async () => {
            lw.watcher.src.add(texPath)
            await lw.watcher.src._test.onDidChange('create', vscode.Uri.file(texPath))
            assert.strictEqual(stub.callCount, 1)
            assert.strictEqual(stub.getCall(0).args.length, 1)
            assert.strictEqual(stub.getCall(0).args[0], texPath)
        })

        it('should call onChangeHandlers when changing watched file', async () => {
            lw.watcher.src.add(texPath)
            await lw.watcher.src._test.onDidChange('change', vscode.Uri.file(texPath))
            assert.strictEqual(stub.callCount, 1)
            assert.strictEqual(stub.getCall(0).args.length, 1)
            assert.strictEqual(stub.getCall(0).args[0], texPath)
        })

        it('should not call onChangeHandlers when creating non-watched file', async () => {
            lw.watcher.src.add(texPath)
            await lw.watcher.src._test.onDidChange('create', vscode.Uri.file(getPath(testLabel, '01', 'another.tex')))
            assert.strictEqual(stub.callCount, 0)
        })

        it('should not call onChangeHandlers when changing non-watched file', async () => {
            lw.watcher.src.add(texPath)
            await lw.watcher.src._test.onDidChange('change', vscode.Uri.file(getPath(testLabel, '01', 'another.tex')))
            assert.strictEqual(stub.callCount, 0)
        })

        it('should call onChangeHandlers once when quickly changing watched binary file', async () => {
            const binPath = getPath(testLabel, '01', 'main.bin')
            lw.watcher.src.add(binPath)
            await lw.watcher.src._test.onDidChange('change', vscode.Uri.file(binPath))
            await lw.watcher.src._test.onDidChange('change', vscode.Uri.file(binPath))
            await sleep(vscode.workspace.getConfiguration('latex-workshop').get('latex.watch.pdf.delay') as number * 2)
            assert.strictEqual(stub.callCount, 1)
        })

        it('should call onChangeHandlers multiple times when slowly changing watched binary file', async () => {
            const binPath = getPath(testLabel, '01', 'main.bin')
            lw.watcher.src.add(binPath)
            await lw.watcher.src._test.onDidChange('change', vscode.Uri.file(binPath))
            await sleep(vscode.workspace.getConfiguration('latex-workshop').get('latex.watch.pdf.delay') as number * 2)
            await lw.watcher.src._test.onDidChange('change', vscode.Uri.file(binPath))
            await sleep(vscode.workspace.getConfiguration('latex-workshop').get('latex.watch.pdf.delay') as number * 2)
            assert.strictEqual(stub.callCount, 2)
        })
    })

    describe('lw.watcher.src.onDidDelete', () => {
        const stub = sinon.stub()
        const handler = (filePath: string) => { stub(filePath) }

        beforeEach(() => {
            stub.reset()
            lw.watcher.src.onDelete(handler)
        })

        afterEach(() => {
            lw.watcher.src.reset()
            lw.watcher.src._test.handlers.onDeleteHandlers.delete(handler)
        })

        it('should call onDeleteHandlers when deleting watched file', async () => {
            lw.watcher.src.add(texPath)
            await lw.watcher.src._test.onDidDelete(vscode.Uri.file(texPath))
            assert.strictEqual(stub.callCount, 1)
            assert.strictEqual(stub.getCall(0).args.length, 1)
            assert.strictEqual(stub.getCall(0).args[0], texPath)
        })

        it('should not call onChangeHandlers when watched file is deleted then created in a short time', async () => {
            const binPath = getPath(testLabel, '01', 'main.bin')
            lw.watcher.src.add(binPath)
            await lw.watcher.src._test.onDidDelete(vscode.Uri.file(binPath))
            assert.strictEqual(stub.callCount, 0)
        })
    })
})
