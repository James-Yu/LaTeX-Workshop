import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../../src/lw'
import * as manager from '../../../src/preview/viewer/pdfviewermanager'
import { assert, get, mock, set } from '../utils'
import { ViewerDevtools, waitForViewer } from '../utils/devtools'

describe('pdf-links:', function () {
    this.timeout(30000)
    this.retries(0)
    const fixture = get.fixture(__filename)
    const sourceUri = vscode.Uri.file(get.path(fixture, 'source.pdf'))
    const targetUri = vscode.Uri.file(get.path(fixture, 'target.pdf'))
    let browser: ViewerDevtools
    let warning: sinon.SinonStub

    before(async () => {
        mock.config()
        browser = await ViewerDevtools.connect()
    })

    beforeEach(() => {
        set.config('view.pdf.viewer', 'tab')
        set.config('synctex.afterBuild.enabled', false)
        warning = sinon.stub(vscode.window, 'showWarningMessage').resolves()
    })

    afterEach(async () => {
        warning.restore()
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
    })

    after(() => {
        browser?.close()
        sinon.restore()
    })

    it('renders a relative GoToR link alongside HTTPS and internal controls', async () => {
        await lw.viewer.view(sourceUri, 'tab')
        const evaluate = await browser.viewer(path.basename(sourceUri.fsPath))
        await waitForViewer(() => evaluate<boolean>('document.querySelectorAll(".annotationLayer section").length >= 3'))
        const result = await evaluate<{ unsafeUrl?: string, dest?: unknown, clickable: boolean }[]>(`(async () => {
            const page = await PDFViewerApplication.pdfDocument.getPage(1);
            const annotations = await page.getAnnotations();
            return annotations.map(a => ({
                unsafeUrl: a.unsafeUrl,
                dest: a.dest,
                clickable: !!document.querySelector('a[data-element-id="' + a.id + '"]')
            }));
        })()`)
        assert.strictEqual(result[0].unsafeUrl, 'target.pdf#section.1')
        assert.strictEqual(result[0].clickable, true, 'The relative PDF link must be clickable')
        assert.strictEqual(result[1].clickable, true)
        assert.strictEqual(result[2].clickable, true)
    })

    it('follows a named destination in the real embedded viewer and reuses the target tab', async () => {
        await lw.viewer.view(sourceUri, 'tab')
        const source = await browser.viewer('source.pdf')
        await waitForViewer(() => source<boolean>('!!document.querySelector("a[data-local-pdf-link]")'))
        await source('document.querySelector("a[data-local-pdf-link]").click()')
        const target = await browser.viewer('target.pdf')
        await waitForViewer(() => target<boolean>('PDFViewerApplication.pdfViewer.currentPageNumber === 2'))
        assert.strictEqual(manager.getPanels(sourceUri)?.size, 1, 'The source tab stays open')
        assert.strictEqual(manager.getPanels(targetUri)?.size, 1)
        await target('PDFViewerApplication.pdfViewer.currentPageNumber = 1')
        await source('document.querySelector("a[data-local-pdf-link]").click()')
        await waitForViewer(() => target<boolean>('PDFViewerApplication.pdfViewer.currentPageNumber === 2'))
        assert.strictEqual(manager.getPanels(targetUri)?.size, 1, 'The target tab is reused')
        assert.strictEqual(warning.callCount, 0, 'Trusted workspace links do not prompt')
    })

    it('opens explicit destinations and both logs and displays missing-destination errors', async () => {
        await lw.viewer.openPdfLink(sourceUri, 'target.pdf#[1,{"name":"Fit"}]')
        const target = await browser.viewer('target.pdf')
        await waitForViewer(() => target<boolean>('PDFViewerApplication.pdfViewer.currentPageNumber === 2'))
        await lw.viewer.openPdfLink(sourceUri, 'target.pdf#missing-destination')
        await waitForViewer(() => Promise.resolve(warning.called))
        assert.match(warning.firstCall.args[0] as string, /destination not found/)
        assert.hasLog(`[Viewer][Panel] Unable to navigate ${targetUri.toString(true)}: PDF destination not found: missing-destination`)
        assert.strictEqual(await target('PDFViewerApplication.pdfViewer.currentPageNumber'), 2)
    })

    it('keeps local links working after rotation and zoom without duplicate anchors', async () => {
        await lw.viewer.view(sourceUri, 'tab')
        const source = await browser.viewer('source.pdf')
        await waitForViewer(() => source<boolean>('!!document.querySelector("a[data-local-pdf-link]")'))
        await source('PDFViewerApplication.pdfViewer.pagesRotation = 90; PDFViewerApplication.pdfViewer.currentScaleValue = "page-fit"')
        await waitForViewer(() => source<boolean>('!!document.querySelector("a[data-local-pdf-link]")'))
        assert.strictEqual(await source('document.querySelectorAll("a[data-local-pdf-link]").length'), 1)
        await source('document.querySelector("a[data-local-pdf-link]").click()')
        const target = await browser.viewer('target.pdf')
        await waitForViewer(() => target<boolean>('PDFViewerApplication.pdfViewer.currentPageNumber === 2'))
    })

    it('retains same-document navigation and HTTPS handling', async () => {
        const external = sinon.stub(vscode.env, 'openExternal').resolves(true)
        try {
            await lw.viewer.view(sourceUri, 'tab')
            const source = await browser.viewer('source.pdf')
            await waitForViewer(() => source<boolean>('document.querySelectorAll(".annotationLayer a").length >= 3'))
            await source('document.querySelector(\'a[href="https://example.com/"]\').click()')
            await waitForViewer(() => Promise.resolve(external.called))
            assert.strictEqual((external.firstCall.args[0] as vscode.Uri).toString(), 'https://example.com/')
            await source(`(async () => {
                const annotations = await (await PDFViewerApplication.pdfDocument.getPage(1)).getAnnotations();
                const link = annotations.find(a => a.dest === 'local-target');
                document.querySelector('a[data-element-id="' + link.id + '"]').click();
            })()`)
            await waitForViewer(() => source<boolean>('PDFViewerApplication.pdfViewer.currentPageNumber === 2'))
            assert.strictEqual(warning.callCount, 0)
        } finally {
            external.restore()
        }
    })

    it('navigates after refreshing the target and reloading the source panel', async () => {
        await lw.viewer.view(sourceUri, 'tab')
        await lw.viewer.openPdfLink(sourceUri, 'target.pdf#section.1')
        const target = await browser.viewer('target.pdf')
        await waitForViewer(() => target<boolean>('PDFViewerApplication.pdfViewer.currentPageNumber === 2'))
        await target('window.previousPdf = PDFViewerApplication.pdfDocument; PDFViewerApplication.pdfViewer.currentPageNumber = 1')
        lw.viewer.refresh(targetUri)
        await waitForViewer(() => target<boolean>('PDFViewerApplication.pdfDocument !== window.previousPdf && PDFViewerApplication.pdfViewer.pagesCount === 2'))
        const sourcePanel = [...manager.getPanels(sourceUri) ?? []][0]
        assert.ok(sourcePanel)
        await sourcePanel.reload('disconnected')
        const source = await browser.viewer('source.pdf')
        await waitForViewer(() => source<boolean>('!!document.querySelector("a[data-local-pdf-link]")'))
        await source('document.querySelector("a[data-local-pdf-link]").click()')
        await waitForViewer(() => target<boolean>('PDFViewerApplication.pdfViewer.currentPageNumber === 2'))
        assert.strictEqual(warning.callCount, 0)
    })
})
