import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import * as ws from 'ws'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { locate, view, viewInWebviewPanel } from '../../src/preview/viewer'
import * as manager from '../../src/preview/viewer/pdfviewermanager'
import { assert, get, mock, set, sleep } from './utils'
import type { ClientRequest } from '../../types/latex-workshop-protocol-types'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]
    const pdfPath = get.path(fixture, 'main.pdf')
    const pdfUri = vscode.Uri.file(pdfPath)
    let handlerSpy: sinon.SinonSpy

    before(() => {
        mock.init(lw, 'file', 'root', 'server', 'viewer')
        handlerSpy = sinon.spy(lw.viewer, 'handler')
    })

    afterEach(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
    })

    after(() => {
        sinon.restore()
    })

    function waitMessage(type: ClientRequest['type'], timeout = 1000) {
        return (async () => {
            handlerSpy.resetHistory()
            let elapsed = 0
            while (true) {
                if (
                    handlerSpy.called &&
                    (JSON.parse((handlerSpy.lastCall?.args?.[1] as Uint8Array).toString()) as ClientRequest).type === type
                ) {
                    break
                }
                await sleep(10)
                elapsed += 10
                if (elapsed >= timeout) {
                    assert.fail(`Timed out waiting for message "${type}"`)
                }
            }
        })()
    }

    let wsMsg = ''
    async function waitMsg(target: string, timeout = 1000) {
        return (async () => {
            wsMsg = ''
            let elapsed = 0
            while (true) {
                await sleep(10)
                if (wsMsg === target) {
                    await sleep(100)
                    if (wsMsg === target) {
                        break
                    } else {
                        assert.fail(`Message overflown: ${wsMsg}`)
                    }
                }
                elapsed += 10
                if (elapsed >= timeout) {
                    assert.fail(`Timed out waiting for message "${target}": ${wsMsg}`)
                }
            }
        })()
    }

    describe('lw.viewer->viewer.viewInCustomEditor', () => {
        let execSpy: sinon.SinonSpy

        before(() => {
            execSpy = sinon.spy(vscode.commands, 'executeCommand')
        })

        beforeEach(() => {
            set.config('view.pdf.viewer', 'tab')
            execSpy.resetHistory()
        })

        after(() => {
            execSpy.restore()
        })

        it('should create a custom editor', async () => {
            const promise = waitMessage('loaded')
            await view(pdfPath)
            await promise

            assert.hasLog(`Open PDF tab for ${pdfUri.toString(true)}`)
        })

        it('should register the created panel in the viewer manager', async () => {
            const promise = waitMessage('loaded')
            await view(pdfPath)
            await promise

            assert.strictEqual(manager.getPanels(pdfUri)?.size, 1)
            assert.strictEqual(manager.getClients(pdfUri)?.size, 1)
        })

        it('should create the custom editor at the left group if focused on right', async () => {
            set.config('view.pdf.tab.editorGroup', 'left')
            mock.activeTextEditor('main.tex', '', { viewColumn: vscode.ViewColumn.Two })

            await view(pdfPath)

            assert.strictEqual(execSpy.callCount, 2)
            assert.strictEqual(execSpy.firstCall.args[0], 'vscode.openWith')
            assert.strictEqual((execSpy.firstCall.args[3] as vscode.TextDocumentShowOptions).viewColumn, 1)
            assert.strictEqual(execSpy.secondCall.args[0], 'workbench.action.focusRightGroup')
        })

        it('should create the custom editor and move to the left group if focused on left', async () => {
            set.config('view.pdf.tab.editorGroup', 'left')
            mock.activeTextEditor('main.tex', '', { viewColumn: vscode.ViewColumn.One })

            await view(pdfPath)

            assert.strictEqual(execSpy.callCount, 3)
            assert.strictEqual(execSpy.firstCall.args[0], 'vscode.openWith')
            assert.strictEqual((execSpy.firstCall.args[3] as vscode.TextDocumentShowOptions).viewColumn, -1)
            assert.strictEqual(execSpy.secondCall.args[0], 'workbench.action.moveEditorToLeftGroup')
            assert.strictEqual(execSpy.thirdCall.args[0], 'workbench.action.focusRightGroup')
        })

        it('should create the custom editor to the right', async () => {
            set.config('view.pdf.tab.editorGroup', 'right')
            mock.activeTextEditor('main.tex', '', { viewColumn: vscode.ViewColumn.One })

            await view(pdfPath)

            assert.strictEqual(execSpy.callCount, 2)
            assert.strictEqual(execSpy.firstCall.args[0], 'vscode.openWith')
            assert.strictEqual((execSpy.firstCall.args[3] as vscode.TextDocumentShowOptions).viewColumn, 2)
            assert.strictEqual(execSpy.secondCall.args[0], 'workbench.action.focusLeftGroup')
        })

        it('should create the custom editor and move to above or below', async () => {
            set.config('view.pdf.tab.editorGroup', 'above')
            mock.activeTextEditor('main.tex', '', { viewColumn: vscode.ViewColumn.One })

            await view(pdfPath)

            assert.strictEqual(execSpy.callCount, 3)
            assert.strictEqual(execSpy.firstCall.args[0], 'vscode.openWith')
            assert.strictEqual(execSpy.secondCall.args[0], 'workbench.action.moveEditorToAboveGroup')
            assert.strictEqual(execSpy.thirdCall.args[0], 'workbench.action.focusBelowGroup')

            execSpy.resetHistory()
            set.config('view.pdf.tab.editorGroup', 'below')
            await view(pdfPath)
            assert.strictEqual(execSpy.callCount, 3)
            assert.strictEqual(execSpy.firstCall.args[0], 'vscode.openWith')
            assert.strictEqual(execSpy.secondCall.args[0], 'workbench.action.moveEditorToBelowGroup')
            assert.strictEqual(execSpy.thirdCall.args[0], 'workbench.action.focusAboveGroup')
        })
    })

    describe('lw.viewer->viewer.viewInBrowser', () => {
        let openStub: sinon.SinonStub

        before(() => {
            openStub = sinon.stub(vscode.env, 'openExternal')
        })

        beforeEach(() => {
            set.config('view.pdf.viewer', 'browser')
            openStub.reset()
        })

        after(() => {
            openStub.restore()
        })

        it('should open the viewer link with vscode.env.openExternal', async () => {
            await view(pdfPath)

            assert.strictEqual(openStub.callCount, 1)
        })

        it('should register the created client sets in the viewer manager', async () => {
            await view(pdfPath)

            assert.notStrictEqual(manager.getPanels(pdfUri), undefined)
            assert.notStrictEqual(manager.getClients(pdfUri), undefined)
        })

        it('should watch the opened pdf', async () => {
            const stub = lw.watcher.pdf['add'] as sinon.SinonStub
            stub.resetHistory()
            await view(pdfPath)

            assert.strictEqual(stub.callCount, 1)
        })

        it('should prompt the viewer link for user to open if cannot directly open', async () => {
            openStub.rejects(new Error('Failed to open'))
            const stub = sinon.stub(vscode.window, 'showInputBox').resolves()

            await view(pdfPath)
            stub.restore()

            assert.strictEqual(stub.callCount, 1)
            assert.strictEqual((stub.firstCall?.args?.[0] as vscode.InputBoxOptions).value, (await lw.server.getUrl(pdfUri)).url)
        })
    })

    describe('lw.viewer->viewer.viewInWebviewPanel', () => {
        let execSpy: sinon.SinonSpy

        before(() => {
            execSpy = sinon.spy(vscode.commands, 'executeCommand')
        })

        beforeEach(() => {
            execSpy.resetHistory()
        })

        after(() => {
            execSpy.restore()
        })

        it('should create a webview panel', async () => {
            const promise = waitMessage('loaded')
            await viewInWebviewPanel(pdfUri, 'current', true)
            await promise

            assert.hasLog(`Open PDF tab for ${pdfUri.toString(true)}`)
        })

        it('should register the created panel in the viewer manager', async () => {
            const promise = waitMessage('loaded')
            await viewInWebviewPanel(pdfUri, 'current', true)
            await promise

            assert.strictEqual(manager.getPanels(pdfUri)?.size, 1)
            assert.strictEqual(manager.getClients(pdfUri)?.size, 1)
        })

        it('should move the webview panel to the specified editor group', async () => {
            const activeEditorStub = mock.activeTextEditor('main.tex', '')

            execSpy.resetHistory()
            await viewInWebviewPanel(pdfUri, 'left', true)
            assert.strictEqual(execSpy.callCount, 2)
            assert.strictEqual(execSpy.firstCall.args[0], 'workbench.action.moveEditorToLeftGroup')
            assert.strictEqual(execSpy.secondCall.args[0], 'workbench.action.focusRightGroup')

            execSpy.resetHistory()
            await viewInWebviewPanel(pdfUri, 'right', true)
            assert.strictEqual(execSpy.callCount, 2)
            assert.strictEqual(execSpy.firstCall.args[0], 'workbench.action.moveEditorToRightGroup')
            assert.strictEqual(execSpy.secondCall.args[0], 'workbench.action.focusLeftGroup')

            execSpy.resetHistory()
            await viewInWebviewPanel(pdfUri, 'above', true)
            assert.strictEqual(execSpy.callCount, 2)
            assert.strictEqual(execSpy.firstCall.args[0], 'workbench.action.moveEditorToAboveGroup')
            assert.strictEqual(execSpy.secondCall.args[0], 'workbench.action.focusBelowGroup')

            execSpy.resetHistory()
            await viewInWebviewPanel(pdfUri, 'below', true)
            assert.strictEqual(execSpy.callCount, 2)
            assert.strictEqual(execSpy.firstCall.args[0], 'workbench.action.moveEditorToBelowGroup')
            assert.strictEqual(execSpy.secondCall.args[0], 'workbench.action.focusAboveGroup')

            activeEditorStub.restore()
        })

        it('should not move the webview panel if there is no active editor', async () => {
            const activeEditorStub = sinon.stub(vscode.window, 'activeTextEditor').value(undefined)
            await viewInWebviewPanel(pdfUri, 'left', true)
            activeEditorStub.restore()

            assert.strictEqual(execSpy.callCount, 0)
        })

        it('should only move the webview panel but not focus back if `preserveFocus` is `false`', async () => {
            const activeEditorStub = mock.activeTextEditor('main.tex', '')

            await viewInWebviewPanel(pdfUri, 'left', false)

            activeEditorStub.restore()
            assert.strictEqual(execSpy.callCount, 1)
            assert.strictEqual(execSpy.firstCall.args[0], 'workbench.action.moveEditorToLeftGroup')
        })
    })

    describe('lw.viewer->viewer.viewInTab', () => {
        it('should create a webview panel', async () => {
            set.config('view.pdf.viewer', 'legacy')
            const promise = waitMessage('loaded')
            await view(pdfPath, 'tab')
            await promise

            assert.hasLog(`Open PDF tab for ${pdfUri.toString(true)}`)
        })
    })

    describe('lw.viewer->viewer.handler', () => {
        let websocket: ws.WebSocket

        before(async () => {
            const serverPath = `ws://127.0.0.1:${lw.server.getPort()}`
            websocket = new ws.WebSocket(serverPath)

            await new Promise((resolve) => {
                websocket.on('open', resolve)
            })
        })

        after(() => {
            manager.getPanels(pdfUri)?.clear()
            manager.getClients(pdfUri)?.clear()
        })

        it('should handle `open` message and create a Client', async () => {
            manager.create(pdfUri)
            manager.getPanels(pdfUri)?.clear()
            manager.getClients(pdfUri)?.clear()

            const promise = waitMessage('open')
            websocket.send(JSON.stringify({ type: 'open', pdfFileUri: pdfUri.toString(true) }))
            await promise

            assert.strictEqual(manager.getClients(pdfUri)?.size, 1)
        })

        it('should handle `loaded` message and perform SyncTeX if enabled', async () => {
            set.config('synctex.afterBuild.enabled', true)
            const stub = lw.locate.synctex.toPDF as sinon.SinonStub
            stub.reset()

            const promise = waitMessage('loaded')
            websocket.send(JSON.stringify({ type: 'loaded', pdfFileUri: pdfUri.toString(true) }))
            await promise

            assert.strictEqual(stub.callCount, 1)
        })

        it('should handle `loaded` message but skip SyncTeX if disabled', async () => {
            set.config('synctex.afterBuild.enabled', false)
            const stub = lw.locate.synctex.toPDF as sinon.SinonStub
            stub.reset()

            const promise = waitMessage('loaded')
            websocket.send(JSON.stringify({ type: 'loaded', pdfFileUri: pdfUri.toString(true) }))
            await promise

            assert.strictEqual(stub.callCount, 0)
        })

        it('should handle `reverse_synctex` message and perform reverse SyncTeX', async () => {
            const stub = lw.locate.synctex.toTeX as sinon.SinonStub
            stub.reset()

            const promise = waitMessage('reverse_synctex')
            websocket.send(JSON.stringify({ type: 'reverse_synctex', pdfFileUri: pdfUri.toString(true) }))
            await promise

            assert.strictEqual(stub.callCount, 1)
        })

        it('should handle `external_link` message and opens http/https link', async () => {
            let stub = sinon.stub(vscode.env, 'openExternal')
            let promise = waitMessage('external_link')
            websocket.send(JSON.stringify({ type: 'external_link', url: 'http://google.com' }))
            await promise
            stub.restore()
            assert.strictEqual(stub.callCount, 1)

            stub = sinon.stub(vscode.env, 'openExternal')
            promise = waitMessage('external_link')
            websocket.send(JSON.stringify({ type: 'external_link', url: 'https://google.com' }))
            await promise
            stub.restore()
            assert.strictEqual(stub.callCount, 1)
        })

        it('should handle `external_link` message and prompts non-http/https link', async () => {
            const stub = sinon.stub(vscode.window, 'showInputBox')
            const openStub = sinon.stub(vscode.env, 'openExternal')
            const promise = waitMessage('external_link')
            websocket.send(JSON.stringify({ type: 'external_link', url: 'file://some/private/file.txt' }))
            await promise
            stub.restore()
            openStub.restore()
            assert.strictEqual(stub.callCount, 1)
            assert.strictEqual(openStub.callCount, 0)
        })

        it('should accept `ping` message and do nothing', async () => {
            const promise = waitMessage('ping')
            websocket.send(JSON.stringify({ type: 'ping' }))
            await promise
        })

        it('should accept `add_log` message and add the message to LW log', async () => {
            const promise = waitMessage('add_log')
            const message = `This is a test message. ${Math.random()}`
            websocket.send(JSON.stringify({ type: 'add_log', message }))
            await promise

            assert.hasLog(message)
        })

        it('should accept `copy` message and copy the content to clipboard', async () => {
            const writeTextStub = sinon.stub().resolves()
            const stub = sinon.stub(vscode.env, 'clipboard').value({ writeText: writeTextStub })

            const promise = waitMessage('copy')
            websocket.send(JSON.stringify({ type: 'copy', isMetaKey: os.platform() === 'darwin', content: '' }))
            await promise

            stub.restore()

            assert.strictEqual(writeTextStub.callCount, 1)
        })

        it('should accept `copy` message but does not copy the content if the wrong ctrl/meta key is pressed', async () => {
            const writeTextStub = sinon.stub().resolves()
            const stub = sinon.stub(vscode.env, 'clipboard').value({ writeText: writeTextStub })

            const promise = waitMessage('copy')
            websocket.send(JSON.stringify({ type: 'copy', isMetaKey: os.platform() !== 'darwin', content: '' }))
            await promise

            stub.restore()

            assert.strictEqual(writeTextStub.callCount, 0)
        })
    })

    describe('lw.viewer->viewer.refresh', () => {
        const altUri = pdfUri.with({ path: get.path(fixture, 'alt.pdf') })

        before(async () => {
            manager.create(pdfUri)
            manager.getPanels(pdfUri)?.clear()
            manager.getClients(pdfUri)?.clear()

            manager.create(altUri)
            manager.getPanels(altUri)?.clear()
            manager.getClients(altUri)?.clear()

            const serverPath = `ws://127.0.0.1:${lw.server.getPort()}`
            const websocket = new ws.WebSocket(serverPath)
            websocket.on('message', (msg) => { wsMsg += msg.toString() })

            await new Promise((resolve) => {
                websocket.on('open', resolve)
            })

            let promise = waitMessage('open')
            websocket.send(JSON.stringify({ type: 'open', pdfFileUri: pdfUri.toString(true) }))
            await promise

            promise = waitMessage('open')
            websocket.send(JSON.stringify({ type: 'open', pdfFileUri: pdfUri.toString(true) }))
            await promise

            promise = waitMessage('open')
            websocket.send(JSON.stringify({ type: 'open', pdfFileUri: altUri.toString(true) }))
            await promise
        })

        after(() => {
            manager.getPanels(pdfUri)?.clear()
            manager.getClients(pdfUri)?.clear()
            manager.getPanels(altUri)?.clear()
            manager.getClients(altUri)?.clear()
        })

        it('should refresh all viewers if not provided with an uri', async () => {
            const promise = waitMsg(JSON.stringify({ type: 'refresh' }).repeat(3))
            lw.viewer.refresh()
            await promise
        })

        it('should refresh selected viewers if provided with an uri', async () => {
            const promise = waitMsg(JSON.stringify({ type: 'refresh' }).repeat(2))
            lw.viewer.refresh(pdfUri)
            await promise
        })

        it('should do nothing if provided uri is not viewed', async () => {
            const promise = waitMsg(JSON.stringify({ type: 'refresh' }).repeat(0))
            lw.viewer.refresh(pdfUri.with({ path: 'nonexistent.pdf' }))
            await promise
        })
    })

    describe('lw.viewer->viewer.reload', () => {
        before(async () => {
            manager.create(pdfUri)
            manager.getPanels(pdfUri)?.clear()
            manager.getClients(pdfUri)?.clear()

            const serverPath = `ws://127.0.0.1:${lw.server.getPort()}`
            const websocket = new ws.WebSocket(serverPath)
            websocket.on('message', (msg) => { wsMsg += msg.toString() })

            await new Promise((resolve) => {
                websocket.on('open', resolve)
            })

            let promise = waitMessage('open')
            websocket.send(JSON.stringify({ type: 'open', pdfFileUri: pdfUri.toString(true) }))
            await promise

            promise = waitMessage('open')
            websocket.send(JSON.stringify({ type: 'open', pdfFileUri: pdfUri.toString(true) }))
            await promise
        })

        after(() => {
            manager.getPanels(pdfUri)?.clear()
            manager.getClients(pdfUri)?.clear()
        })

        it('should reload all viewers if config `view.pdf.invert` is changed', async () => {
            const promise = waitMsg(JSON.stringify({ type: 'reload' }).repeat(2))
            await set.codeConfig('view.pdf.invert', 1)
            await promise
        })

        it('should reload all viewers if config `view.pdf.invertMode` and children are changed', async () => {
            const promise = waitMsg(JSON.stringify({ type: 'reload' }).repeat(2))
            await set.codeConfig('view.pdf.invertMode.enabled', 'auto')
            await promise
        })

        it('should reload all viewers if config `view.pdf.color` and children changed', async () => {
            const promise = waitMsg(JSON.stringify({ type: 'reload' }).repeat(2))
            await set.codeConfig('view.pdf.color.light.pageColorsForeground', 'black')
            await promise
        })

        it('should reload all viewers if config `view.pdf.internal` is changed', async () => {
            const promise = waitMsg(JSON.stringify({ type: 'reload' }).repeat(2))
            await set.codeConfig('view.pdf.internal.port', 12345)
            await promise
        })
    })

    describe('lw.viewer->viewer.locate', () => {
        before(async () => {
            manager.create(pdfUri)
            manager.getPanels(pdfUri)?.clear()
            manager.getClients(pdfUri)?.clear()

            const serverPath = `ws://127.0.0.1:${lw.server.getPort()}`
            const websocket = new ws.WebSocket(serverPath)
            websocket.on('message', (msg) => { wsMsg += msg.toString() })

            await new Promise((resolve) => {
                websocket.on('open', resolve)
            })

            let promise = waitMessage('open')
            websocket.send(JSON.stringify({ type: 'open', pdfFileUri: pdfUri.toString(true) }))
            await promise

            promise = waitMessage('open')
            websocket.send(JSON.stringify({ type: 'open', pdfFileUri: pdfUri.toString(true) }))
            await promise
        })

        after(() => {
            manager.getPanels(pdfUri)?.clear()
            manager.getClients(pdfUri)?.clear()
        })

        it('should perform SyncTeX', async () => {
            const promise = waitMsg(JSON.stringify({ type: 'synctex', data: [] }).repeat(2))
            await locate(pdfPath, [])
            await promise
        })

        it('should try opening the PDF if not already viewing', async () => {
            const altPath = pdfPath.replaceAll('main.pdf', 'alt.pdf')
            await locate(altPath, [])

            assert.hasLog(`PDF is not opened: ${altPath} , try opening.`)
            assert.hasLog(`PDF cannot be opened: ${altPath} .`)
        })
    })
})
