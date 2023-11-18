import * as vscode from 'vscode'
import * as path from 'path'
import * as test from './utils'
import assert from 'assert'

suite('Auto-build test suite', () => {
    test.suite.name = path.basename(__filename).replace('.test.js', '')
    test.suite.fixture = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.interval', 250)
    })

    setup(async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'onFileChange')
    })

    teardown(async () => {
        await test.reset()

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

    test.run('auto build', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ])
        const { type } = await test.auto(fixture, 'main.tex')
        assert.strictEqual(type, 'onFileChange')
    })

    test.run('auto build with subfiles and onFileChange', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', false)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {local: 1})
        const { type } = await test.auto(fixture, 'sub/s.tex')
        assert.strictEqual(type, 'onFileChange')
    })

    test.run('auto build with import and onFileChange', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'import_base.tex', dst: 'main.tex'},
            {src: 'import_sub.tex', dst: 'sub/s.tex'},
            {src: 'plain.tex', dst: 'sub/subsub/sss/sss.tex'}
        ], {local: 1})
        const { type } = await test.auto(fixture, 'sub/subsub/sss/sss.tex')
        assert.strictEqual(type, 'onFileChange')
    })

    test.run('auto build with input and onFileChange', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'input_base.tex', dst: 'main.tex'},
            {src: 'plain.tex', dst: 'sub/s.tex'}
        ])
        const { type } = await test.auto(fixture, 'sub/s.tex')
        assert.strictEqual(type, 'onFileChange')
    })

    test.run('auto build when editing bib', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'bibtex_base.tex', dst: 'main.tex'},
            {src: 'base.bib', dst: 'bib.bib'}
        ])
        const { type } = await test.auto(fixture, 'bib.bib')
        assert.strictEqual(type, 'onFileChange')
    })

    test.run('auto build with input whose path uses a macro', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'input_macro.tex', dst: 'main.tex'},
            {src: 'plain.tex', dst: 'sub/s.tex'}
        ])
        const { type } = await test.auto(fixture, 'sub/s.tex')
        assert.strictEqual(type, 'onFileChange')
    })

    test.run('auto build with watch.files.ignore', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.watch.files.ignore', ['**/s.tex'])
        await test.load(fixture, [
            {src: 'input_base.tex', dst: 'main.tex'},
            {src: 'plain.tex', dst: 'sub/s.tex'}
        ])
        const { type } = await test.auto(fixture, 'sub/s.tex', true)
        assert.strictEqual(type, 'onFileChange')
    })

    test.run('auto build with subfiles and onSave', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'onSave')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', false)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {local: 1})
        const { type } = await test.auto(fixture, 'sub/s.tex', false, true)
        assert.strictEqual(type, 'onSave')
    })

    test.run('auto build with markdownInput', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'build/markdown_base.tex', dst: 'main.tex'},
            {src: 'build/markdown_sub.md', dst: 'sub.md'}
        ])
        const { type } = await test.auto(fixture, 'sub.md')
        assert.strictEqual(type, 'onFileChange')
    })
})
