import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { assert, get, mock, set, sleep } from './utils'
import { lw } from '../../src/lw'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]

    before(() => {
        mock.object(lw, 'file', 'watcher')
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
            const rootDir = get.path(fixture)
            const texPath = get.path(fixture, 'main.tex')
            const spy = sinon.spy(lw.watcher.src as any, 'createWatcher')

            lw.watcher.src.add(texPath)
            assert.ok(spy.called)
            assert.ok(Object.keys(lw.watcher.src._test.getWatchers()).includes(rootDir))
            assert.ok(lw.watcher.src._test.getWatchers()[rootDir].files.has('main.tex'))
        })

        it('should add a file to the existing watcher if a watcher already exists for the folder', () => {
            const rootDir = get.path(fixture)
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(texPath)
            lw.watcher.src.add(get.path(fixture, 'another.tex'))
            assert.listStrictEqual(Object.keys(lw.watcher.src._test.getWatchers()), [ rootDir ])
            assert.ok(lw.watcher.src._test.getWatchers()[rootDir].files.has('another.tex'))
        })
    })

    describe('lw.watcher.src.remove', () => {
        afterEach(() => {
            lw.watcher.src.reset()
        })

        it('should remove a file from being watched', () => {
            const rootDir = get.path(fixture)
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(texPath)
            assert.ok(lw.watcher.src._test.getWatchers()[rootDir].files.has('main.tex'))
            lw.watcher.src.remove(texPath)
            assert.ok(!lw.watcher.src._test.getWatchers()[rootDir].files.has('main.tex'))
        })

        it('should not throw an error if the file is not being watched', () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.remove(texPath)
            assert.ok(true)
        })
    })

    describe('lw.watcher.src.has', () => {
        afterEach(() => {
            lw.watcher.src.reset()
        })

        it('should return true if a file is being watched', () => {
            const rootDir = get.path(fixture)
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(texPath)
            assert.ok(lw.watcher.src._test.getWatchers()[rootDir].files.has('main.tex'))
        })

        it('should return false if a file is not being watched', () => {
            const rootDir = get.path(fixture)
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(texPath)
            assert.ok(!lw.watcher.src._test.getWatchers()[rootDir].files.has('another.tex'))
        })
    })

    describe('lw.watcher.src.reset', () => {
        afterEach(() => {
            lw.watcher.src.reset()
        })

        it('should dispose of all watchers and reset the watchers map', () => {
            const rootDir = get.path(fixture)
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(texPath)
            const spy = sinon.spy(lw.watcher.src._test.getWatchers()[rootDir].watcher, 'dispose')
            lw.watcher.src.reset()
            spy.restore()
            assert.ok(spy.called)
            assert.listStrictEqual(Object.keys(lw.watcher.src._test.getWatchers()), [ ])
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
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(texPath)
            await lw.watcher.src._test.onDidChange('create', vscode.Uri.file(texPath))
            assert.strictEqual(stub.callCount, 1)
            assert.listStrictEqual(stub.getCall(0).args, [ texPath ])
        })

        it('should call onChangeHandlers when changing watched file', async () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(texPath)
            await lw.watcher.src._test.onDidChange('change', vscode.Uri.file(texPath))
            assert.strictEqual(stub.callCount, 1)
            assert.listStrictEqual(stub.getCall(0).args, [ texPath ])
        })

        it('should not call onChangeHandlers when creating non-watched file', async () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(texPath)
            await lw.watcher.src._test.onDidChange('create', vscode.Uri.file(get.path(fixture, 'another.tex')))
            assert.strictEqual(stub.callCount, 0)
        })

        it('should not call onChangeHandlers when changing non-watched file', async () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(texPath)
            await lw.watcher.src._test.onDidChange('change', vscode.Uri.file(get.path(fixture, 'another.tex')))
            assert.strictEqual(stub.callCount, 0)
        })

        it('should call onChangeHandlers once when quickly changing watched binary file', async function (this: Mocha.Context) {
            this.slow(1050)
            const binPath = get.path(fixture, 'main.bin')

            lw.watcher.src.add(binPath)
            await lw.watcher.src._test.onDidChange('change', vscode.Uri.file(binPath))
            await lw.watcher.src._test.onDidChange('change', vscode.Uri.file(binPath))
            await sleep(500)
            assert.strictEqual(stub.callCount, 1)
        })

        it('should call onChangeHandlers multiple times when slowly changing watched binary file', async function (this: Mocha.Context) {
            this.slow(2050)
            const binPath = get.path(fixture, 'main.bin')

            lw.watcher.src.add(binPath)
            await lw.watcher.src._test.onDidChange('change', vscode.Uri.file(binPath))
            await sleep(500)
            await lw.watcher.src._test.onDidChange('change', vscode.Uri.file(binPath))
            await sleep(500)
            assert.strictEqual(stub.callCount, 2)
        })
    })

    describe('lw.watcher.src.onDidDelete', () => {
        const stub = sinon.stub()
        const handler = (filePath: string) => { stub(filePath) }

        beforeEach(async () => {
            stub.reset()
            lw.watcher.src.onDelete(handler)
            await set.config('latex.watch.delay', 100)
        })

        afterEach(() => {
            lw.watcher.src.reset()
            lw.watcher.src._test.handlers.onDeleteHandlers.delete(handler)
        })

        it('should call onDeleteHandlers when deleting watched file', async function (this: Mocha.Context) {
            this.slow(250)
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(texPath)
            await lw.watcher.src._test.onDidDelete(vscode.Uri.file(texPath))
            assert.strictEqual(stub.callCount, 1)
            assert.listStrictEqual(stub.getCall(0).args, [ texPath ])
        })

        it('should not call onChangeHandlers when watched file is deleted then created in a short time', async function (this: Mocha.Context) {
            this.slow(250)
            const binPath = get.path(fixture, 'main.bin')

            lw.watcher.src.add(binPath)
            await lw.watcher.src._test.onDidDelete(vscode.Uri.file(binPath))
            assert.strictEqual(stub.callCount, 0)
        })
    })
})
