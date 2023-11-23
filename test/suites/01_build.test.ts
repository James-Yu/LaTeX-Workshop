import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as assert from 'assert'
import { lw } from '../../src/lw'
import * as test from './utils'

suite('Build TeX files test suite', () => {
    test.suite.name = path.basename(__filename).replace('.test.js', '')
    test.suite.fixture = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'never')
    })

    teardown(async () => {
        await test.reset()

        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.exclude', undefined)
    })

    test.run('basic build', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run('same placeholders multiple times', async (fixture: string) => {
        const tools = [{name: 'latexmk', command: 'latexmk', args: ['-synctex=1', '-interaction=nonstopmode', '-file-line-error', '-pdf', '%DOC%', '%DOC%', '%DOC%']}]
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', tools)
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run('auto-detect subfile root and build 1', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', true)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {local: 1, skipCache: true})
        await test.build(fixture, 'sub/s.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'sub/s.pdf')))
    })

    test.run('auto-detect subfile root and build 2', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', false)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {local: 1, skipCache: true})
        await test.build(fixture, 'sub/s.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run('build with outDir', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', './out')
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'out/main.pdf')))
    })

    test.run('basic build with spaces in names', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main space/main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main space/main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'main space/main.pdf')))
    })

    test.run('basic build with spaces in outdir', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', '%DIR%/out space')
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'out space/main.pdf')))
    })

    test.run('build with magic comment', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', [])
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', false)
        await test.load(fixture, [
            {src: 'magic_program.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run('build with !TEX program and !TEX options', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', [])
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', false)
        await test.load(fixture, [
            {src: 'magic_option.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'out/main.pdf')))
    })

    test.run('build with invalid !TEX program', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', false)
        await test.load(fixture, [
            {src: 'magic_invalid.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex')
        assert.ok(!fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run('build with !LW recipe', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', true)
        const tools = [
            { name: 'touch', command: 'touch', args: ['fail.txt'], env: {} },
            { name: 'latexmk', command: 'latexmk', args: [ '-synctex=1', '-interaction=nonstopmode', '-file-line-error', '-pdf', '-outdir=%OUTDIR%', '%DOC%' ], env: {} }
        ]
        const recipes = [{name: 'touch', tools: ['touch']}, {name: 'latexmk', tools: ['latexmk']}]
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', tools)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', recipes)
        await test.load(fixture, [
            {src: 'magic_recipe.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run('build with invalid !LW recipe', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', true)
        const tools = [
            { name: 'touch', command: 'touch', args: ['success.txt'], env: {} },
            { name: 'latexmk', command: 'latexmk', args: [ '-synctex=1', '-interaction=nonstopmode', '-file-line-error', '-pdf', '-outdir=%OUTDIR%', '%DOC%' ], env: {} }
        ]
        const recipes = [{name: 'touch', tools: ['touch']}, {name: 'latexmk_', tools: ['latexmk']}]
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', tools)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', recipes)
        await test.load(fixture, [
            {src: 'magic_recipe.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex')
        assert.ok(!fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run('build with forceRecipeUsage: true', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', true)
        await test.load(fixture, [
            {src: 'magic_invalid.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run('build a subfile with main.tex opened', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', true)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {local: 1, skipCache: true})

        const docMain = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'main.tex')))
        await vscode.window.showTextDocument(docMain)
        const docSub = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))
        await vscode.window.showTextDocument(docSub, vscode.ViewColumn.Beside)

        await test.build(fixture, 'sub/s.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'sub/s.pdf')))
    })

    test.run('build main.tex with QuickPick', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', false)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {local: 1, skipCache: true})

        await test.build(fixture, 'sub/s.tex', undefined, async () => {
            const event = test.wait(lw.event.BuildDone)
            void lw.commands.build()
            await test.sleep(500)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            await event
        })
        assert.ok(fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run('build s.tex with QuickPick', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', false)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {local: 1, skipCache: true})
        await test.build(fixture, 'sub/s.tex', undefined, async () => {
            const event = test.wait(lw.event.BuildDone)
            void lw.commands.build()
            await test.sleep(500)
            await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
            await test.sleep(250)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            await event
        })
        assert.ok(fs.existsSync(path.resolve(fixture, 'sub/s.pdf')))
    })

    test.run('build sub.tex to outdir', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', './out')
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_subsub.tex', dst: 'sub/s.tex'},
            {src: 'plain.tex', dst: 'sub/subsub/infile.tex'}
        ], {local: 1, skipCache: true})

        await test.build(fixture, 'sub/s.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'out/s.pdf')))
    })

    test.run('basic build with makeindex', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'makeindex_base.tex', dst: 'main.tex'}
        ], {skipCache: true})

        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run('build sub.tex to outdir with makeindex', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', './out')
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'makeindex_subfile.tex', dst: 'sub/s.tex'}
        ], {local: 1, skipCache: true})

        await test.build(fixture, 'sub/s.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'out/s.pdf')))
    })

    test.run('test q/.../ with spaces in outdir on Windows', async (fixture: string) => {
        const tools = [{ name: 'latexmk', command: 'latexmk', args: ['-e', '$pdflatex=q/pdflatex %O -synctex=1 -interaction=nonstopmode -file-line-error %S/', '-outdir=%OUTDIR%', '-pdf', '%DOC%'], env: {} }]
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', tools)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', '%DIR%/out space')
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})

        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'out space/main.pdf')))
    }, ['win32'])

    test.run('test q/.../ with copy and remove on Windows', async (fixture: string) => {
        const tools = [
            { name: 'latexmk', command: 'latexmk', args: ['-e', '$pdflatex=q/pdflatex %O -synctex=1 -interaction=nonstopmode -file-line-error %S/', '-outdir=%OUTDIR%', '-pdf', '%DOC%'], env: {} },
            {name: 'copyPDF', command: 'copy', args: ['%OUTDIR_W32%\\%DOCFILE%.pdf', '%OUTDIR_W32%\\copy.pdf'], env: {}},
            {name: 'removePDF', command: 'del', args: ['%OUTDIR_W32%\\%DOCFILE%.pdf'], env: {}}
        ]
        const recipes = [{name: 'latexmk_copy', tools: ['latexmk', 'copyPDF', 'removePDF']}]
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', tools)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', recipes)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', '%DIR%/out space')
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})

        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'out space/copy.pdf')))
    }, ['win32'])

})
