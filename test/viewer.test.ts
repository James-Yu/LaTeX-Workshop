import * as assert from 'assert'
import * as os from 'os'
import * as path from 'path'
import * as process from 'process'
import * as vscode from 'vscode'
import {
    assertPdfIsGenerated,
    getFixtureDir,
    isDockerEnabled,
    execCommandThenPick,
    executeVscodeCommandAfterActivation,
    getViewerStatus,
    runTestWithFixture,
    viewPdf,
    waitLatexWorkshopActivated,
    promisify
} from './utils/ciutils'
import { sleep } from '../src/utils/utils'

suite('PDF Viewer test suite', () => {

    suiteSetup(() => {
        const config = vscode.workspace.getConfiguration()
        if (process.env['LATEXWORKSHOP_CI_ENABLE_DOCKER']) {
            return config.update('latex-workshop.docker.enabled', true, vscode.ConfigurationTarget.Global)
        }
        return
    })

    //
    // Viewer tests
    //
    runTestWithFixture('fixture001', 'basic build and view', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
        await viewPdf()
        const results = await getViewerStatus(pdfFilePath)
        assert.ok(results.length > 0)
    })

    runTestWithFixture('fixture002', 'build a subfile and view it', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 's.pdf'
        const pdfFilePath = path.join(fixtureDir, 'sub', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
        await viewPdf()
        const results = await getViewerStatus(pdfFilePath)
        for (const result of results) {
            assert.strictEqual(result.pdfFileUri, vscode.Uri.file(pdfFilePath).toString(true))
        }
    }, () => isDockerEnabled())

    runTestWithFixture('fixture003', 'build main.tex and view it', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
        await viewPdf()
        const results = await getViewerStatus(pdfFilePath)
        for (const result of results) {
            assert.strictEqual(result.pdfFileUri, vscode.Uri.file(pdfFilePath).toString(true))
        }
    })

    runTestWithFixture('fixture004', 'build main.tex, choose it in QuickPick, and view it', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await waitLatexWorkshopActivated()
            await execCommandThenPick(
                () => executeVscodeCommandAfterActivation('latex-workshop.build'),
                () => vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            )
        })
        await sleep(1000)
        await execCommandThenPick(
            () => viewPdf(),
            () => vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
        )
        const results = await getViewerStatus(pdfFilePath)
        for (const result of results) {
            assert.strictEqual(result.pdfFileUri, vscode.Uri.file(pdfFilePath).toString(true))
        }
    })

    runTestWithFixture('fixture005', 'build s.tex, choose it in QuickPick, and view it', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 's.pdf'
        const pdfFilePath = path.join(fixtureDir, 'sub', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await waitLatexWorkshopActivated()
            await execCommandThenPick(
                () => executeVscodeCommandAfterActivation('latex-workshop.build'),
                async () => {
                    await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
                    await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
                    return undefined
                }
            )
        })
        await sleep(1000)
        await execCommandThenPick(
            () => viewPdf(),
            async () => {
                await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
                await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
                return undefined
            }
        )
        const results = await getViewerStatus(pdfFilePath)
        for (const result of results) {
            assert.strictEqual(result.pdfFileUri, vscode.Uri.file(pdfFilePath).toString(true))
        }
    }, () => isDockerEnabled())

    runTestWithFixture('fixture006', 'view a PDF file in outDir', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, 'out', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
        await viewPdf()
        const results = await getViewerStatus(pdfFilePath)
        assert.ok(results.length > 0)
    })

    runTestWithFixture('fixture020', 'basic build, view, and synctex', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
        await viewPdf()
        const firstResults = await getViewerStatus(pdfFilePath)
        for (const result of firstResults) {
            assert.ok( Math.abs(result.scrollTop) < 10 )
        }
        await vscode.window.showTextDocument(doc)
        const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One)
        await editor.insertSnippet(new vscode.SnippetString(' $0'), new vscode.Position(5, 0))
        const promise = promisify('pdfviewerstatuschanged')
        await vscode.commands.executeCommand('latex-workshop.synctex')
        await promise
        const secondResults = await getViewerStatus(pdfFilePath)
        for (const result of secondResults) {
            assert.ok( Math.abs(result.scrollTop) > 10 )
        }
    })

    runTestWithFixture('fixture021', 'basic build, view, and synctex with synctex.afterBuild.enabled', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.One)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
        await viewPdf()
        const firstResults = await getViewerStatus(pdfFilePath)
        for (const result of firstResults) {
            assert.ok( Math.abs(result.scrollTop) < 10 )
        }
        await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup')
        const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One)
        await editor.insertSnippet(new vscode.SnippetString(' $0'), new vscode.Position(5, 0))
        const promise = promisify('pdfviewerstatuschanged')
        await assertPdfIsGenerated(pdfFilePath, async () => {
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.One)
            await executeVscodeCommandAfterActivation('latex-workshop.build')

        })
        await promise
        await sleep(3000)
        const secondResults = await getViewerStatus(pdfFilePath)
        console.log(JSON.stringify(secondResults))
        for (const result of secondResults) {
            assert.ok( Math.abs(result.scrollTop) > 10 )
        }
    }, () => os.platform() === 'linux')

})
