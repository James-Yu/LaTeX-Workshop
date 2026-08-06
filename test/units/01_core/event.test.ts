import * as path from 'path'
import * as sinon from 'sinon'
import { assert, log } from '../utils'
import { lw } from '../../../src/lw'
import type { PdfViewerState } from '../../../types/latex-workshop-protocol-types'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    afterEach(() => {
        lw.event.dispose()
        sinon.restore()
    })

    it('should deliver an event argument to subscribers', () => {
        const listener = sinon.spy()
        lw.event.on(lw.event.FileParsed, listener)

        lw.event.fire(lw.event.FileParsed, '/document.tex')

        sinon.assert.calledOnceWithExactly(listener, '/document.tex')
        assert.hasLog('FILE_PARSED: "/document.tex"')
    })

    it('should deliver events without arguments', () => {
        const listener = sinon.spy()
        lw.event.on(lw.event.BuildDone, listener)

        lw.event.fire(lw.event.BuildDone)

        sinon.assert.calledOnceWithExactly(listener, undefined)
        assert.hasLog('BUILD_DONE')
    })

    it('should stop delivering events after the subscription is disposed', () => {
        const listener = sinon.spy()
        const subscription = lw.event.on(lw.event.RootFileSearched, listener)

        subscription.dispose()
        lw.event.fire(lw.event.RootFileSearched)

        sinon.assert.notCalled(listener)
    })

    it('should remove every listener when disposed', () => {
        const firstListener = sinon.spy()
        const secondListener = sinon.spy()
        lw.event.on(lw.event.RootFileSearched, firstListener)
        lw.event.on(lw.event.RootFileSearched, secondListener)

        lw.event.dispose()
        lw.event.fire(lw.event.RootFileSearched)

        sinon.assert.notCalled(firstListener)
        sinon.assert.notCalled(secondListener)
    })

    it('should not log high-frequency document and viewer events', () => {
        const viewerState: PdfViewerState = { kind: 'not_stored' }
        log.start()
        lw.event.fire(lw.event.DocumentChanged)
        lw.event.fire(lw.event.ViewerStatusChanged, viewerState)
        log.stop()

        assert.notHasLog('DOCUMENT_CHANGED')
        assert.notHasLog('VIEWER_STATUS_CHANGED')
    })
})
