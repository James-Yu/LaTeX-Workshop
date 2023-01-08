import * as vscode from 'vscode'
import * as path from 'path'
import rimraf from 'rimraf'
import * as lw from '../../src/lw'
import { sleep, assertAutoBuild, assertBuild, runTest, loadTestFile, waitFileWatched } from './utils'

suite('Auto-build test suite', () => {

    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/testground')
    const fixtureName = 'testground'

    suiteSetup(() => {
        fixture = path.resolve(lw.extensionRoot, 'test/fixtures/testground')
    })

    setup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.interval', 250)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'onFileChange')
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        lw.manager.rootFile = undefined

        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.interval', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.watch.files.ignore', undefined)

        if (path.basename(fixture) === 'testground') {
            rimraf(fixture + '/{*,.vscode/*}', (e) => {if (e) {console.error(e)}})
            await sleep(500) // Required for pooling
        }
    })

    runTest({suiteName, fixtureName, testName: 'auto build'}, async () => {
        await loadTestFile(fixture, [{src: 'base.tex', dst: 'main.tex'}])
        await assertAutoBuild({fixture, texName: 'main.tex', pdfName: 'main.pdf'})
    })

    runTest({suiteName, fixtureName, testName: 'auto build with subfiles and onFileChange 1'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', false)
        await loadTestFile(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ])
        await assertAutoBuild({fixture, texName: 'sub/s.tex', pdfName: 'main.pdf'})
    })

    runTest({suiteName, fixtureName, testName: 'auto build with subfiles and onFileChange 2'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', true)
        await loadTestFile(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ])
        await assertAutoBuild({fixture, texName: 'sub/s.tex', pdfName: 'sub/s.pdf'})
    })

    runTest({suiteName, fixtureName, testName: 'auto build with import and onFileChange'}, async () => {
        await loadTestFile(fixture, [
            {src: 'import_base.tex', dst: 'main.tex'},
            {src: 'import_sub.tex', dst: 'sub/s.tex'},
            {src: 'plain.tex', dst: 'sub/subsub/sss/sss.tex'}
        ])
        await assertAutoBuild({fixture, texName: 'sub/subsub/sss/sss.tex', pdfName: 'main.pdf'})
    })

    runTest({suiteName, fixtureName, testName: 'auto build with input and onFileChange'}, async () => {
        await loadTestFile(fixture, [
            {src: 'input_base.tex', dst: 'main.tex'},
            {src: 'plain.tex', dst: 'sub/s.tex'}
        ])
        await assertAutoBuild({fixture, texName: 'sub/s.tex', pdfName: 'main.pdf'})
    })

    runTest({suiteName, fixtureName, testName: 'auto build when editing bib'}, async () => {
        await loadTestFile(fixture, [
            {src: 'bibtex_base.tex', dst: 'main.tex'},
            {src: 'plain.bib', dst: 'bib.bib'}
        ])
        await assertBuild({fixture, texName: 'main.tex', pdfName: 'main.pdf'})
        await assertAutoBuild({fixture, texName: 'bib.bib', pdfName: 'main.pdf'}, ['skipFirstBuild'])
    })

    runTest({suiteName, fixtureName, testName: 'auto build with input whose path uses a macro'}, async () => {
        await loadTestFile(fixture, [
            {src: 'input_macro.tex', dst: 'main.tex'},
            {src: 'plain.tex', dst: 'sub/s.tex'}
        ])
        const wait = waitFileWatched(path.resolve(fixture, 'sub/s.tex'))
        await assertBuild({fixture, texName: 'main.tex', pdfName: 'main.pdf'})
        await wait
        await assertAutoBuild({fixture, texName: 'sub/s.tex', pdfName: 'main.pdf'}, ['skipFirstBuild'])
    })

    runTest({suiteName, fixtureName, testName: 'auto build when main.tex not in root dir and editing a sub file'}, async () => {
        await loadTestFile(fixture, [
            {src: 'input_parentsub.tex', dst: 'main/main.tex'},
            {src: 'plain.tex', dst: 'sub/s.tex'}
        ])
        await assertBuild({fixture, texName: 'main/main.tex', pdfName: 'main/main.pdf'})
        await assertAutoBuild({fixture, texName: 'sub/s.tex', pdfName: 'main/main.pdf'}, ['skipFirstBuild'])
    })

    runTest({suiteName, fixtureName, testName: 'auto build with input and outDir'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', './out')
        await loadTestFile(fixture, [
            {src: 'input_base.tex', dst: 'main.tex'},
            {src: 'plain.tex', dst: 'sub/s.tex'}
        ])
        await assertAutoBuild({fixture, texName: 'sub/s.tex', pdfName: 'out/main.pdf'})
    })

    runTest({suiteName, fixtureName, testName: 'auto build with watch.files.ignore'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.watch.files.ignore', ['**/s.tex'])
        await loadTestFile(fixture, [
            {src: 'input_base.tex', dst: 'main.tex'},
            {src: 'plain.tex', dst: 'sub/s.tex'}
        ])
        await assertBuild({fixture, texName: 'main.tex', pdfName: 'main.pdf'})
        await assertAutoBuild({fixture, texName: 'sub/s.tex', pdfName: 'main.pdf'}, ['skipFirstBuild', 'noAutoBuild'])
    })

    runTest({suiteName, fixtureName, testName: 'auto build with subfiles and onSave 1'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'onSave')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', false)
        await loadTestFile(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ])
        await assertAutoBuild({fixture, texName: 'sub/s.tex', pdfName: 'main.pdf'}, ['onSave'])
    })

    runTest({suiteName, fixtureName, testName: 'auto build with subfiles and onSave 2'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'onSave')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', true)
        await loadTestFile(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ])
        await assertAutoBuild({fixture, texName: 'sub/s.tex', pdfName: 'sub/s.pdf'}, ['onSave'])
    })
})
