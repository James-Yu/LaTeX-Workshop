import * as vscode from 'vscode'
import * as path from 'path'
import * as lw from '../../src/lw'
import * as test from './utils'
import assert from 'assert'

suite('Auto-build test suite', () => {

    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/testground')
    const fixtureName = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        fixture = path.resolve(lw.extensionRoot, 'test/fixtures/testground')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.interval', 250)
    })

    setup(async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'onFileChange')
    })

    teardown(async () => {
        await test.reset(fixture)

        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.watch.files.ignore', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', undefined)
    })

    suiteTeardown(async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.interval', undefined)
    })

    test.run(suiteName, fixtureName, 'auto build', async () => {
        await test.loadAndCache(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ])
        const { type } = await test.editAndAuto(fixture, 'main.tex')
        assert.strictEqual(type, 'onChange')
    })

    test.run(suiteName, fixtureName, 'auto build with subfiles and onFileChange', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', false)
        await test.loadAndCache(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {local: 1})
        const { type } = await test.editAndAuto(fixture, 'sub/s.tex')
        assert.strictEqual(type, 'onChange')
    })

    test.run(suiteName, fixtureName, 'auto build with import and onFileChange', async () => {
        await test.loadAndCache(fixture, [
            {src: 'import_base.tex', dst: 'main.tex'},
            {src: 'import_sub.tex', dst: 'sub/s.tex'},
            {src: 'plain.tex', dst: 'sub/subsub/sss/sss.tex'}
        ], {local: 1})
        const { type } = await test.editAndAuto(fixture, 'sub/subsub/sss/sss.tex')
        assert.strictEqual(type, 'onChange')
    })

    test.run(suiteName, fixtureName, 'auto build with input and onFileChange', async () => {
        await test.loadAndCache(fixture, [
            {src: 'input_base.tex', dst: 'main.tex'},
            {src: 'plain.tex', dst: 'sub/s.tex'}
        ])
        const { type } = await test.editAndAuto(fixture, 'sub/s.tex')
        assert.strictEqual(type, 'onChange')
    })

    test.run(suiteName, fixtureName, 'auto build when editing bib', async () => {
        await test.loadAndCache(fixture, [
            {src: 'bibtex_base.tex', dst: 'main.tex'},
            {src: 'plain.bib', dst: 'bib.bib'}
        ])
        const { type } = await test.editAndAuto(fixture, 'bib.bib')
        assert.strictEqual(type, 'onChange')
    })

    test.run(suiteName, fixtureName, 'auto build with input whose path uses a macro', async () => {
        await test.loadAndCache(fixture, [
            {src: 'input_macro.tex', dst: 'main.tex'},
            {src: 'plain.tex', dst: 'sub/s.tex'}
        ])
        const { type } = await test.editAndAuto(fixture, 'sub/s.tex')
        assert.strictEqual(type, 'onChange')
    })

    test.run(suiteName, fixtureName, 'auto build with watch.files.ignore', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.watch.files.ignore', ['**/s.tex'])
        await test.loadAndCache(fixture, [
            {src: 'input_base.tex', dst: 'main.tex'},
            {src: 'plain.tex', dst: 'sub/s.tex'}
        ])
        const { type } = await test.editAndAuto(fixture, 'sub/s.tex', true)
        assert.strictEqual(type, 'onChange')
    })

    test.run(suiteName, fixtureName, 'auto build with subfiles and onSave', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'onSave')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', false)
        await test.loadAndCache(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {local: 1})
        const { type } = await test.editAndAuto(fixture, 'sub/s.tex', false, true)
        assert.strictEqual(type, 'onSave')
    })
})
