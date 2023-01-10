import * as vscode from 'vscode'
import * as path from 'path'
import rimraf from 'rimraf'
import * as lw from '../../src/lw'
import { sleep, assertBuild, runTest, loadTestFile, waitEvent } from './utils'
import { BuildDone } from '../../src/components/eventbus'

suite('Build TeX files test suite', () => {

    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/testground')
    const fixtureName = 'testground'

    suiteSetup(() => {
        fixture = path.resolve(lw.extensionRoot, 'test/fixtures/testground')
    })

    setup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        lw.manager.rootFile = undefined

        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.exclude', undefined)

        if (path.basename(fixture) === 'testground') {
            rimraf(fixture + '/{*,.vscode/*}', (e) => {if (e) {console.error(e)}})
            await sleep(500) // Required for pooling
        }
    })


    runTest(suiteName, fixtureName, 'build', async () => {
        await loadTestFile(fixture, [{src: 'base.tex', dst: 'main.tex'}])
        await assertBuild(fixture, 'main.tex', 'main.pdf')
    })

    runTest(suiteName, fixtureName, 'build with subfiles', async () => {
        await loadTestFile(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ])
        await assertBuild(fixture, 'main.tex', 'main.pdf')
    })

    runTest(suiteName, fixtureName, 'same placeholders multiple times', async () => {
        const tools = [{name: 'latexmk', command: 'latexmk', args: ['-synctex=1', '-interaction=nonstopmode', '-file-line-error', '-pdf', '%DOC%', '%DOC%', '%DOC%']}]
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', tools)
        await loadTestFile(fixture, [{src: 'base.tex', dst: 'main.tex'}])
        await assertBuild(fixture, 'main.tex', 'main.pdf')
    })

    runTest(suiteName, fixtureName, 'auto-detect subfile root and build 1', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', true)
        await loadTestFile(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ])
        await assertBuild(fixture, 'sub/s.tex', 'sub/s.pdf')
    })

    runTest(suiteName, fixtureName, 'auto-detect subfile root and build 2', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', false)
        await loadTestFile(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ])
        await assertBuild(fixture, 'sub/s.tex', 'main.pdf')
    })

    runTest(suiteName, fixtureName, 'build with outDir', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', './out')
        await loadTestFile(fixture, [{src: 'base.tex', dst: 'main.tex'}])
        await assertBuild(fixture, 'main.tex', 'out/main.pdf')
    })

    runTest(suiteName, fixtureName, 'basic build with spaces in names', async () => {
        await loadTestFile(fixture, [{src: 'base.tex', dst: 'main space/main.tex'}])
        await assertBuild(fixture, 'main space/main.tex', 'main space/main.pdf')
    })

    runTest(suiteName, fixtureName, 'basic build with spaces in outdir', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', '%DIR%/out space')
        await loadTestFile(fixture, [{src: 'base.tex', dst: 'main.tex'}])
        await assertBuild(fixture, 'main.tex', 'out space/main.pdf')
    })

    runTest(suiteName, fixtureName, 'build with magic comment', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', [])
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', false)
        await loadTestFile(fixture, [{src: 'magic_program.tex', dst: 'main.tex'}])
        await assertBuild(fixture, 'main.tex', 'main.pdf')
    })

    runTest(suiteName, fixtureName, 'build with !TEX program and !TEX options', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', [])
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', false)
        await loadTestFile(fixture, [{src: 'magic_option.tex', dst: 'main.tex'}])
        await assertBuild(fixture, 'main.tex', 'out/main.pdf')
    })

    runTest(suiteName, fixtureName, 'build with !TEX root', async () => {
        await loadTestFile(fixture, [
            {src: 'input_base.tex', dst: 'main.tex'},
            {src: 'input_base.tex', dst: 'alt.tex'},
            {src: 'magic_root.tex', dst: 'sub/s.tex'}
        ])
        await assertBuild(fixture, 'sub/s.tex', 'main.pdf')
    })

    runTest(suiteName, fixtureName, 'build with invalid !TEX program', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', false)
        await loadTestFile(fixture, [{src: 'magic_invalid.tex', dst: 'main.tex'}])
        await assertBuild(fixture, 'main.tex', '')
    })

    runTest(suiteName, fixtureName, 'build with forceRecipeUsage: true', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', true)
        await loadTestFile(fixture, [{src: 'magic_invalid.tex', dst: 'main.tex'}])
        await assertBuild(fixture, 'main.tex', 'main.pdf')
    })

    runTest(suiteName, fixtureName, 'build a subfile when main.tex opened', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', true)
        await loadTestFile(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ])

        const docMain = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'main.tex')))
        await vscode.window.showTextDocument(docMain)
        const docSub = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))
        await vscode.window.showTextDocument(docSub, vscode.ViewColumn.Beside)

        await assertBuild(fixture, 'sub/s.tex', 'sub/s.pdf')
    })

    runTest(suiteName, fixtureName, 'build main.tex with QuickPick', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', false)
        await loadTestFile(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ])
        await assertBuild(fixture, 'sub/s.tex', 'main.pdf', async () => {
            const wait = waitEvent(BuildDone)
            void vscode.commands.executeCommand('latex-workshop.build')
            await sleep(1000)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            await wait
        })
    })

    runTest(suiteName, fixtureName, 'build s.tex with QuickPick', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', false)
        await loadTestFile(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ])
        await assertBuild(fixture, 'sub/s.tex', 'sub/s.pdf', async () => {
            void vscode.commands.executeCommand('latex-workshop.build')
            await sleep(1000)
            await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
            await sleep(500)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            await waitEvent(BuildDone)
        })
    })

    runTest(suiteName, fixtureName, 'build sub.tex to outdir', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', './out')
        await loadTestFile(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_subsub.tex', dst: 'sub/s.tex'},
            {src: 'plain.tex', dst: 'sub/subsub/infile.tex'}
        ])
        await assertBuild(fixture, 'sub/s.tex', 'sub/out/s.pdf')
    })

    runTest(suiteName, fixtureName, 'basic build with makeindex', async () => {
        await loadTestFile(fixture, [{src: 'makeindex_base.tex', dst: 'main.tex'}])
        await assertBuild(fixture, 'main.tex', 'main.pdf')
    })

    runTest(suiteName, fixtureName, 'build sub.tex to outdir with makeindex', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', './out')
        await loadTestFile(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'makeindex_subfile.tex', dst: 'sub/s.tex'}
        ])
        await assertBuild(fixture, 'sub/s.tex', 'sub/out/s.pdf')
    })

    runTest(suiteName, fixtureName, 'test q/.../ with spaces in outdir on Windows', async () => {
        const tools = [{ name: 'latexmk', command: 'latexmk', args: ['-e', '$pdflatex=q/pdflatex %O -synctex=1 -interaction=nonstopmode -file-line-error %S/', '-outdir=%OUTDIR%', '-pdf', '%DOC%'], env: {} }]
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', tools)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', '%DIR%/out space')
        await loadTestFile(fixture, [{src: 'base.tex', dst: 'main.tex'}])
        await assertBuild(fixture, 'main.tex', 'out space/main.pdf')
    }, ['win32'])

    runTest(suiteName, fixtureName, 'test q/.../ with copy and remove on Windows', async () => {
        const tools = [
            { name: 'latexmk', command: 'latexmk', args: ['-e', '$pdflatex=q/pdflatex %O -synctex=1 -interaction=nonstopmode -file-line-error %S/', '-outdir=%OUTDIR%', '-pdf', '%DOC%'], env: {} },
            {name: 'copyPDF', command: 'copy', args: ['%OUTDIR_W32%\\%DOCFILE%.pdf', '%OUTDIR_W32%\\copy.pdf'], env: {}},
            {name: 'removePDF', command: 'del', args: ['%OUTDIR_W32%\\%DOCFILE%.pdf'], env: {}}
        ]
        const recipes = [{name: 'latexmk_copy', tools: ['latexmk', 'copyPDF', 'removePDF']}]
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', tools)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', recipes)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', '%DIR%/out space')
        await loadTestFile(fixture, [{src: 'base.tex', dst: 'main.tex'}])
        await assertBuild(fixture, 'main.tex', 'out space/copy.pdf')
    }, ['win32'])

})
