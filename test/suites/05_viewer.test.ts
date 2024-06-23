import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import { lw } from '../../src/lw'
import * as test from './utils'

suite('PDF viewer test suite', () => {
    test.suite.name = path.basename(__filename).replace('.test.js', '')
    test.suite.fixture = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'never')
        await vscode.workspace.getConfiguration('latex-workshop').update('view.pdf.viewer', 'tab')
    })

    teardown(async () => {
        await test.reset()

        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.synctex.afterBuild.enabled', undefined)
    })

    test.run('basic build and view', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})

        await test.build(fixture, 'main.tex')
        await test.view(fixture, 'main.pdf')
    })

    test.run('view in singleton tab', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('view.pdf.viewer', 'singleton')
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})

        await test.build(fixture, 'main.tex')
        await test.view(fixture, 'main.pdf')
        await test.sleep(250)
        await lw.commands.view()
        let statuses = lw.viewer.getViewerState(vscode.Uri.file(path.resolve(fixture, 'main.pdf')))
        assert.strictEqual(statuses.length, 1)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.pdf.viewer', 'legacy')
        await lw.commands.view()
        await test.sleep(250)
        statuses = lw.viewer.getViewerState(vscode.Uri.file(path.resolve(fixture, 'main.pdf')))
        assert.strictEqual(statuses.length, 2)
    }, ['linux', 'darwin'])

    test.run('view in custom editor tab', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('view.pdf.viewer', 'tab')
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})

        await test.build(fixture, 'main.tex')
        await test.view(fixture, 'main.pdf')
        await test.sleep(250)
        await lw.commands.view()
        let statuses = lw.viewer.getViewerState(vscode.Uri.file(path.resolve(fixture, 'main.pdf')))
        assert.strictEqual(statuses.length, 1) // Make sure a custom editor was opened
        await test.sleep(250)
        await lw.commands.view()
        await test.sleep(250)
        statuses = lw.viewer.getViewerState(vscode.Uri.file(path.resolve(fixture, 'main.pdf')))
        assert.strictEqual(statuses.length, 1) // Make sure the custom editor got reused
        await vscode.workspace.getConfiguration('latex-workshop').update('view.pdf.viewer', 'legacy')
        await lw.commands.view()
        await test.sleep(250)
        statuses = lw.viewer.getViewerState(vscode.Uri.file(path.resolve(fixture, 'main.pdf')))
        assert.strictEqual(statuses.length, 2) // Make sure a non-customEditor viewer was opened
    })

    test.run('build main.tex and view it', async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {local: 1, skipCache: true})

        await test.build(fixture, 'sub/s.tex')
        await test.view(fixture, 'main.pdf')
    })

    test.run('build a subfile and view it', async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', true)
        await test.load(fixture, [
            {src: 'subfile_base.tex', dst: 'main.tex'},
            {src: 'subfile_sub.tex', dst: 'sub/s.tex'}
        ], {local: 1, skipCache: true})

        await test.build(fixture, 'sub/s.tex')
        await test.view(fixture, 'sub/s.pdf')
    })

    test.run('build main.tex with QuickPick and view it', async (fixture: string) => {
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
        await test.view(fixture, 'main.pdf', async () => {
            await test.sleep(500)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
        })
    })

    test.run('build s.tex with QuickPick and view it', async (fixture: string) => {
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
        await test.view(fixture, 'sub/s.pdf', async () => {
            await test.sleep(500)
            await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
            await test.sleep(250)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
        })
    })

    test.run('build with outDir and view it', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', './out')
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})

        await test.build(fixture, 'main.tex')
        await test.view(fixture, 'out/main.pdf')
    })
})
