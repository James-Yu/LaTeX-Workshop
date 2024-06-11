import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { assert, get, has, mock, set } from './utils'
import { lw } from '../../src/lw'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]

    before(() => {
        mock.object(lw, 'file', 'watcher', 'cache', 'root')
    })

    after(() => {
        sinon.restore()
    })

    describe('on root file deletion', () => {
        beforeEach(async () => {
            await set.config('latex.watch.delay', 100)
        })

        afterEach(() => {
            lw.watcher.src.reset()
        })

        it('should remove root info and refind', async function (this: Mocha.Context) {
            this.slow(250)
            const texPath = get.path(fixture, 'another.tex')

            lw.root.file.path = texPath
            lw.watcher.src.add(texPath)
            assert.ok(!has.log('Current workspace folders: '))
            await lw.watcher.src._test.onDidDelete(vscode.Uri.file(texPath))
            assert.ok(has.log('Current workspace folders: '))
        })
    })

    describe('lw.root.getIndicator', () => {
        it('should return \\documentclass indicator on selecting `\\documentclass[]{}`', async () => {
            await set.config('latex.rootFile.indicator', '\\documentclass[]{}')
            const indicator = lw.root._test.getIndicator()

            assert.ok(indicator.exec('\\documentclass{article}\n'))
            assert.ok(!indicator.exec('\\begin{document}\n\\end{document}\n'))
        })

        it('should return \\begin{document} indicator on selecting `\\begin{document}`', async () => {
            await set.config('latex.rootFile.indicator', '\\begin{document}')
            const indicator = lw.root._test.getIndicator()

            assert.ok(!indicator.exec('\\documentclass{article}\n'))
            assert.ok(indicator.exec('\\begin{document}\n\\end{document}\n'))
        })

        it('should return \\documentclass indicator on other values', async () => {
            await set.config('latex.rootFile.indicator', 'invalid value')
            const indicator = lw.root._test.getIndicator()

            assert.ok(indicator.exec('\\documentclass{article}\n'))
            assert.ok(!indicator.exec('\\begin{document}\n\\end{document}\n'))
        })
    })

    describe('lw.root.getWorkspace', () => {
        it('should return undefined if no workspace is opened', () => {
            const texPath = get.path(fixture, 'main.tex')
            const stub = sinon.stub(vscode.workspace, 'workspaceFolders').value([])
            const workspace1 = lw.root._test.getWorkspace()
            const workspace2 = lw.root._test.getWorkspace(texPath)
            stub.restore()

            assert.strictEqual(workspace1, undefined)
            assert.strictEqual(workspace2, undefined)
        })

        it('should return the workspace of provided file', () => {
            const texPath = get.path(fixture, 'main.tex')
            const workspace = lw.root._test.getWorkspace(texPath)

            assert.strictEqual(
                workspace?.path,
                vscode.workspace.workspaceFile?.fsPath ?? vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? ''
            )
        })

        it('should return the first workspace if no file is provided or opened', () => {
            const workspace = lw.root._test.getWorkspace()

            assert.strictEqual(
                workspace?.path,
                vscode.workspace.workspaceFile?.fsPath ?? vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? ''
            )
        })

        it('should return the workspace of active editor if no file is provided', () => {
            const texPath = get.path(fixture, 'main.tex')
            const stub = mock.activeTextEditor(texPath, '')
            const workspace = lw.root._test.getWorkspace()
            stub.restore()

            assert.strictEqual(
                workspace?.path,
                vscode.workspace.workspaceFile?.fsPath ?? vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? ''
            )
        })
    })

    describe('lw.root.findFromMagic', () => {
        it('should return undefined if there is no active editor', async () => {
            const stub = sinon.stub(vscode.window, 'activeTextEditor').value(undefined)
            const root = await lw.root._test.findFromMagic()
            stub.restore()

            assert.strictEqual(root, undefined)
        })

        it('should find root from magic comment', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const stub = mock.activeTextEditor(texPath, '%!TeX root=main.tex')
            const root = await lw.root._test.findFromMagic()
            stub.restore()

            assert.strictEqual(root, texPath)
        })

        it('should find root from magic comment with relative path', async () => {
            const texPath = get.path(fixture, 'find_magic', 'main.tex')
            const stub = mock.activeTextEditor(texPath, '%!TeX root=../main.tex')
            const root = await lw.root._test.findFromMagic()
            stub.restore()

            assert.strictEqual(root, get.path(fixture, 'main.tex'))
        })

        it('should return undefined if the magic root does not exist', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const stub = mock.activeTextEditor(texPath, '%!TeX root=non-existing.tex')
            const root = await lw.root._test.findFromMagic()
            stub.restore()

            assert.strictEqual(root, undefined)
        })

        it('should find root from chained magic comment `a->b->c`', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const stub = mock.activeTextEditor(texPath, '%!TeX root=find_magic/chain.tex')
            const root = await lw.root._test.findFromMagic()
            stub.restore()

            assert.strictEqual(root, get.path(fixture, 'find_magic', 'main.tex'))
        })

        it('should find root from deeply chained magic comment `a->b->c->d`', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const stub = mock.activeTextEditor(texPath, '%!TeX root=find_magic/more_chain.tex')
            const root = await lw.root._test.findFromMagic()
            stub.restore()

            assert.strictEqual(root, get.path(fixture, 'find_magic', 'main.tex'))
        })

        it('should return undefined if the chained magic root does not exist', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const stub = mock.activeTextEditor(texPath, '%!TeX root=find_magic/chain_file_not_exist.tex')
            const root = await lw.root._test.findFromMagic()
            stub.restore()

            assert.strictEqual(root, undefined)
        })

        it('should return the looped root if the chain forms a loop `a->b->c->a`', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const stub = mock.activeTextEditor(texPath, '%!TeX root=find_magic/loop_1.tex')
            const root = await lw.root._test.findFromMagic()
            stub.restore()

            assert.strictEqual(root, texPath)
        })
    })
})
