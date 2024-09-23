import * as vscode from 'vscode'
import * as path from 'path'
import * as ws from 'ws'
import * as sinon from 'sinon'
import fetch from 'node-fetch'
import { lw } from '../../src/lw'
import { assert, get, mock, set, sleep } from './utils'
import type { ClientRequest, PdfViewerParams } from '../../types/latex-workshop-protocol-types'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]
    let handlerStub: sinon.SinonStub
    let websocket: ws.WebSocket

    before(async () => {
        mock.init(lw, 'file', 'root', 'server')
        handlerStub = lw.viewer.handler as sinon.SinonStub
        await connectWs()
    })

    async function connectWs() {
        const serverPath = `ws://127.0.0.1:${lw.server.getPort()}`
        websocket = new ws.WebSocket(serverPath)

        await new Promise((resolve) => {
            websocket.on('open', resolve)
        })
    }

    async function waitMessage(msg: ClientRequest, timeout = 1000) {
        const msgString = JSON.stringify(msg)
        let elapsed = 0
        while(true) {
            if (handlerStub.called && (handlerStub.lastCall.args?.[1] as Uint8Array).toString() === msgString) {
                break
            }
            await sleep(10)
            elapsed += 10
            if (elapsed >= timeout) {
                assert.fail(`Timed out waiting for message ${msgString}`)
            }
        }
    }

    describe('lw.viewer->server.WsServer', () => {
        it('should handle websocket messages', async () => {
            handlerStub.resetHistory()
            websocket.send(JSON.stringify({ type: 'ping' }))
            await waitMessage({ type: 'ping' })
        })
    })

    describe('lw.viewer->server.initialize', () => {
        async function waitInitialize(hostname?: string, newPort?: number, timeout = 1000) {
            const originalPort = lw.server.getPort()
            if (newPort === undefined || newPort === originalPort) {
                newPort = (newPort ?? originalPort) + 1
            }
            set.config('viewer.pdf.internal.port', newPort)
            lw.server.initialize(hostname)

            let elapsed = 0
            while(true) {
                try {
                    const port = lw.server.getPort()
                    if (port !== undefined && port !== originalPort) {
                        break
                    }
                } catch {}
                await sleep(10)
                elapsed += 10
                if (elapsed >= timeout) {
                    assert.fail('Timed out waiting for server initialization.')
                }
            }
        }

        it('should create a server at port defined by `viewer.pdf.internal.port` ', async () => {
            const newPort = 34567 !== lw.server.getPort() ? 34567 : 45678
            await waitInitialize(undefined, newPort)

            assert.strictEqual(lw.server.getPort(), newPort)
        })

        it('should warn in log that a hostname is set', async () => {
            await waitInitialize('::1')

            assert.hasLog('BE AWARE: YOU ARE PUBLIC TO ::1 !')
        })

        after(async () => {
            await waitInitialize()
            await connectWs()
        })
    })

    describe('lw.viewer->server.handler', () => {
        it('should be set up to the http server', async () => {
            const url = await lw.server.getUrl()
            const res = await fetch(url.url + '/non-existent-file.html')
            assert.ok(res.status === 404 || res.status === 500)
        })

        it('should retrieve and return PDF content', async () => {
            const stub = lw.viewer.isViewing as sinon.SinonStub
            stub.returns(true)
            const url = await lw.server.getUrl(vscode.Uri.file(get.path(fixture, 'main.pdf')))
            const res = await fetch(url.url.replaceAll('viewer.html?file=', ''))
            stub.resetBehavior()

            assert.strictEqual(res.headers.get('Content-Type'), 'application/pdf', JSON.stringify(res))
        })

        it('should 404 if the retrieved PDF is not curently viewed', async () => {
            const stub = lw.viewer.isViewing as sinon.SinonStub
            stub.returns(false)
            const url = await lw.server.getUrl(vscode.Uri.file(get.path(fixture, 'main.pdf')))
            const res = await fetch(url.url.replaceAll('viewer.html?file=', ''))
            stub.resetBehavior()

            assert.strictEqual(res.status, 404, JSON.stringify(res))
        })

        it('should 404 if the retrieved PDF cannot be read', async () => {
            const stub = lw.viewer.isViewing as sinon.SinonStub
            stub.returns(true)
            const url = await lw.server.getUrl(vscode.Uri.file(get.path(fixture, 'non-existent.pdf')))
            const res = await fetch(url.url.replaceAll('viewer.html?file=', ''))
            stub.resetBehavior()

            assert.strictEqual(res.status, 404, JSON.stringify(res))
        })

        it('should return the default config on /config.json', async () => {
            const stub = lw.viewer.getParams as sinon.SinonStub
            stub.restore()
            const viewerConfig = lw.viewer.getParams()

            const url = await lw.server.getUrl()
            const res = await fetch(url.url + '/config.json')
            const config = await res.json() as PdfViewerParams
            sinon.stub(lw.viewer, 'getParams')

            assert.deepStrictEqual(config, viewerConfig)
        })

        it('should get pdf.js files under /build', async () => {
            const url = await lw.server.getUrl()
            const res = await fetch(url.url + '/build/pdf.min.mjs')

            assert.strictEqual(res.status, 200)
        })

        it('should get pdf.js files under /cmaps', async () => {
            const url = await lw.server.getUrl()
            const res = await fetch(url.url + '/cmaps/Adobe-CNS1-0.bcmap')

            assert.strictEqual(res.status, 200)
        })

        it('should get pdf.js files under /standard_fonts', async () => {
            const url = await lw.server.getUrl()
            const res = await fetch(url.url + '/standard_fonts/LiberationSans-Regular.ttf')

            assert.strictEqual(res.status, 200)
        })

        it('should get viewer files', async () => {
            const url = await lw.server.getUrl()
            let res = await fetch(url.url + '/viewer/latexworkshop.css')
            assert.strictEqual(res.status, 200)

            res = await fetch(url.url + '/latexworkshop.css')
            assert.strictEqual(res.status, 200)
        })

        it('should prevent directory traversal attack', async () => {
            const url = await lw.server.getUrl()
            let res = await fetch(url.url + '/build/../../sinon/package.json')
            assert.strictEqual(res.status, 404)

            res = await fetch(url.url + '/build/%2e%2e/%2e%2e/sinon/package.json')
            assert.strictEqual(res.status, 404)
        })
    })
})
