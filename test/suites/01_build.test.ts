import * as vscode from 'vscode'
import * as path from 'path'
import rimraf from 'rimraf'

import { Extension } from '../../src/main'
import { sleep, assertBuild, getExtension, runTest, waitBuild, writeTeX } from './utils'

suite('Build TeX files test suite', () => {

    let extension: Extension
    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/testground')
    const fixtureName = 'testground'

    suiteSetup(async () => {
        extension = await getExtension()
        fixture = path.resolve(extension.extensionRoot, 'test/fixtures/testground')
    })

    setup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        extension.manager.rootFile = undefined

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


    runTest({suiteName, fixtureName, testName: 'build'}, async () => {
        await writeTeX('main', fixture)
        await assertBuild({fixture, texName: 'main.tex', pdfName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build with subfiles'}, async () => {
        await writeTeX('subfile', fixture)
        await assertBuild({fixture, texName: 'main.tex', pdfName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'same placeholders multiple times'}, async () => {
        const tools = [{name: 'latexmk', command: 'latexmk', args: ['-synctex=1', '-interaction=nonstopmode', '-file-line-error', '-pdf', '%DOC%', '%DOC%', '%DOC%']}]
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', tools)

        await writeTeX('main', fixture)
        await assertBuild({fixture, texName: 'main.tex', pdfName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'auto-detect subfile root and build 1'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', true)
        await writeTeX('subfile', fixture)
        await assertBuild({fixture, texName: 'sub/s.tex', pdfName: 'sub/s.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'auto-detect subfile root and build 2'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', false)
        await writeTeX('subfile', fixture)
        await assertBuild({fixture, texName: 'sub/s.tex', pdfName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build with outDir'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', './out')
        await writeTeX('main', fixture)
        await assertBuild({fixture, texName: 'main.tex', pdfName: 'out/main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'basic build with spaces in names'}, async () => {
        await writeTeX('main', fixture, {fileName: 'main space/main.tex'})
        await assertBuild({fixture, texName: 'main space/main.tex', pdfName: 'main space/main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'basic build with spaces in outdir'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', '%DIR%/out space')
        await writeTeX('main', fixture)
        await assertBuild({fixture, texName: 'main.tex', pdfName: 'out space/main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build with magic comment'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', [])
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', false)
        await writeTeX('magicprogram', fixture)
        await assertBuild({fixture, texName: 'main.tex', pdfName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build with !TEX program and !TEX options'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', [])
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', false)
        await writeTeX('magicoption', fixture)
        await assertBuild({fixture, texName: 'main.tex', pdfName: 'out/main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build with !TEX root'}, async () => {
        await writeTeX('magicroot', fixture)
        await assertBuild({fixture, texName: 'sub/s.tex', pdfName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build with invalid !TEX program'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', false)
        await writeTeX('magicinvalidprogram', fixture)
        await assertBuild({fixture, texName: 'main.tex', pdfName: '', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build with forceRecipeUsage: true'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', true)
        await writeTeX('magicinvalidprogram', fixture)
        await assertBuild({fixture, texName: 'main.tex', pdfName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build a subfile when main.tex opened'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', true)
        await writeTeX('subfile', fixture)

        const docMain = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'main.tex')))
        await vscode.window.showTextDocument(docMain)
        const docSub = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))
        await vscode.window.showTextDocument(docSub, vscode.ViewColumn.Beside)

        await assertBuild({fixture, texName: 'sub/s.tex', pdfName: 'sub/s.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build main.tex with QuickPick'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', false)
        await writeTeX('subfile', fixture)
        await assertBuild({fixture, texName: 'sub/s.tex', pdfName: 'main.pdf', extension, build: async () => {
            const wait = waitBuild(extension)
            void vscode.commands.executeCommand('latex-workshop.build')
            await sleep(1000)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            await wait
        }})
    })

    runTest({suiteName, fixtureName, testName: 'build s.tex with QuickPick'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', false)
        await writeTeX('subfile', fixture)
        await assertBuild({fixture, texName: 'sub/s.tex', pdfName: 'sub/s.pdf', extension, build: async () => {
            void vscode.commands.executeCommand('latex-workshop.build')
            await sleep(1000)
            await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
            await sleep(500)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            await waitBuild(extension)
        }})
    })

    runTest({suiteName, fixtureName, testName: 'build sub.tex to outdir'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', './out')
        await writeTeX('subfilethreelayer', fixture)
        await assertBuild({fixture, texName: 'sub/s.tex', pdfName: 'sub/out/s.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'basic build with makeindex'}, async () => {
        await writeTeX('makeindex', fixture)
        await assertBuild({fixture, texName: 'main.tex', pdfName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build sub.tex to outdir with makeindex'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', './out')
        await writeTeX('makesubfileindex', fixture)
        await assertBuild({fixture, texName: 'sub/s.tex', pdfName: 'sub/out/s.pdf', extension})
    })

    runTest({win32only: true, suiteName, fixtureName, testName: 'test q/.../ with spaces in outdir on Windows'}, async () => {
        const tools = [{ name: 'latexmk', command: 'latexmk', args: ['-e', '$pdflatex=q/pdflatex %O -synctex=1 -interaction=nonstopmode -file-line-error %S/', '-outdir=%OUTDIR%', '-pdf', '%DOC%'], env: {} }]
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', tools)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', '%DIR%/out space')
        await writeTeX('main', fixture)
        await assertBuild({fixture, texName: 'main.tex', pdfName: 'out space/main.pdf', extension})
    })

    runTest({win32only: true, suiteName, fixtureName, testName: 'test q/.../ with copy and remove on Windows'}, async () => {
        const tools = [
            { name: 'latexmk', command: 'latexmk', args: ['-e', '$pdflatex=q/pdflatex %O -synctex=1 -interaction=nonstopmode -file-line-error %S/', '-outdir=%OUTDIR%', '-pdf', '%DOC%'], env: {} },
            {name: 'copyPDF', command: 'copy', args: ['%OUTDIR_W32%\\%DOCFILE%.pdf', '%OUTDIR_W32%\\copy.pdf'], env: {}},
            {name: 'removePDF', command: 'del', args: ['%OUTDIR_W32%\\%DOCFILE%.pdf'], env: {}}
        ]
        const recipes = [{name: 'latexmk_copy', tools: ['latexmk', 'copyPDF', 'removePDF']}]
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.tools', tools)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.recipes', recipes)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', '%DIR%/out space')
        await writeTeX('main', fixture)
        await assertBuild({fixture, texName: 'main.tex', pdfName: 'out space/copy.pdf', extension})
    })

})