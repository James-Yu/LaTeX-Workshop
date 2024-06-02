import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import { lw } from '../../src/lw'
import * as test from './utils'

suite('Find root file test suite', () => {
    test.suite.name = path.basename(__filename).replace('.test.js', '')
    test.suite.fixture = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'never')
    })

    teardown(async () => {
        await test.reset()

        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.exclude', undefined)
    })

    test.run('basic root', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {root: -1, skipCache: true})
        const roots = await test.find(fixture, 'main.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'main.tex'))
    })

    test.run('root with subfile', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {root: -1, skipCache: true})
        const roots = await test.find(fixture, 'main.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'main.tex'))
    })

    test.run('subfile root with subfile opened', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {root: -1, skipCache: true})
        const roots = await test.find(fixture, 'sub/s.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'main.tex'))
        assert.strictEqual(roots.local, path.join(fixture, 'sub/s.tex'))
    })

    test.run('detect root with !TEX root', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'input_base.tex', dst: 'main.tex'},
            {src: 'input_base.tex', dst: 'alt.tex'},
            {src: 'magic_root.tex', dst: 'sub/s.tex'}
        ], {root: -1, skipCache: true})
        const roots = await test.find(fixture, 'sub/s.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'main.tex'))
    })

    test.run('detect root with search.rootFiles.include', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.include', ['**/alt/*.tex'])
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'input_parentsub.tex', dst: 'alt/main.tex'},
            {src: 'plain.tex', dst: 'sub/plain.tex'}
        ], {root: -1, skipCache: true})
        const roots = await test.find(fixture, 'sub/plain.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'alt/main.tex'))
    })

    test.run('detect root with search.rootFiles.exclude', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.exclude', ['*/*.tex'])
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'input_parentsub.tex', dst: 'alt/main.tex'},
            {src: 'plain.tex', dst: 'sub/plain.tex'}
        ], {root: -1, skipCache: true})
        const roots = await test.find(fixture, 'sub/plain.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'alt/main.tex'))
    })

    test.run('auto-detect root with verbatim', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'input_base.tex', dst: 'main.tex'},
            {src: 'plain_verbatim.tex', dst: 'sub/s.tex'}
        ], {root: -1, skipCache: true})
        const roots = await test.find(fixture, 'sub/s.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'main.tex'))
    })

    test.run('import package', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'import_base.tex', dst: 'main.tex'},
            {src: 'import_sub.tex', dst: 'sub/s.tex'},
            {src: 'plain.tex', dst: 'sub/subsub/sss/sss.tex'}
        ], {root: -1, skipCache: true})
        const roots = await test.find(fixture, 'sub/subsub/sss/sss.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'main.tex'))
    })

    test.run('circular inclusion', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'include_base.tex', dst: 'main.tex'},
            {src: 'include_sub.tex', dst: 'alt.tex'},
            {src: 'plain.tex', dst: 'sub/s.tex'}
        ], {root: -1, skipCache: true})
        const roots = await test.find(fixture, 'alt.tex')
        await lw.cache.wait(path.join(fixture, 'alt.tex'))
        assert.strictEqual(roots.root, path.join(fixture, 'main.tex'))
        const includedTeX = lw.cache.getIncludedTeX()
        assert.ok(includedTeX)
        assert.ok(includedTeX.includes(path.resolve(fixture, 'main.tex')))
        assert.ok(includedTeX.includes(path.resolve(fixture, 'alt.tex')))
        assert.ok(includedTeX.includes(path.resolve(fixture, 'sub/s.tex')))
    })
})
