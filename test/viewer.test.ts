import * as assert from 'assert'
// import * as os from 'os'
import * as path from 'path'
import * as process from 'process'
import * as vscode from 'vscode'
import {
    assertPdfIsGenerated,
    busyWait,
    getFixtureDir,
    isDockerEnabled,
    execCommandThenPick,
    executeVscodeCommandAfterActivation,
    runTestWithFixture,
    waitBuildFinish
} from './utils'
import {ViewerStatus} from '../src/components/viewer'

suite('Buid TeX files test suite', () => {

    suiteSetup(() => {
        if (process.env['LATEXWORKSHOP_CI_ENABLE_DOCKER']) {
            const dockerConfig = vscode.workspace.getConfiguration()
            dockerConfig.update('latex-workshop.docker.enabled', true, vscode.ConfigurationTarget.Global)
        }
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
        await waitBuildFinish()
        await vscode.commands.executeCommand('latex-workshop.view')
        const results = await busyWait(async () => {
            const rs = await vscode.commands.executeCommand('latex-workshop-dev.getViewerStatus', pdfFilePath) as ViewerStatus[]
            return rs.length > 0 ? rs : undefined
        })
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
        await waitBuildFinish()
        await vscode.commands.executeCommand('latex-workshop.view')
        const results = await busyWait(async () => {
            const rs = await vscode.commands.executeCommand('latex-workshop-dev.getViewerStatus', pdfFilePath) as ViewerStatus[]
            return rs.length > 0 ? rs : undefined
        })
        for (const result of results) {
            assert.strictEqual(result.path, pdfFilePath)
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
        await waitBuildFinish()
        await vscode.commands.executeCommand('latex-workshop.view')
        const results = await busyWait(async () => {
            const rs = await vscode.commands.executeCommand('latex-workshop-dev.getViewerStatus', pdfFilePath) as ViewerStatus[]
            return rs.length > 0 ? rs : undefined
        })
        for (const result of results) {
            assert.strictEqual(result.path, pdfFilePath)
        }
    })

    runTestWithFixture('fixture004', 'build main.tex and view it choosing it in QuickPick', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await execCommandThenPick(
                () => executeVscodeCommandAfterActivation('latex-workshop.build'),
                () => vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            )
        })
        await waitBuildFinish()
        await execCommandThenPick(
            () => vscode.commands.executeCommand('latex-workshop.view'),
            () => vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
        )
        const results = await busyWait(async () => {
            const rs = await vscode.commands.executeCommand('latex-workshop-dev.getViewerStatus', pdfFilePath) as ViewerStatus[]
            return rs.length > 0 ? rs : undefined
        })
        for (const result of results) {
            assert.strictEqual(result.path, pdfFilePath)
        }
    })

})
