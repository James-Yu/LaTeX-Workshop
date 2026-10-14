import * as vscode from 'vscode'
import * as path from 'path'
import { lw } from '../../../src/lw'
import { assert, get, set } from '../utils'
import { ViewerDevtools, waitForViewer } from '../utils/devtools'

describe('pdf-links:', function () {
    this.timeout(30000)
    this.retries(0)
    const fixture = get.fixture(__filename)
    const sourceUri = vscode.Uri.file(get.path(fixture, 'source.pdf'))
    let browser: ViewerDevtools

    before(async () => {
        set.config('view.pdf.viewer', 'tab')
        browser = await ViewerDevtools.connect()
    })

    after(async () => {
        browser?.close()
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
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
})
