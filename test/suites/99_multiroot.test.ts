import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as assert from 'assert'
import * as test from './utils'

function resolve(fixture: string, fileName: string, ws: string) {
    return path.resolve(path.dirname(fixture), ws, path.basename(fixture), fileName)
}

suite('Multi-root workspace test suite', () => {
    test.suite.name = path.basename(__filename).replace('.test.js', '')
    test.suite.fixture = 'multiroot'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.interval', 250)
    })

    setup(async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'onFileChange')
    })

    teardown(async () => {
        await test.reset()

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
        for (const config of configs) {
            for (const item of items) {
                await config.update(item, undefined)
            }
        }
    })

    suiteTeardown(async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.interval', undefined)
    })

    test.run('detect root with search.rootFiles.include', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.include', ['**/alt/*.tex'])
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex', ws: 'A'},
            {src: 'input_parentsub.tex', dst: 'alt/main.tex', ws: 'A'},
            {src: 'plain.tex', dst: 'sub/s.tex', ws: 'A'},
            {src: 'empty', dst: 'empty', ws: 'B'}
        ], {root: -1, skipCache: true})
        const roots = await test.find(fixture, 'sub/s.tex', 'A')
        assert.strictEqual(roots.root, resolve(fixture, 'alt/main.tex', 'A'))
    })

    test.run('detect root with search.rootFiles.exclude', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.exclude', ['*/*.tex'])
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex', ws: 'A'},
            {src: 'input_parentsub.tex', dst: 'alt/main.tex', ws: 'A'},
            {src: 'plain.tex', dst: 'sub/s.tex', ws: 'A'},
            {src: 'empty', dst: 'empty', ws: 'B'}
        ], {root: -1, skipCache: true})
        const roots = await test.find(fixture, 'sub/s.tex', 'A')
        assert.strictEqual(roots.root, resolve(fixture, 'alt/main.tex', 'A'))
    })

    test.run('switching rootFile', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex', ws: 'A'},
            {src: 'base.tex', dst: 'main.tex', ws: 'B'}
        ], {root: -1, skipCache: true})
        let roots = await test.find(fixture, 'main.tex', 'A')
        assert.strictEqual(roots.root, resolve(fixture, 'main.tex', 'A'))
        roots = await test.find(fixture, 'main.tex', 'B')
        assert.strictEqual(roots.root, resolve(fixture, 'main.tex', 'B'))
        roots = await test.find(fixture, 'main.tex', 'A')
        assert.strictEqual(roots.root, resolve(fixture, 'main.tex', 'A'))
    })

    test.run('basic build with default recipe name', async (fixture: string) => {
        const tools = [
            {name: 'latexmk', command: 'latexmk', args: ['-synctex=1', '-interaction=nonstopmode', '-file-line-error', '-pdf', '-outdir=%OUTDIR%', '-jobname=wsA', '%DOC%'], env: {}},
            {name: 'fake', command: 'touch', args: ['%DIR%/fake.pdf']}
        ]
        const recipes = [{name: 'latexmk', tools: ['latexmk']}, {name: 'fake', tools: ['fake']}]
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', tools)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', recipes)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipe.default', 'fake')
        await vscode.workspace.getConfiguration('latex-workshop', vscode.workspace.workspaceFolders?.[0]).update('latex.recipe.default', 'latexmk')
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex', ws: 'A'},
            {src: 'empty', dst: 'empty', ws: 'B'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex', 'A')
        assert.ok(fs.existsSync(resolve(fixture, 'wsA.pdf', 'A')))
    })

    test.run('basic build with unavailable lastUsed', async (fixture: string) => {
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
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex', ws: 'A'},
            {src: 'empty', dst: 'empty', ws: 'B'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex', 'A')
        assert.ok(fs.existsSync(resolve(fixture, 'wsA.pdf', 'A')))
    })

    test.run('basic build with outDir', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop', vscode.workspace.workspaceFolders?.[0]).update('latex.outDir', './out')
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex', ws: 'A'},
            {src: 'empty', dst: 'empty', ws: 'B'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex', 'A')
        assert.ok(fs.existsSync(resolve(fixture, 'out/main.pdf', 'A')))
    })

    test.run('build with forceRecipeUsage: true', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', false)
        await vscode.workspace.getConfiguration('latex-workshop', vscode.workspace.workspaceFolders?.[0]).update('latex.build.forceRecipeUsage', true)
        await test.load(fixture, [
            {src: 'magic_invalid.tex', dst: 'main.tex', ws: 'A'},
            {src: 'empty', dst: 'empty', ws: 'B'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex', 'A')
        assert.ok(fs.existsSync(resolve(fixture, 'main.pdf', 'A')))
    })

    test.run('auto build with subfiles and onSave', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'onSave')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', false)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex', ws: 'A'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex', ws: 'A'},
            {src: 'empty', dst: 'empty', ws: 'B'}
        ], {local: 1})
        const { type } = await test.auto(fixture, 'sub/s.tex', false, true, 'A')
        assert.strictEqual(type, 'onSave')
    })

    test.run('switching intellisense', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.citation.label', 'bibtex key')
        await vscode.workspace.getConfiguration('latex-workshop', vscode.workspace.workspaceFolders?.[0]).update('intellisense.citation.label', 'title')
        await test.load(fixture, [
            {src: 'intellisense/citation.tex', dst: 'main.tex', ws: 'A'},
            {src: 'base.bib', dst: 'main.bib', ws: 'A'},
            {src: 'intellisense/citation.tex', dst: 'main.tex', ws: 'B'},
            {src: 'base.bib', dst: 'main.bib', ws: 'B'}
        ])

        let suggestions = test.suggest(2, 9, false, resolve(fixture, 'main.tex', 'A'))
        assert.strictEqual(suggestions.items.length, 3)
        assert.strictEqual(suggestions.items[0].label, 'A fake article')
        assert.ok(suggestions.items[0].filterText)
        assert.ok(suggestions.items[0].filterText.includes('Journal of CI tests'))
        assert.ok(!suggestions.items[0].filterText.includes('hintFake'))

        suggestions = test.suggest(2, 9, false, resolve(fixture, 'main.tex', 'B'))
        assert.strictEqual(suggestions.items.length, 3)
        assert.strictEqual(suggestions.items[0].label, 'art1')
    })
})
