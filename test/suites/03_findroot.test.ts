import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import * as lw from '../../src/lw'
import * as test from './utils'

suite('Find root file test suite', () => {

    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/testground')
    const fixtureName = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        fixture = path.resolve(lw.extensionRoot, 'test/fixtures/testground')
    })

    teardown(async () => {
        await test.reset(fixture)

        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.exclude', undefined)
    })

    test.run(suiteName, fixtureName, 'basic root', async () => {
        await test.loadAndCache(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {root: -1, skipCache: true})
        const roots = await test.openAndRoot(fixture, 'main.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'main.tex'))
    })

    test.run(suiteName, fixtureName, 'root with subfile', async () => {
        await test.loadAndCache(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {root: -1, skipCache: true})
        const roots = await test.openAndRoot(fixture, 'main.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'main.tex'))
    })

    test.run(suiteName, fixtureName, 'subfile root with subfile opened', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await test.loadAndCache(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {root: -1, skipCache: true})
        const roots = await test.openAndRoot(fixture, 'sub/s.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'main.tex'))
        assert.strictEqual(roots.local, path.join(fixture, 'sub/s.tex'))
    })

    test.run(suiteName, fixtureName, 'detect root with !TEX root', async () => {
        await test.loadAndCache(fixture, [
            {src: 'input_base.tex', dst: 'main.tex'},
            {src: 'input_base.tex', dst: 'alt.tex'},
            {src: 'magic_root.tex', dst: 'sub/s.tex'}
        ], {root: -1, skipCache: true})
        const roots = await test.openAndRoot(fixture, 'sub/s.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'main.tex'))
    })

    test.run(suiteName, fixtureName, 'detect root with search.rootFiles.include', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.include', ['alt/*.tex'])
        await test.loadAndCache(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'input_parentsub.tex', dst: 'alt/main.tex'},
            {src: 'plain.tex', dst: 'sub/plain.tex'}
        ], {root: -1, skipCache: true})
        const roots = await test.openAndRoot(fixture, 'sub/plain.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'alt/main.tex'))
    })

    test.run(suiteName, fixtureName, 'detect root with search.rootFiles.exclude', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.exclude', ['*.tex'])
        await test.loadAndCache(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'input_parentsub.tex', dst: 'alt/main.tex'},
            {src: 'plain.tex', dst: 'sub/plain.tex'}
        ], {root: -1, skipCache: true})
        const roots = await test.openAndRoot(fixture, 'sub/plain.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'alt/main.tex'))
    })

    test.run(suiteName, fixtureName, 'auto-detect root with verbatim', async () => {
        await test.loadAndCache(fixture, [
            {src: 'input_base.tex', dst: 'main.tex'},
            {src: 'plain_verbatim.tex', dst: 'sub/s.tex'}
        ], {root: -1, skipCache: true})
        const roots = await test.openAndRoot(fixture, 'sub/s.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'main.tex'))
    })

    test.run(suiteName, fixtureName, 'import package', async () => {
        await test.loadAndCache(fixture, [
            {src: 'import_base.tex', dst: 'main.tex'},
            {src: 'import_sub.tex', dst: 'sub/s.tex'},
            {src: 'plain.tex', dst: 'sub/subsub/sss/sss.tex'}
        ], {root: -1, skipCache: true})
        const roots = await test.openAndRoot(fixture, 'sub/subsub/sss/sss.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'main.tex'))
    })

    test.run(suiteName, fixtureName, 'circular inclusion', async () => {
        await test.loadAndCache(fixture, [
            {src: 'include_base.tex', dst: 'main.tex'},
            {src: 'include_sub.tex', dst: 'alt.tex'},
            {src: 'plain.tex', dst: 'sub/s.tex'}
        ], {root: -1, skipCache: true})
        const roots = await test.openAndRoot(fixture, 'alt.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'main.tex'))
        const includedTeX = lw.cacher.getIncludedTeX()
        assert.ok(includedTeX)
        assert.ok(includedTeX.includes(path.resolve(fixture, 'main.tex')))
        assert.ok(includedTeX.includes(path.resolve(fixture, 'alt.tex')))
        assert.ok(includedTeX.includes(path.resolve(fixture, 'sub/s.tex')))
    })
})
