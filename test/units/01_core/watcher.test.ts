import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { assert, get, mock, set, sleep } from '../utils'
import { lw } from '../../../src/lw'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = get.fixture(__filename)
    let _onDidChangeSpy: sinon.SinonSpy
    const callOnDidChange = async (event: 'create' | 'change', uri: vscode.Uri) => { await _onDidChangeSpy.call(lw.watcher.src, event, uri) }
    let _onDidDeleteSpy: sinon.SinonSpy
    const callOnDidDelete = async (uri: vscode.Uri) => { await _onDidDeleteSpy.call(lw.watcher.src, uri) }
    let _watchersSpy: sinon.SinonSpy
    const getWatchers = () => _watchersSpy.call(lw.watcher.src) as {[folder: string]: {watcher: vscode.FileSystemWatcher, files: Set<string>}}
    let _onChangeHandlersSpy: sinon.SinonSpy
    const getOnChangeHandlers = () => _onChangeHandlersSpy.call(lw.watcher.src) as Set<(uri: vscode.Uri) => void>
    let _onDeleteHandlersSpy: sinon.SinonSpy
    const getOnDeleteHandlers = () => _onDeleteHandlersSpy.call(lw.watcher.src) as Set<(uri: vscode.Uri) => void>
    let _onCreateHandlersSpy: sinon.SinonSpy
    const getOnCreateHandlers = () => _onCreateHandlersSpy.call(lw.watcher.src) as Set<(uri: vscode.Uri) => void>
    const getPolling = () => (lw.watcher.src as any).polling as {[uri: string]: {time: number, size: number}}
    let _handlePollingSpy: sinon.SinonSpy
    const callHandlePolling = async (uri: vscode.Uri, firstChangeTime: number, interval: NodeJS.Timeout) => {
        await _handlePollingSpy.call(lw.watcher.src, uri, firstChangeTime, interval)
    }

    before(() => {
        mock.init(lw, 'watcher')
        _onDidChangeSpy = sinon.spy(lw.watcher.src as any, 'onDidChange')
        _onDidDeleteSpy = sinon.spy(lw.watcher.src as any, 'onDidDelete')
        _watchersSpy = sinon.spy(lw.watcher.src as any, 'watchers', ['get']).get
        _onChangeHandlersSpy = sinon.spy(lw.watcher.src as any, 'onChangeHandlers', ['get']).get
        _onDeleteHandlersSpy = sinon.spy(lw.watcher.src as any, 'onDeleteHandlers', ['get']).get
        _onCreateHandlersSpy = sinon.spy(lw.watcher.src as any, 'onCreateHandlers', ['get']).get
        _handlePollingSpy = sinon.spy(lw.watcher.src as any, 'handlePolling')
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

            lw.watcher.src.add(vscode.Uri.file(texPath))
            assert.ok(spy.called)
            assert.ok(Object.keys(getWatchers()).includes(rootDir))
            assert.ok(getWatchers()[rootDir].files.has('main.tex'))
        })

        it('should add a file to the existing watcher if a watcher already exists for the folder', () => {
            const rootDir = get.path(fixture)
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(vscode.Uri.file(texPath))
            lw.watcher.src.add(vscode.Uri.file(get.path(fixture, 'another.tex')))
            assert.listStrictEqual(Object.keys(getWatchers()), [ rootDir ])
            assert.ok(getWatchers()[rootDir].files.has('another.tex'))
        })

        it('should notify create handlers for files added to new and existing folder watchers', () => {
            const handler = sinon.spy()
            const mainUri = vscode.Uri.file(get.path(fixture, 'main.tex'))
            const anotherUri = vscode.Uri.file(get.path(fixture, 'another.tex'))
            lw.watcher.src.onCreate(handler)

            lw.watcher.src.add(mainUri)
            lw.watcher.src.add(anotherUri)
            getOnCreateHandlers().delete(handler)

            sinon.assert.calledTwice(handler)
            sinon.assert.calledWith(handler, mainUri)
            sinon.assert.calledWith(handler, anotherUri)
        })
    })

    describe('lw.watcher.src.remove', () => {
        afterEach(() => {
            lw.watcher.src.reset()
        })

        it('should remove a file from being watched', () => {
            const rootDir = get.path(fixture)
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(vscode.Uri.file(texPath))
            assert.ok(getWatchers()[rootDir].files.has('main.tex'))
            lw.watcher.src.remove(vscode.Uri.file(texPath))
            assert.ok(!getWatchers()[rootDir].files.has('main.tex'))
        })

        it('should not throw an error if the file is not being watched', () => {
            const texPath = get.path(fixture, 'main.tex')

            assert.doesNotThrow(() => lw.watcher.src.remove(vscode.Uri.file(texPath)))
        })
    })

    describe('lw.watcher.src.has', () => {
        afterEach(() => {
            lw.watcher.src.reset()
        })

        it('should return true if a file is being watched', () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(vscode.Uri.file(texPath))
            assert.ok(lw.watcher.src.has(vscode.Uri.file(texPath)))
        })

        it('should return false if a file is not being watched', () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(vscode.Uri.file(texPath))
            assert.ok(!lw.watcher.src.has(vscode.Uri.file(get.path(fixture, 'another.tex'))))
        })
    })

    describe('lw.watcher.src.reset', () => {
        afterEach(() => {
            lw.watcher.src.reset()
        })

        it('should dispose of all watchers and reset the watchers map', () => {
            const rootDir = get.path(fixture)
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(vscode.Uri.file(texPath))
            const spy = sinon.spy(getWatchers()[rootDir].watcher, 'dispose')
            lw.watcher.src.reset()
            spy.restore()
            assert.ok(spy.called)
            assert.listStrictEqual(Object.keys(getWatchers()), [ ])
        })
    })

    describe('lw.watcher.src.onDidChange', () => {
        const stub = sinon.stub()
        const handler = (filePath: vscode.Uri) => { stub(filePath.fsPath) }

        beforeEach(() => {
            stub.reset()
            lw.watcher.src.onChange(handler)
        })

        afterEach(() => {
            lw.watcher.src.reset()
            getOnChangeHandlers().delete(handler)
        })

        it('should call onChangeHandlers when creating watched file', async () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(vscode.Uri.file(texPath))
            await callOnDidChange('create', vscode.Uri.file(texPath))
            assert.strictEqual(stub.callCount, 1)
            assert.listStrictEqual(stub.getCall(0).args, [ texPath ])
        })

        it('should call onChangeHandlers when changing watched file', async () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(vscode.Uri.file(texPath))
            await callOnDidChange('change', vscode.Uri.file(texPath))
            assert.strictEqual(stub.callCount, 1)
            assert.listStrictEqual(stub.getCall(0).args, [ texPath ])
        })

        it('should not call onChangeHandlers when creating non-watched file', async () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(vscode.Uri.file(texPath))
            await callOnDidChange('create', vscode.Uri.file(get.path(fixture, 'another.tex')))
            assert.strictEqual(stub.callCount, 0)
        })

        it('should not call onChangeHandlers when changing non-watched file', async () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(vscode.Uri.file(texPath))
            await callOnDidChange('change', vscode.Uri.file(get.path(fixture, 'another.tex')))
            assert.strictEqual(stub.callCount, 0)
        })

        it('should call onChangeHandlers once when quickly changing watched binary file', async () => {
            const binPath = get.path(fixture, 'main.bin')

            lw.watcher.src.add(vscode.Uri.file(binPath))
            await callOnDidChange('change', vscode.Uri.file(binPath))
            await callOnDidChange('change', vscode.Uri.file(binPath))
            await sleep(500)
            assert.strictEqual(stub.callCount, 1)
        })

        it('should call onChangeHandlers multiple times when slowly changing watched binary file', async () => {
            const binPath = get.path(fixture, 'main.bin')

            lw.watcher.src.add(vscode.Uri.file(binPath))
            await callOnDidChange('change', vscode.Uri.file(binPath))
            await sleep(500)
            await callOnDidChange('change', vscode.Uri.file(binPath))
            await sleep(500)
            assert.strictEqual(stub.callCount, 2)
        })
    })

    describe('lw.watcher.src.onDidDelete', () => {
        const stub = sinon.stub()
        const handler = (filePath: vscode.Uri) => { stub(filePath.fsPath) }

        beforeEach(() => {
            stub.reset()
            lw.watcher.src.onDelete(handler)
            set.config('latex.watch.delay', 100)
        })

        afterEach(() => {
            lw.watcher.src.reset()
            getOnDeleteHandlers().delete(handler)
        })

        it('should call onDeleteHandlers when deleting watched file', async () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.watcher.src.add(vscode.Uri.file(texPath))
            await callOnDidDelete(vscode.Uri.file(texPath))
            assert.strictEqual(stub.callCount, 1)
            assert.listStrictEqual(stub.getCall(0).args, [ texPath ])
        })

        it('should ignore deletion events for files that are not watched', async () => {
            await callOnDidDelete(vscode.Uri.file(get.path(fixture, 'another.tex')))

            assert.strictEqual(stub.callCount, 0)
        })

        it('should not call onDeleteHandlers when a delete event is emitted for an existing file', async () => {
            const binPath = get.path(fixture, 'main.bin')

            lw.watcher.src.add(vscode.Uri.file(binPath))
            await callOnDidDelete(vscode.Uri.file(binPath))
            assert.strictEqual(stub.callCount, 0)
        })
    })

    describe('lw.watcher.src.handlePolling', () => {
        it('should stop polling when the file disappears', async () => {
            const uri = vscode.Uri.file(get.path(fixture, 'main.bin'))
            const uriString = uri.toString(true)
            const existsStub = sinon.stub(lw.file, 'exists').resolves(false)
            const interval = setInterval(() => {}, 10000)
            getPolling()[uriString] = {time: Date.now(), size: 1}

            await callHandlePolling(uri, Date.now(), interval)
            existsStub.restore()

            assert.strictEqual(getPolling()[uriString], undefined)
        })

        it('should stop a stale interval when polling state is gone', async () => {
            const uri = vscode.Uri.file(get.path(fixture, 'main.bin'))
            const clearIntervalSpy = sinon.spy(global, 'clearInterval')
            const interval = setInterval(() => {}, 10000)

            await callHandlePolling(uri, Date.now(), interval)
            clearIntervalSpy.restore()

            assert.ok(clearIntervalSpy.calledWith(interval))
        })

        it('should update polling state when the file size changes', async () => {
            const uri = vscode.Uri.file(get.path(fixture, 'main.bin'))
            const uriString = uri.toString(true)
            const statStub = sinon.stub(lw.external, 'stat').resolves({type: 0, ctime: 0, mtime: 0, size: 2})
            const interval = setInterval(() => {}, 10000)
            getPolling()[uriString] = {time: 0, size: 1}

            await callHandlePolling(uri, Date.now(), interval)
            clearInterval(interval)
            statStub.restore()

            assert.strictEqual(getPolling()[uriString].size, 2)
            assert.ok(getPolling()[uriString].time > 0)
            delete getPolling()[uriString]
        })
    })
})
