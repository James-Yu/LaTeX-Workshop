import * as vscode from 'vscode'
import * as path from 'path'
import rimraf from 'rimraf'
import * as assert from 'assert'
import * as lw from '../../src/lw'
import * as test from './utils'

suite('Multi-root workspace test suite', () => {

    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/multiroot')
    const fixtureName = 'multiroot'

    suiteSetup(() => {
        fixture = path.resolve(lw.extensionRoot, 'test/fixtures/multiroot')
    })

    setup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.interval', 250)
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        lw.manager.rootFile = undefined

        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.exclude', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.citation.label', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.interval', undefined)

        if (path.basename(fixture) === 'multiroot') {
            rimraf(fixture + '/{A,B}/{*,.vscode/*}', (e) => {if (e) {console.error(e)}})
            await test.sleep(500) // Required for pooling
        }
    })

    test.run(suiteName, fixtureName, 'basic build A', async () => {
        const tools = [
            {name: 'latexmk', command: 'latexmk', args: ['-synctex=1', '-interaction=nonstopmode', '-file-line-error', '-pdf', '-outdir=%OUTDIR%', '-jobname=wsA', '%DOC%'], env: {}},
            {name: 'fake', command: 'touch', args: ['%DIR%/fake.pdf']}
        ]
        const recipes = [{name: 'latexmk', tools: ['latexmk']}]
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', tools)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', recipes)
        await test.load(fixture, [
            {src: 'base.tex', dst: 'A/main.tex'},
            {src: 'empty', dst: 'B/empty'}
        ])
        await test.assert.build(fixture, 'A/main.tex', 'A/wsA.pdf')
    })

    test.run(suiteName, fixtureName, 'basic build B', async () => {
        const tools = [
            {name: 'latexmk', command: 'latexmk', args: ['-synctex=1', '-interaction=nonstopmode', '-file-line-error', '-pdf', '-outdir=%OUTDIR%', '-jobname=wsB', '%DOC%'], env: {}},
            {name: 'fake', command: 'touch', args: ['%DIR%/fake.pdf']}
        ]
        const recipes = [{name: 'latexmk', tools: ['latexmk']}]
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', tools)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', recipes)
        await test.load(fixture, [
            {src: 'base.tex', dst: 'B/main.tex'},
            {src: 'empty', dst: 'A/empty'}
        ])
        await test.assert.build(fixture, 'B/main.tex', 'B/wsB.pdf')
    })

    test.run(suiteName, fixtureName, 'basic build with outDir A', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', './out')
        await test.load(fixture, [
            {src: 'base.tex', dst: 'A/main.tex'},
            {src: 'empty', dst: 'B/empty'}
        ])
        await test.assert.build(fixture, 'A/main.tex', 'A/out/main.pdf')
    })

    test.run(suiteName, fixtureName, 'basic build with outDir B', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', './out')
        await test.load(fixture, [
            {src: 'base.tex', dst: 'B/main.tex'},
            {src: 'empty', dst: 'A/empty'}
        ])
        await test.assert.build(fixture, 'B/main.tex', 'B/out/main.pdf')
    })

    test.run(suiteName, fixtureName, 'build with forceRecipeUsage: true', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', true)
        await test.load(fixture, [{src: 'magic_invalid.tex', dst: 'A/main.tex'}])
        await test.load(fixture, [
            {src: 'empty', dst: 'B/empty'}
        ])
        await test.assert.build(fixture, 'A/main.tex', 'A/main.pdf')
    })

    test.run(suiteName, fixtureName, 'detect root with search.rootFiles.include', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.include', ['alt/*.tex'])
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'A/main.tex'},
            {src: 'input_parentsub.tex', dst: 'A/alt/main.tex'},
            {src: 'plain.tex', dst: 'A/sub/s.tex'}
        ])
        await test.load(fixture, [
            {src: 'empty', dst: 'B/empty'}
        ])
        await test.assert.root(fixture, 'A/sub/s.tex', 'A/alt/main.tex')
    })

    test.run(suiteName, fixtureName, 'detect root with search.rootFiles.exclude', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.exclude', ['*.tex'])
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'A/main.tex'},
            {src: 'input_parentsub.tex', dst: 'A/alt/main.tex'},
            {src: 'plain.tex', dst: 'A/sub/s.tex'}
        ])
        await test.load(fixture, [
            {src: 'empty', dst: 'B/empty'}
        ])
        await test.assert.root(fixture, 'A/sub/s.tex', 'A/alt/main.tex')
    })

    test.run(suiteName, fixtureName, 'auto-detect subfile root and build A1', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', true)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'A/main.tex'},
            {src: 'subfile_sub.tex', dst: 'A/sub/s.tex'},
            {src: 'empty', dst: 'B/empty'}
        ])
        await test.assert.build(fixture, 'A/sub/s.tex', 'A/sub/s.pdf')
    })

    test.run(suiteName, fixtureName, 'auto-detect subfile root and build A2', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', false)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'A/main.tex'},
            {src: 'subfile_sub.tex', dst: 'A/sub/s.tex'},
            {src: 'empty', dst: 'B/empty'}
        ])
        await test.assert.build(fixture, 'A/sub/s.tex', 'A/main.pdf')
    })

    test.run(suiteName, fixtureName, 'auto-detect subfile root and build B1', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', true)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'B/main.tex'},
            {src: 'subfile_sub.tex', dst: 'B/sub/s.tex'},
            {src: 'empty', dst: 'A/empty'}
        ])
        await test.assert.build(fixture, 'B/sub/s.tex', 'B/sub/s.pdf')
    })

    test.run(suiteName, fixtureName, 'auto-detect subfile root and build B2', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', false)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'B/main.tex'},
            {src: 'subfile_sub.tex', dst: 'B/sub/s.tex'},
            {src: 'empty', dst: 'A/empty'}
        ])
        await test.assert.build(fixture, 'B/sub/s.tex', 'B/main.pdf')
    })

    test.run(suiteName, fixtureName, 'auto build with subfiles and onSave 1', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'onSave')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', false)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'A/main.tex'},
            {src: 'subfile_sub.tex', dst: 'A/sub/s.tex'},
            {src: 'empty', dst: 'B/empty'}
        ])
        await test.assert.auto(fixture, 'A/sub/s.tex', 'A/main.pdf', ['onSave'])
    })

    test.run(suiteName, fixtureName, 'auto build with subfiles and onSave 2', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'onSave')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', true)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'A/main.tex'},
            {src: 'subfile_sub.tex', dst: 'A/sub/s.tex'},
            {src: 'empty', dst: 'B/empty'}
        ])
        await test.assert.auto(fixture, 'A/sub/s.tex', 'A/sub/s.pdf', ['onSave'])
    })

    test.run(suiteName, fixtureName, 'switching rootFile', async () => {
        await test.load(fixture, [{src: 'base.tex', dst: 'A/main.tex'},
                               {src: 'base.tex', dst: 'B/main.tex'}])
        await test.assert.root(fixture, 'A/main.tex', 'A/main.tex')
        await test.assert.root(fixture, 'B/main.tex', 'B/main.tex')
        await test.assert.root(fixture, 'A/main.tex', 'A/main.tex')
    })

    test.run(suiteName, fixtureName, 'switching intellisense', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.citation.label', 'bibtex key')
        await test.loadAndCache(fixture, [
            {src: 'intellisense/citation.tex', dst: 'A/main.tex'},
            {src: 'base.bib', dst: 'A/main.bib'}
        ])
        await test.loadAndCache(fixture, [
            {src: 'intellisense/citation.tex', dst: 'B/main.tex'},
            {src: 'base.bib', dst: 'B/main.bib'}
        ])
        const workspaceA = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(path.resolve(fixture, 'A/main.tex')))
        await vscode.workspace.getConfiguration('latex-workshop', workspaceA).update('intellisense.citation.label', 'title', vscode.ConfigurationTarget.WorkspaceFolder)

        let suggestions = test.suggest(2, 9, false, path.resolve(fixture, 'A/main.tex'))
        assert.strictEqual(suggestions.items.length, 3)
        assert.strictEqual(suggestions.items[0].label, 'A fake article')
        assert.ok(suggestions.items[0].filterText)
        assert.ok(suggestions.items[0].filterText.includes('Journal of CI tests'))
        assert.ok(!suggestions.items[0].filterText.includes('hintFake'))

        suggestions = test.suggest(2, 9, false, path.resolve(fixture, 'B/main.tex'))
        assert.strictEqual(suggestions.items.length, 3)
        assert.strictEqual(suggestions.items[0].label, 'art1')
    })
})
