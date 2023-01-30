import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as assert from 'assert'
import * as lw from '../../src/lw'
import * as test from './utils'
import { StructureUpdated } from '../../src/components/eventbus'

suite('Multi-root workspace test suite', () => {

    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/multiroot')
    const fixtureName = 'multiroot'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        fixture = path.resolve(lw.extensionRoot, 'test/fixtures/multiroot')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.interval', 250)
    })

    setup(async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'onFileChange')
    })

    teardown(async () => {
        await test.reset(fixture)

        const configs = [
            vscode.workspace.getConfiguration('latex-workshop'),
            vscode.workspace.getConfiguration('latex-workshop', vscode.workspace.workspaceFolders?.[0])
        ]
        const items = [
            'latex.tools',
            'latex.outDir',
            'latex.recipes',
            'latex.recipe.default',
            'latex.build.forceRecipeUsage',
            'latex.search.rootFiles.include',
            'latex.search.rootFiles.exclude',
            'latex.autoBuild.run',
            'latex.rootFile.doNotPrompt',
            'latex.rootFile.useSubFile',
            'intellisense.citation.label',
            'latex.autoBuild.run'
        ]
        configs.forEach(config => items.forEach(async item => { await config.update(item, undefined) }))
    })

    suiteTeardown(async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.interval', undefined)
    })

    test.run(suiteName, fixtureName, 'detect root with search.rootFiles.include', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.include', ['alt/*.tex'])
        await test.loadAndCache(fixture, [
            {src: 'subfile_base.tex', dst: 'A/main.tex'},
            {src: 'input_parentsub.tex', dst: 'A/alt/main.tex'},
            {src: 'plain.tex', dst: 'A/sub/s.tex'}
        ], {root: -1, skipCache: true})
        await test.loadAndCache(fixture, [
            {src: 'empty', dst: 'B/empty'}
        ], {root: -1, skipCache: true})
        const roots = await test.openAndRoot(fixture, 'A/sub/s.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'A/alt/main.tex'))
    })

    test.run(suiteName, fixtureName, 'detect root with search.rootFiles.exclude', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.exclude', ['*.tex'])
        await test.loadAndCache(fixture, [
            {src: 'subfile_base.tex', dst: 'A/main.tex'},
            {src: 'input_parentsub.tex', dst: 'A/alt/main.tex'},
            {src: 'plain.tex', dst: 'A/sub/s.tex'}
        ], {root: -1, skipCache: true})
        await test.loadAndCache(fixture, [
            {src: 'empty', dst: 'B/empty'}
        ], {root: -1, skipCache: true})
        const roots = await test.openAndRoot(fixture, 'A/sub/s.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'A/alt/main.tex'))
    })

    test.run(suiteName, fixtureName, 'switching rootFile', async () => {
        await test.loadAndCache(fixture, [
            {src: 'base.tex', dst: 'A/main.tex'},
            {src: 'base.tex', dst: 'B/main.tex'}
        ], {root: -1, skipCache: true})
        let roots = await test.openAndRoot(fixture, 'A/main.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'A/main.tex'))
        roots = await test.openAndRoot(fixture, 'B/main.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'B/main.tex'))
        roots = await test.openAndRoot(fixture, 'A/main.tex')
        assert.strictEqual(roots.root, path.join(fixture, 'A/main.tex'))
    })

    test.run(suiteName, fixtureName, 'basic build with default recipe name', async () => {
        const tools = [
            {name: 'latexmk', command: 'latexmk', args: ['-synctex=1', '-interaction=nonstopmode', '-file-line-error', '-pdf', '-outdir=%OUTDIR%', '-jobname=wsA', '%DOC%'], env: {}},
            {name: 'fake', command: 'touch', args: ['%DIR%/fake.pdf']}
        ]
        const recipes = [{name: 'latexmk', tools: ['latexmk']}, {name: 'fake', tools: ['fake']}]
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', tools)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', recipes)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipe.default', 'fake')
        await vscode.workspace.getConfiguration('latex-workshop', vscode.workspace.workspaceFolders?.[0]).update('latex.recipe.default', 'latexmk')
        await test.loadAndCache(fixture, [
            {src: 'base.tex', dst: 'A/main.tex'},
            {src: 'empty', dst: 'B/empty'}
        ], {skipCache: true})
        await test.openAndBuild(fixture, 'A/main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'A/wsA.pdf')))
    })

    test.run(suiteName, fixtureName, 'basic build with unavailable lastUsed', async () => {
        const tools = [
            {name: 'latexmk', command: 'latexmk', args: ['-synctex=1', '-interaction=nonstopmode', '-file-line-error', '-pdf', '-outdir=%OUTDIR%', '-jobname=wsA', '%DOC%'], env: {}},
            {name: 'fake', command: 'touch', args: ['%DIR%/fake.pdf']}
        ]
        const recipes = [{name: 'latexmk A', tools: ['latexmk']}, {name: 'fake', tools: ['fake']}]
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', tools)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', [])
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipe.default', 'fake')
        await vscode.workspace.getConfiguration('latex-workshop', vscode.workspace.workspaceFolders?.[0]).update('latex.recipes', recipes)
        await vscode.workspace.getConfiguration('latex-workshop', vscode.workspace.workspaceFolders?.[0]).update('latex.recipe.default', 'lastUsed')
        await test.loadAndCache(fixture, [
            {src: 'base.tex', dst: 'A/main.tex'},
            {src: 'empty', dst: 'B/empty'}
        ], {skipCache: true})
        await test.openAndBuild(fixture, 'A/main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'A/wsA.pdf')))
    })

    test.run(suiteName, fixtureName, 'basic build with outDir', async () => {
        await vscode.workspace.getConfiguration('latex-workshop', vscode.workspace.workspaceFolders?.[0]).update('latex.outDir', './out')
        await test.loadAndCache(fixture, [
            {src: 'base.tex', dst: 'A/main.tex'},
            {src: 'empty', dst: 'B/empty'}
        ], {skipCache: true})
        await test.openAndBuild(fixture, 'A/main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'A/out/main.pdf')))
    })

    test.run(suiteName, fixtureName, 'build with forceRecipeUsage: true', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', false)
        await vscode.workspace.getConfiguration('latex-workshop', vscode.workspace.workspaceFolders?.[0]).update('latex.build.forceRecipeUsage', true)
        await test.loadAndCache(fixture, [
            {src: 'magic_invalid.tex', dst: 'A/main.tex'}
        ], {skipCache: true})
        await test.loadAndCache(fixture, [
            {src: 'empty', dst: 'B/empty'}
        ], {skipCache: true})
        await test.openAndBuild(fixture, 'A/main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'A/main.pdf')))
    })

    test.run(suiteName, fixtureName, 'auto build with subfiles and onSave', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'onSave')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', false)
        await test.loadAndCache(fixture, [
            {src: 'subfile_base.tex', dst: 'A/main.tex'},
            {src: 'subfile_sub.tex', dst: 'A/sub/s.tex'},
            {src: 'empty', dst: 'B/empty'}
        ], {local: 1})
        const { type } = await test.editAndAuto(fixture, 'A/sub/s.tex', false, true)
        assert.strictEqual(type, 'onSave')
    })

    test.run(suiteName, fixtureName, 'switching intellisense', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.citation.label', 'bibtex key')
        await vscode.workspace.getConfiguration('latex-workshop', vscode.workspace.workspaceFolders?.[0]).update('intellisense.citation.label', 'title')
        await test.loadAndCache(fixture, [
            {src: 'intellisense/citation.tex', dst: 'A/main.tex'},
            {src: 'base.bib', dst: 'A/main.bib'}
        ])
        await test.loadAndCache(fixture, [
            {src: 'intellisense/citation.tex', dst: 'B/main.tex'},
            {src: 'base.bib', dst: 'B/main.bib'}
        ])

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

    test.run(suiteName, fixtureName, 'switching structure', async () => {
        await test.loadAndCache(fixture, [
            {src: 'structure_base.tex', dst: 'A/main.tex'},
            {src: 'structure_sub.tex', dst: 'A/sub/s.tex'},
            {src: 'structure_s2.tex', dst: 'A/sub/s2.tex'},
            {src: 'structure_s3.tex', dst: 'A/sub/s3.tex'}
        ], {root: -1})
        await test.loadAndCache(fixture, [
            {src: 'base.tex', dst: 'B/main.tex'}
        ], {root: -1})

        let updated = test.wait(StructureUpdated)
        let doc = await vscode.workspace.openTextDocument(path.join(fixture, 'A/main.tex'))
        await vscode.window.showTextDocument(doc)
        await updated
        assert.strictEqual(lw.structureViewer.getTreeData().length, 6)

        updated = test.wait(StructureUpdated)
        doc = await vscode.workspace.openTextDocument(path.join(fixture, 'B/main.tex'))
        await vscode.window.showTextDocument(doc)
        await updated
        assert.strictEqual(lw.structureViewer.getTreeData().length, 0)
    })
})
