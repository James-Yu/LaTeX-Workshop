import * as path from 'path'
import * as assert from 'assert'
import * as sinon from 'sinon'
import { resetConfig, resetRoot, stubObject } from './utils'
import { lw } from '../../src/lw'
import { _test } from '../../src/core/watcher'


describe(path.basename(__filename).split('.')[0] + ':', () => {
    before(() => {
        stubObject(lw, 'watcher')
        resetRoot()
    })

    afterEach(async () => {
        resetRoot()
        await resetConfig()
    })

    after(() => {
        sinon.restore()
    })

    describe('Watcher constructor', () => {
        it('should create a Watcher instance with the default file extension', () => {
            const watcher = new _test.Watcher()
            assert.strictEqual(watcher.fileExt, '.*')
        })

        it('should create a Watcher instance with the specified file extension', () => {
            const watcher = new _test.Watcher('.pdf')
            assert.strictEqual(watcher.fileExt, '.pdf')
        })
    })

    describe('Watcher.add', () => {
        const watcher = new _test.Watcher()

        afterEach(() => {
            watcher.reset()
        })

        it('should add a new file to be watched and create a new watcher if necessary', () => {
            const handler = sinon.spy()
            const stub = sinon.spy(watcher as any, 'createWatcher')
            watcher.onCreate(handler)
            watcher.add('/path/to/test.txt')
            assert.ok(stub.called)
            assert.ok(Object.keys(watcher.getWatchers()).includes('/path/to'))
            assert.ok(watcher.getWatchers()['/path/to'].files.has('test.txt'))
        })

        it('should add a file to the existing watcher if a watcher already exists for the folder', () => {
            watcher.add('/path/to/test.txt')
            watcher.add('/path/to/another.txt')
            assert.strictEqual(Object.keys(watcher.getWatchers()).length, 1)
            assert.ok(watcher.getWatchers()['/path/to'].files.has('another.txt'))
        })
    })

    describe('Watcher.remove', () => {
        const watcher = new _test.Watcher()

        afterEach(() => {
            watcher.reset()
        })

        it('should remove a file from being watched', () => {
            watcher.add('/path/to/test.txt')
            assert.ok(watcher.getWatchers()['/path/to'].files.has('test.txt'))
            watcher.remove('/path/to/test.txt')
            assert.ok(!watcher.getWatchers()['/path/to'].files.has('test.txt'))
        })

        it('should not throw an error if the file is not being watched', () => {
            watcher.remove('/path/to/notadded.txt')
            assert.ok(true)
        })
    })

    describe('Watcher.has', () => {
        const watcher = new _test.Watcher()

        afterEach(() => {
            watcher.reset()
        })

        it('should return true if a file is being watched', () => {
            watcher.add('/path/to/test.txt')
            assert.ok(watcher.getWatchers()['/path/to'].files.has('test.txt'))
        })

        it('should return false if a file is not being watched', () => {
            watcher.add('/path/to/test.txt')
            assert.ok(!watcher.getWatchers()['/path/to'].files.has('another.txt'))
        })
    })

    describe('Watcher.reset', () => {
        const watcher = new _test.Watcher()

        afterEach(() => {
            watcher.reset()
        })

        it('should dispose of all watchers and reset the watchers map', () => {
            watcher.add('/path/to/test.txt')
            const spy = sinon.spy(watcher.getWatchers()['/path/to'].watcher, 'dispose')
            watcher.reset()
            assert.ok(spy.called)
            assert.strictEqual(Object.keys(watcher.getWatchers()).length, 0)
        })
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
})
