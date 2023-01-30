import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as assert from 'assert'
import * as lw from '../../src/lw'
import * as test from './utils'
import { BuildDone } from '../../src/components/eventbus'

suite('Build TeX files test suite', () => {

    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/testground')
    const fixtureName = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        fixture = path.resolve(lw.extensionRoot, 'test/fixtures/testground')
    })

    teardown(async () => {
        await test.reset(fixture)

        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.exclude', undefined)
    })

    test.run(suiteName, fixtureName, 'basic build', async () => {
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run(suiteName, fixtureName, 'same placeholders multiple times', async () => {
        const tools = [{name: 'latexmk', command: 'latexmk', args: ['-synctex=1', '-interaction=nonstopmode', '-file-line-error', '-pdf', '%DOC%', '%DOC%', '%DOC%']}]
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', tools)
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run(suiteName, fixtureName, 'auto-detect subfile root and build 1', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', true)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {local: 1, skipCache: true})
        await test.build(fixture, 'sub/s.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'sub/s.pdf')))
    })

    test.run(suiteName, fixtureName, 'auto-detect subfile root and build 2', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', false)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {local: 1, skipCache: true})
        await test.build(fixture, 'sub/s.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run(suiteName, fixtureName, 'build with outDir', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', './out')
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'out/main.pdf')))
    })

    test.run(suiteName, fixtureName, 'basic build with spaces in names', async () => {
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main space/main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main space/main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'main space/main.pdf')))
    })

    test.run(suiteName, fixtureName, 'basic build with spaces in outdir', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', '%DIR%/out space')
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'out space/main.pdf')))
    })

    test.run(suiteName, fixtureName, 'build with magic comment', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', [])
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', false)
        await test.load(fixture, [
            {src: 'magic_program.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run(suiteName, fixtureName, 'build with !TEX program and !TEX options', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', [])
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', false)
        await test.load(fixture, [
            {src: 'magic_option.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'out/main.pdf')))
    })

    test.run(suiteName, fixtureName, 'build with invalid !TEX program', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', false)
        await test.load(fixture, [
            {src: 'magic_invalid.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex')
        assert.ok(!fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run(suiteName, fixtureName, 'build with forceRecipeUsage: true', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', true)
        await test.load(fixture, [
            {src: 'magic_invalid.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run(suiteName, fixtureName, 'build a subfile with main.tex opened', async () => {
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

    test.run(suiteName, fixtureName, 'build main.tex with QuickPick', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', false)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {local: 1, skipCache: true})

        await test.build(fixture, 'sub/s.tex', async () => {
            const event = test.wait(BuildDone)
            void lw.commander.build()
            await test.sleep(500)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            await event
        })
        assert.ok(fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run(suiteName, fixtureName, 'build s.tex with QuickPick', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', false)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {local: 1, skipCache: true})
        await test.build(fixture, 'sub/s.tex', async () => {
            const event = test.wait(BuildDone)
            void lw.commander.build()
            await test.sleep(500)
            await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
            await test.sleep(250)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            await event
        })
        assert.ok(fs.existsSync(path.resolve(fixture, 'sub/s.pdf')))
    })

    test.run(suiteName, fixtureName, 'build sub.tex to outdir', async () => {
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

    test.run(suiteName, fixtureName, 'basic build with makeindex', async () => {
        await test.load(fixture, [
            {src: 'makeindex_base.tex', dst: 'main.tex'}
        ], {skipCache: true})

        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run(suiteName, fixtureName, 'build sub.tex to outdir with makeindex', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', './out')
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'makeindex_subfile.tex', dst: 'sub/s.tex'}
        ], {local: 1, skipCache: true})

        await test.build(fixture, 'sub/s.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'out/s.pdf')))
    })

    test.run(suiteName, fixtureName, 'test q/.../ with spaces in outdir on Windows', async () => {
        const tools = [{ name: 'latexmk', command: 'latexmk', args: ['-e', '$pdflatex=q/pdflatex %O -synctex=1 -interaction=nonstopmode -file-line-error %S/', '-outdir=%OUTDIR%', '-pdf', '%DOC%'], env: {} }]
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', tools)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', '%DIR%/out space')
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})

        await test.build(fixture, 'main.tex')
        assert.ok(fs.existsSync(path.resolve(fixture, 'out space/main.pdf')))
    }, ['win32'])

    test.run(suiteName, fixtureName, 'test q/.../ with copy and remove on Windows', async () => {
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
