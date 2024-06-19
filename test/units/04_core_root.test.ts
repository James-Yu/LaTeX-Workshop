import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { assert, get, has, mock, set, sleep } from './utils'
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
                workspace,
                vscode.workspace.workspaceFile ?? vscode.workspace.workspaceFolders?.[0].uri
            )
        })

        it('should return the first workspace if no file is provided or opened', () => {
            const workspace = lw.root._test.getWorkspace()

            assert.strictEqual(
                workspace,
                vscode.workspace.workspaceFile ?? vscode.workspace.workspaceFolders?.[0].uri
            )
        })

        it('should return the workspace of active editor if no file is provided', () => {
            const texPath = get.path(fixture, 'main.tex')
            const stub = mock.activeTextEditor(texPath, '')
            const workspace = lw.root._test.getWorkspace()
            stub.restore()

            assert.strictEqual(
                workspace,
                vscode.workspace.workspaceFile ?? vscode.workspace.workspaceFolders?.[0].uri
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

        it('should find root from magic comment with different syntax', async () => {
            const texPath = get.path(fixture, 'main.tex')

            let stub = mock.activeTextEditor(texPath, '% !TeX root=main.tex')
            let root = await lw.root._test.findFromMagic()
            stub.restore()
            assert.strictEqual(root, texPath)

            stub = mock.activeTextEditor(texPath, '% ! TeX root=main.tex')
            root = await lw.root._test.findFromMagic()
            stub.restore()
            assert.strictEqual(root, texPath)

            stub = mock.activeTextEditor(texPath, '%!TEX root=main.tex')
            root = await lw.root._test.findFromMagic()
            stub.restore()
            assert.strictEqual(root, texPath)
        })

        it('should find root from magic comment with different file name extension', async () => {
            let rootPath = get.path(fixture, 'find_magic', 'main.jnw')
            let stub = mock.activeTextEditor(rootPath, '%!TeX root=main.jnw')
            let root = await lw.root._test.findFromMagic()
            stub.restore()
            assert.strictEqual(root, rootPath)

            rootPath = get.path(fixture, 'find_magic', 'main.rnw')
            stub = mock.activeTextEditor(rootPath, '%!TeX root=main.rnw')
            root = await lw.root._test.findFromMagic()
            stub.restore()
            assert.strictEqual(root, rootPath)

            rootPath = get.path(fixture, 'find_magic', 'main.snw')
            stub = mock.activeTextEditor(rootPath, '%!TeX root=main.snw')
            root = await lw.root._test.findFromMagic()
            stub.restore()
            assert.strictEqual(root, rootPath)

            rootPath = get.path(fixture, 'find_magic', 'main.rtex')
            stub = mock.activeTextEditor(rootPath, '%!TeX root=main.rtex')
            root = await lw.root._test.findFromMagic()
            stub.restore()
            assert.strictEqual(root, rootPath)

            rootPath = get.path(fixture, 'find_magic', 'main.jtexw')
            stub = mock.activeTextEditor(rootPath, '%!TeX root=main.jtexw')
            root = await lw.root._test.findFromMagic()
            stub.restore()
            assert.strictEqual(root, rootPath)
        })
    })

    describe('lw.root.findFromRoot', () => {
        it('should return undefined if there is no active editor', () => {
            const stub = sinon.stub(vscode.window, 'activeTextEditor').value(undefined)
            const root = lw.root._test.findFromRoot()
            stub.restore()

            assert.strictEqual(root, undefined)
        })

        it('should return undefined if there is no root', () => {
            const texPath = get.path(fixture, 'main.tex')

            const stub = mock.activeTextEditor(texPath, '')
            const root = lw.root._test.findFromRoot()
            stub.restore()

            assert.strictEqual(root, undefined)
        })

        it('should return undefined if active editor is not a file', () => {
            const texPath = get.path(fixture, 'main.tex')

            set.root(texPath)
            const stub = mock.activeTextEditor('https://google.com', '', { scheme: 'https' })
            const root = lw.root._test.findFromRoot()
            stub.restore()

            assert.strictEqual(root, undefined)
        })

        it('should find root if active file is in the root tex tree', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const toParse = get.path(fixture, 'find_root', 'root.tex')

            set.root(toParse)
            await lw.cache.refreshCache(toParse)
            const stub = mock.activeTextEditor(texPath, '')
            const root = lw.root._test.findFromRoot()
            stub.restore()

            assert.strictEqual(root, toParse)
        })

        it('should return undefined if active file is not in the root tex tree', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const toParse = get.path(fixture, 'find_root', 'root_no_input.tex')

            set.root(toParse)
            await lw.cache.refreshCache(toParse)
            const stub = mock.activeTextEditor(texPath, '')
            const root = lw.root._test.findFromRoot()
            stub.restore()

            assert.strictEqual(root, undefined)
        })
    })

    describe('lw.root.findFromActive', () => {
        beforeEach(async () => {
            await set.config('latex.rootFile.indicator', '\\documentclass[]{}')
        })

        it('should return undefined if there is no active editor', () => {
            const stub = sinon.stub(vscode.window, 'activeTextEditor').value(undefined)
            const root = lw.root._test.findFromActive()
            stub.restore()

            assert.strictEqual(root, undefined)
        })

        it('should return undefined if active editor is not a file', () => {
            const texPath = get.path(fixture, 'main.tex')

            set.root(texPath)
            const stub = mock.activeTextEditor('https://google.com', '', { scheme: 'https' })
            const root = lw.root._test.findFromActive()
            stub.restore()

            assert.strictEqual(root, undefined)
        })

        it('should find root if active file has root file indicator', () => {
            const texPath = get.path(fixture, 'main.tex')

            const stub = mock.activeTextEditor(texPath, '\\documentclass{article}\n')
            const root = lw.root._test.findFromActive()
            stub.restore()

            assert.strictEqual(root, texPath)
        })

        it('should ignore root file indicators in comments', () => {
            const texPath = get.path(fixture, 'main.tex')

            const stub = mock.activeTextEditor(texPath, '% \\documentclass{article}\n')
            const root = lw.root._test.findFromActive()
            stub.restore()

            assert.strictEqual(root, undefined)
        })

        it('should find subfile root if active file is a subfile', () => {
            const texPath = get.path(fixture, 'main.tex')

            const stub = mock.activeTextEditor(texPath, '\\documentclass[find_active/main.tex]{subfiles}\n')
            const root = lw.root._test.findFromActive()
            stub.restore()

            assert.strictEqual(root, get.path(fixture, 'find_active', 'main.tex'))
            assert.strictEqual(lw.root.subfiles.path, texPath)
        })

        it('should find root if active file is a subfile but points to non-existing file', () => {
            const texPath = get.path(fixture, 'main.tex')

            const stub = mock.activeTextEditor(texPath, '\\documentclass[find_active/nothing.tex]{subfiles}\n')
            const root = lw.root._test.findFromActive()
            stub.restore()

            assert.strictEqual(root, texPath)
        })
    })

    describe('lw.root.findInWorkspace', () => {
        beforeEach(async () => {
            await set.config('latex.rootFile.indicator', '\\documentclass[]{}')
        })

        it('should follow `latex.search.rootFiles.include` config', async () => {
            await set.config('latex.search.rootFiles.include', [ 'absolutely-nothing.tex' ])
            const root = await lw.root._test.findInWorkspace()

            assert.strictEqual(root, undefined)
        })

        it('should follow `latex.search.rootFiles.exclude` config', async () => {
            await set.config('latex.search.rootFiles.exclude', [ '**/*' ])
            const root = await lw.root._test.findInWorkspace()

            assert.strictEqual(root, undefined)
        })

        it('should find the correct root from workspace', async () => {
            const texPath = get.path(fixture, 'find_workspace', 'main.tex')

            await set.config('latex.search.rootFiles.include', [ `${fixture}/find_workspace/**/*.tex` ])
            await set.config('latex.search.rootFiles.exclude', [ `${fixture}/find_workspace/**/parent.tex` ])
            const root = await lw.root._test.findInWorkspace()

            assert.strictEqual(root, texPath)
        })

        it('should ignore root file indicators in comments', async () => {
            await set.config('latex.search.rootFiles.include', [ `${fixture}/find_workspace/**/comment.tex` ])
            const root = await lw.root._test.findInWorkspace()

            assert.strictEqual(root, undefined)
        })

        it('should find the correct root if the .fls of root includes active editor', async () => {
            const texPath = get.path(fixture, 'find_workspace', 'main.tex')
            const texPathAnother = get.path(fixture, 'find_workspace', 'another.tex')

            await set.config('latex.search.rootFiles.include', [ `${fixture}/find_workspace/**/*.tex` ])
            const stub = mock.activeTextEditor(texPathAnother, '\\documentclass{article}\n')
            const root = await lw.root._test.findInWorkspace()
            stub.restore()

            assert.strictEqual(root, texPath)
        })

        it('should find the correct root if the children of root includes active editor', async () => {
            const texPath = get.path(fixture, 'find_workspace', 'parent.tex')
            const texPathAnother = get.path(fixture, 'find_workspace', 'another.tex')

            await set.config('latex.search.rootFiles.include', [ `${fixture}/find_workspace/**/*.tex` ])
            await set.config('latex.search.rootFiles.exclude', [ `${fixture}/find_workspace/main.tex` ])
            await lw.cache.refreshCache(texPath)
            const stub = mock.activeTextEditor(texPathAnother, '\\documentclass{article}\n')
            const root = await lw.root._test.findInWorkspace()
            stub.restore()

            assert.strictEqual(root, texPath)
        })

        it('should find the correct root if there is a fls file, and the children of root includes active editor', async () => {
            const texPath = get.path(fixture, 'find_workspace', 'parent.tex')
            const texPathAnother = get.path(fixture, 'find_workspace', 'another.tex')

            await set.config('latex.search.rootFiles.include', [ `${fixture}/find_workspace/**/*.tex` ])
            await lw.cache.refreshCache(texPath)
            const stub = mock.activeTextEditor(texPathAnother, '\\documentclass{article}\n')
            const root = await lw.root._test.findInWorkspace()
            stub.restore()

            assert.strictEqual(root, get.path(fixture, 'find_workspace', 'main.tex'))
        })

        it('should find the correct root if current root is in the candidates', async () => {
            const texPath = get.path(fixture, 'find_workspace', 'main.tex')

            await set.config('latex.search.rootFiles.include', [ `${fixture}/find_workspace/**/*.tex` ])
            set.root(fixture, 'find_workspace', 'main.tex')
            const stub = mock.activeTextEditor(texPath, '\\documentclass{article}\n')
            const root = await lw.root._test.findInWorkspace()
            stub.restore()

            assert.strictEqual(root, texPath)
        })
    })

    describe('lw.root.find', () => {
        beforeEach(() => {
            (lw.outline.refresh as sinon.SinonStub).reset()
            ;(lw.completion.input.reset as sinon.SinonStub).reset()
            ;(lw.lint.label.reset as sinon.SinonStub).reset()
        })

        it('should not change root if no new root can be found, only refresh outline', async () => {
            await set.config('latex.search.rootFiles.exclude', [ '**/*.*' ])

            await lw.root.find()

            assert.strictEqual(lw.root.file.path, undefined)
            assert.strictEqual((lw.outline.refresh as sinon.SinonStub).callCount, 1)
        })

        it('should not change root if new root remains the same, only refresh outline', async () => {
            const texPath = get.path(fixture, 'main.tex')
            set.root(fixture, 'main.tex')

            const stub = mock.activeTextEditor(texPath, '%!TeX root=main.tex')
            const cacheStub = sinon.spy(lw.cache, 'refreshCache')
            await lw.root.find()
            stub.restore()
            cacheStub.restore()

            assert.strictEqual(lw.root.file.path, texPath)
            assert.strictEqual((lw.outline.refresh as sinon.SinonStub).callCount, 1)
            assert.strictEqual(cacheStub.callCount, 0)
        })

        it('should set path, dir, langId on newly found root', async () => {
            const texPath = get.path(fixture, 'main.tex')

            const stub = mock.activeTextEditor(texPath, '%!TeX root=main.tex')
            await lw.root.find()
            stub.restore()

            assert.strictEqual(lw.root.file.path, texPath)
            assert.strictEqual(lw.root.file.langId, lw.file.getLangId(texPath))
            assert.strictEqual(lw.root.dir.path, path.dirname(texPath))
        })

        it('should reset input completion, duplicate label cache, and file caches on newly found root', async () => {
            const texPath = get.path(fixture, 'main.tex')

            const stub = mock.activeTextEditor(texPath, '%!TeX root=main.tex')
            const cacheSpy = sinon.spy(lw.cache, 'reset')
            await lw.root.find()
            stub.restore()
            cacheSpy.restore()

            assert.strictEqual(cacheSpy.callCount, 1)
            assert.strictEqual((lw.completion.input.reset as sinon.SinonStub).callCount, 1)
            assert.strictEqual((lw.lint.label.reset as sinon.SinonStub).callCount, 1)
        })

        it('should watch, cache, and parse fls of the new root', async function (this: Mocha.Context) {
            this.slow(300)
            const texPath = get.path(fixture, 'main.tex')

            const stub = mock.activeTextEditor(texPath, '%!TeX root=main.tex')
            const cacheSpy1 = sinon.spy(lw.cache, 'refreshCache')
            const cacheSpy2 = sinon.spy(lw.cache, 'loadFlsFile')
            await lw.root.find()
            stub.restore()
            cacheSpy1.restore()

            assert.ok(lw.watcher.src.has(texPath))
            assert.strictEqual(cacheSpy1.callCount, 1)

            await lw.cache.wait(texPath)
            await sleep(50)
            cacheSpy2.restore()

            assert.strictEqual(cacheSpy2.callCount, 1)
        })
    })
})
