import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { view, viewInWebviewPanel } from '../../src/preview/viewer'
import * as manager from '../../src/preview/viewer/pdfviewermanager'
import { assert, get, mock, set, sleep } from './utils'
import type { ClientRequest } from '../../types/latex-workshop-protocol-types'

describe.only(path.basename(__filename).split('.')[0] + ':', () => {
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
                    (JSON.parse((handlerSpy.lastCall.args?.[1] as Uint8Array).toString()) as ClientRequest).type === type
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

    describe('lw.viewer->viewer.viewInCustomEditor', () => {
        let execSpy: sinon.SinonSpy

        before(() => {
            execSpy = sinon.spy(vscode.commands, 'executeCommand')
        })

        beforeEach(() => {
            set.config('viewer.pdf.viewer', 'tab')
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
            set.config('viewer.pdf.viewer', 'legacy')
            const promise = waitMessage('loaded')
            await view(pdfPath, 'tab')
            await promise

            assert.hasLog(`Open PDF tab for ${pdfUri.toString(true)}`)
        })
    })
})
