import * as vscode from 'vscode'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import * as sinon from 'sinon'
import { resolveLocalPdfLink } from '../../../src/preview/viewer/localpdflink'
import { openPdfLink } from '../../../src/preview/viewer'
import * as manager from '../../../src/preview/viewer/pdfviewermanager'
import type { PdfViewerPanel } from '../../../src/preview/viewer/pdfviewerpanel'
import { assert } from '../utils'

describe('local-pdf-link:', () => {
    let directory: string
    let root: string
    let source: string
    let target: string
    let outside: string

    beforeEach(async () => {
        directory = await fs.mkdtemp(path.join(os.tmpdir(), 'lw-pdf-link-'))
        root = path.join(directory, 'workspace')
        await fs.mkdir(root)
        source = path.join(root, 'source.pdf')
        target = path.join(root, 'target.pdf')
        outside = path.join(directory, 'outside.pdf')
        await Promise.all([source, target, outside].map(file => fs.writeFile(file, '%PDF-1.7\n')))
    })

    afterEach(async () => {
        sinon.restore()
        await fs.rm(directory, { recursive: true, force: true })
    })

    it('resolves a named destination inside a trusted workspace', async () => {
        assert.deepStrictEqual(await resolveLocalPdfLink(source, 'target.pdf#section.1', [root]), {
            file: await fs.realpath(target), destination: 'section.1', trusted: true
        })
    })

    it('decodes a filename once and leaves the destination intact', async () => {
        const file = path.join(root, 'space # %.PDF')
        await fs.writeFile(file, '%PDF-1.7\n')
        const link = await resolveLocalPdfLink(source, 'space%20%23%20%25.PDF#name%20with%20spaces', [root])
        assert.strictEqual(link.file, await fs.realpath(file))
        assert.strictEqual(link.destination, 'name%20with%20spaces')
        assert.strictEqual(link.trusted, true)
    })

    it('supports sibling paths and multiple workspace roots', async () => {
        const other = path.join(directory, 'other')
        await fs.mkdir(other)
        await fs.copyFile(target, path.join(other, 'target.pdf'))
        const link = await resolveLocalPdfLink(source, '../other/target.pdf', [root, other])
        assert.strictEqual(link.trusted, true)
        assert.strictEqual(link.destination, '')
    })

    it('requires confirmation for traversal outside the workspace', async () => {
        assert.strictEqual((await resolveLocalPdfLink(source, '../outside.pdf', [root])).trusted, false)
        assert.strictEqual((await resolveLocalPdfLink(source, '..%2foutside.pdf', [root])).trusted, false)
        assert.strictEqual((await resolveLocalPdfLink(source, '..\\outside.pdf', [root])).trusted, false)
    })

    it('does not confuse a shared path prefix with containment', async () => {
        const sibling = path.join(directory, 'workspace-other')
        await fs.mkdir(sibling)
        await fs.copyFile(target, path.join(sibling, 'target.pdf'))
        assert.strictEqual((await resolveLocalPdfLink(source, '../workspace-other/target.pdf', [root])).trusted, false)
    })

    it('requires both the source and the target to be inside workspace roots', async () => {
        assert.strictEqual((await resolveLocalPdfLink(outside, 'workspace/target.pdf', [root])).trusted, false)
        assert.strictEqual((await resolveLocalPdfLink(source, 'target.pdf', [])).trusted, false)
        assert.strictEqual((await resolveLocalPdfLink(source, 'target.pdf', [path.join(root, 'missing')])).trusted, false)
    })

    it('checks canonical paths for target and source symlinks', async function () {
        if (process.platform === 'win32') {
            this.skip() // File symlinks require privileges not available on all CI workers.
        }
        const link = path.join(root, 'link.pdf')
        await fs.symlink(outside, link)
        assert.strictEqual((await resolveLocalPdfLink(source, 'link.pdf', [root])).trusted, false)
        assert.strictEqual((await resolveLocalPdfLink(link, 'target.pdf', [root])).trusted, false)
    })

    it('rejects missing, directory, non-PDF, absolute and protocol targets', async () => {
        await fs.mkdir(path.join(root, 'directory.pdf'))
        for (const href of [
            '', 'missing.pdf', 'directory.pdf', 'target.txt', '/tmp/target.pdf', '//host/share.pdf',
            '\\\\host\\share.pdf', 'C:\\target.pdf', 'file:target.pdf', 'https://example.com/target.pdf',
            'javascript:target.pdf', 'target.pdf?query', '%2ftarget.pdf', 'target%3a.pdf', '%zz.pdf', 'target\0.pdf'
        ]) {
            await assert.rejects(resolveLocalPdfLink(source, href, [root]), Error, href)
        }
    })

    describe('host policy', () => {
        let warning: sinon.SinonStub
        let navigate: sinon.SinonSpy
        let reveal: sinon.SinonSpy
        let panels: sinon.SinonStub
        let external: sinon.SinonStub
        let trust: sinon.SinonStub

        beforeEach(() => {
            trust = sinon.stub(vscode.workspace, 'isTrusted').value(true)
            sinon.stub(vscode.workspace, 'workspaceFolders').value([{ uri: vscode.Uri.file(root), name: 'workspace', index: 0 }])
            warning = sinon.stub(vscode.window, 'showWarningMessage').resolves()
            external = sinon.stub(vscode.env, 'openExternal')
            navigate = sinon.spy()
            reveal = sinon.spy()
            panels = sinon.stub(manager, 'getPanels').callsFake(uri => new Set([{
                pdfUri: uri, navigateTo: navigate, webviewPanel: { active: true, reveal }
            } as unknown as PdfViewerPanel]))
        })

        it('reuses an existing trusted target without prompting or launching externally', async () => {
            await openPdfLink(vscode.Uri.file(source), 'target.pdf#section.1')
            assert.strictEqual(warning.callCount, 0)
            assert.strictEqual(navigate.callCount, 1)
            assert.strictEqual(navigate.firstCall.args[0], 'section.1')
            assert.strictEqual(reveal.callCount, 1)
            assert.strictEqual(external.callCount, 0)
        })

        it('does not open an outside target after cancellation', async () => {
            await openPdfLink(vscode.Uri.file(source), '../outside.pdf#section.1')
            assert.strictEqual(warning.callCount, 1)
            assert.strictEqual(warning.firstCall.args[1].modal, true)
            assert.ok((warning.firstCall.args[1] as vscode.MessageOptions).detail?.includes(await fs.realpath(outside)))
            assert.strictEqual(panels.callCount, 0)
            assert.strictEqual(external.callCount, 0)
        })

        it('opens an outside target only after explicit confirmation', async () => {
            warning.resolves('Open PDF')
            await openPdfLink(vscode.Uri.file(source), '../outside.pdf#section.1')
            assert.strictEqual(warning.callCount, 1)
            assert.strictEqual(navigate.callCount, 1)
            assert.strictEqual(panels.firstCall.args[0].fsPath, await fs.realpath(outside))
            assert.strictEqual(external.callCount, 0)
        })

        it('rejects an untrusted workspace or non-local source', async () => {
            trust.value(false)
            await openPdfLink(vscode.Uri.file(source), 'target.pdf')
            trust.value(true)
            await openPdfLink(vscode.Uri.parse('https://example.com/source.pdf'), 'target.pdf')
            await openPdfLink(vscode.Uri.parse('file://host/source.pdf'), 'target.pdf')
            assert.strictEqual(warning.callCount, 3)
            assert.strictEqual(panels.callCount, 0)
        })

        it('rechecks a symlink after confirmation', async function () {
            if (process.platform === 'win32') {
                this.skip()
            }
            const link = path.join(root, 'link.pdf')
            await fs.symlink(outside, link)
            warning.callsFake(async () => {
                if (warning.callCount === 1) {
                    await fs.unlink(link)
                    await fs.symlink(target, link)
                    return 'Open PDF'
                }
                return undefined
            })
            await openPdfLink(vscode.Uri.file(source), 'link.pdf')
            assert.strictEqual(warning.callCount, 2)
            assert.match(warning.lastCall.args[0] as string, /changed/)
            assert.strictEqual(panels.callCount, 0)
        })
    })
})
