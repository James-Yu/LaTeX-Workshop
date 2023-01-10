import * as vscode from 'vscode'
import * as path from 'path'
import rimraf from 'rimraf'
import * as lw from '../../src/lw'
import { sleep, assertBuild, assertViewer, runTest, loadTestFile, waitEvent } from './utils'
import { BuildDone } from '../../src/components/eventbus'

suite('PDF viewer test suite', () => {

    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/testground')
    const fixtureName = 'testground'

    suiteSetup(() => {
        fixture = path.resolve(lw.extensionRoot, 'test/fixtures/testground')
    })

    setup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        await vscode.workspace.getConfiguration().update('latex-workshop.view.pdf.viewer', 'tab')
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        lw.manager.rootFile = undefined

        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.view.pdf.viewer', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.synctex.afterBuild.enabled', undefined)

        if (path.basename(fixture) === 'testground') {
            rimraf(fixture + '/{*,.vscode/*}', (e) => {if (e) {console.error(e)}})
            await sleep(500) // Required for pooling
        }
    })

    runTest(suiteName, fixtureName, 'basic build and view', async () => {
        await loadTestFile(fixture, [{src: 'base.tex', dst: 'main.tex'}])
        await assertBuild(fixture, 'main.tex', 'main.pdf')
        await assertViewer(fixture, 'main.pdf')
    })

    runTest(suiteName, fixtureName, 'build main.tex and view it', async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await loadTestFile(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ])
        await assertBuild(fixture, 'sub/s.tex', 'main.pdf')
        await assertViewer(fixture, 'main.pdf')
    })

    runTest(suiteName, fixtureName, 'build a subfile and view it', async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', true)
        await loadTestFile(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ])
        await assertBuild(fixture, 'sub/s.tex', 'sub/s.pdf')
        await assertViewer(fixture, 'sub/s.pdf')
    })

    runTest(suiteName, fixtureName, 'build main.tex with QuickPick and view it', async () => {
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
        await assertViewer(fixture, 'main.pdf', async () => {
            await sleep(1000)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
        })
    })

    runTest(suiteName, fixtureName, 'build s.tex with QuickPick and view it', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', false)
        await loadTestFile(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ])
        await assertBuild(fixture, 'sub/s.tex', 'sub/s.pdf', async () => {
            const wait = waitEvent(BuildDone)
            void vscode.commands.executeCommand('latex-workshop.build')
            await sleep(1000)
            await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
            await sleep(500)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            await wait
        })
        await assertViewer(fixture, 'sub/s.pdf', async () => {
            await sleep(1000)
            await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
            await sleep(500)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
        })
    })

    runTest(suiteName, fixtureName, 'build with outDir and view it', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', './out')
        await loadTestFile(fixture, [{src: 'base.tex', dst: 'main.tex'}])
        await assertBuild(fixture, 'main.tex', 'out/main.pdf')
        await assertViewer(fixture, 'out/main.pdf')
    })
})
