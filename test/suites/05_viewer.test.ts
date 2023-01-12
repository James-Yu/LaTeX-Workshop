import * as vscode from 'vscode'
import * as path from 'path'
import rimraf from 'rimraf'
import * as lw from '../../src/lw'
import * as test from './utils'
import { BuildDone } from '../../src/components/eventbus'
import { resetCachedLog } from '../../src/components/logger'

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
        resetCachedLog()
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
            await test.sleep(500) // Required for pooling
        }
    })

    test.run(suiteName, fixtureName, 'basic build and view', async () => {
        await test.load(fixture, [{src: 'base.tex', dst: 'main.tex'}])
        await test.assert.build(fixture, 'main.tex', 'main.pdf')
        await test.assert.viewer(fixture, 'main.pdf')
    })

    test.run(suiteName, fixtureName, 'build main.tex and view it', async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ])
        await test.assert.build(fixture, 'sub/s.tex', 'main.pdf')
        await test.assert.viewer(fixture, 'main.pdf')
    })

    test.run(suiteName, fixtureName, 'build a subfile and view it', async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', true)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ])
        await test.assert.build(fixture, 'sub/s.tex', 'sub/s.pdf')
        await test.assert.viewer(fixture, 'sub/s.pdf')
    })

    test.run(suiteName, fixtureName, 'build main.tex with QuickPick and view it', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', false)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ])
        await test.assert.build(fixture, 'sub/s.tex', 'main.pdf', async () => {
            const event = test.wait(BuildDone)
            void vscode.commands.executeCommand('latex-workshop.build')
            await test.sleep(1000)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            await event
        })
        await test.assert.viewer(fixture, 'main.pdf', async () => {
            await test.sleep(1000)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
        })
    })

    test.run(suiteName, fixtureName, 'build s.tex with QuickPick and view it', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', false)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ])
        await test.assert.build(fixture, 'sub/s.tex', 'sub/s.pdf', async () => {
            const event = test.wait(BuildDone)
            void vscode.commands.executeCommand('latex-workshop.build')
            await test.sleep(1000)
            await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
            await test.sleep(500)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            await event
        })
        await test.assert.viewer(fixture, 'sub/s.pdf', async () => {
            await test.sleep(1000)
            await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
            await test.sleep(500)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
        })
    })

    test.run(suiteName, fixtureName, 'build with outDir and view it', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', './out')
        await test.load(fixture, [{src: 'base.tex', dst: 'main.tex'}])
        await test.assert.build(fixture, 'main.tex', 'out/main.pdf')
        await test.assert.viewer(fixture, 'out/main.pdf')
    })
})
