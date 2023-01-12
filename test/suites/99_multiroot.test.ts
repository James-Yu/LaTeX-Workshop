import * as vscode from 'vscode'
import * as path from 'path'
import rimraf from 'rimraf'
import * as assert from 'assert'
import * as lw from '../../src/lw'
import * as test from './utils'
import { resetCachedLog } from '../../src/components/logger'

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
        resetCachedLog()
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
        test.write(fixture, 'A/main.tex', '\\documentclass{article}', '\\begin{document}', 'abc\\cite{}', '\\bibliography{A.bib}', '\\end{document}')
        test.write(fixture, 'B/main.tex', '\\documentclass{article}', '\\begin{document}', 'abc\\cite{}', '\\bibliography{B.bib}', '\\end{document}')
        await test.load(fixture, [
            {src: 'base.bib', dst: 'A/A.bib'},
            {src: 'base.bib', dst: 'B/B.bib'}
        ])
        await lw.completer.citation.parseBibFile(path.resolve(fixture, 'A/A.bib'))
        await lw.completer.citation.parseBibFile(path.resolve(fixture, 'B/B.bib'))

        const resultA = await test.open(fixture, 'A/main.tex')

        const uri = vscode.window.activeTextEditor?.document.uri
        assert.ok(uri)
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)
        await vscode.workspace.getConfiguration('latex-workshop', workspaceFolder).update('intellisense.citation.label', 'title', vscode.ConfigurationTarget.WorkspaceFolder)

        const itemsA = test.suggest(resultA.doc, new vscode.Position(2, 9))
        assert.ok(itemsA)
        assert.strictEqual(itemsA.length, 3)
        assert.strictEqual(itemsA[0].label, 'A fake article')
        assert.ok(itemsA[0].filterText)
        assert.ok(itemsA[0].filterText.includes('Journal of CI tests'))
        assert.ok(!itemsA[0].filterText.includes('hintFake'))

        const resultB = await test.open(fixture, 'B/main.tex')
        const cache = lw.cacher.get(path.resolve(fixture, 'B/main.tex'))
        if (cache) {
            cache.bibfiles = new Set([path.resolve(fixture, 'B/B.bib')])
        } else {
            return
        }

        const itemsB = test.suggest(resultB.doc, new vscode.Position(2, 9))
        assert.ok(itemsB)
        assert.strictEqual(itemsB.length, 3)
        assert.strictEqual(itemsB[0].label, 'art1')
    })
})
