import * as assert from 'assert'
// import * as os from 'os'
import * as path from 'path'
import * as process from 'process'
import * as vscode from 'vscode'
import {
    assertPdfIsGenerated,
    waitUntil,
    getFixtureDir,
    isDockerEnabled,
    execCommandThenPick,
    executeVscodeCommandAfterActivation,
    runTestWithFixture,
    waitBuildFinish
} from './utils'
import {ViewerStatus} from '../src/components/viewer'
import { sleep } from '../src/utils/utils'

suite('Buid TeX files test suite', () => {

    suiteSetup(() => {
        const config = vscode.workspace.getConfiguration()
        if (process.env['LATEXWORKSHOP_CI_ENABLE_DOCKER']) {
            config.update('latex-workshop.docker.enabled', true, vscode.ConfigurationTarget.Global)
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
        const results = await waitUntil(async () => {
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
        const results = await waitUntil(async () => {
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
        const results = await waitUntil(async () => {
            const rs = await vscode.commands.executeCommand('latex-workshop-dev.getViewerStatus', pdfFilePath) as ViewerStatus[]
            return rs.length > 0 ? rs : undefined
        })
        for (const result of results) {
            assert.strictEqual(result.path, pdfFilePath)
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
        const results = await waitUntil(async () => {
            const rs = await vscode.commands.executeCommand('latex-workshop-dev.getViewerStatus', pdfFilePath) as ViewerStatus[]
            return rs.length > 0 ? rs : undefined
        })
        for (const result of results) {
            assert.strictEqual(result.path, pdfFilePath)
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
            await execCommandThenPick(
                () => executeVscodeCommandAfterActivation('latex-workshop.build'),
                async () => {
                    await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
                    await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
                }
            )
        })
        await waitBuildFinish()
        await execCommandThenPick(
            () => vscode.commands.executeCommand('latex-workshop.view'),
            async () => {
                await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
                await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            }
        )
        const results = await waitUntil(async () => {
            const rs = await vscode.commands.executeCommand('latex-workshop-dev.getViewerStatus', pdfFilePath) as ViewerStatus[]
            return rs.length > 0 ? rs : undefined
        })
        for (const result of results) {
            assert.strictEqual(result.path, pdfFilePath)
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
        await waitBuildFinish()
        await vscode.commands.executeCommand('latex-workshop.view')
        const results = await waitUntil(async () => {
            const rs = await vscode.commands.executeCommand('latex-workshop-dev.getViewerStatus', pdfFilePath) as ViewerStatus[]
            return rs.length > 0 ? rs : undefined
        })
        assert.ok(results.length > 0)
    })

    runTestWithFixture('fixture020', 'basic build, view, and synctex', async () => {
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
        const firstResults = await waitUntil(async () => {
            const rs = await vscode.commands.executeCommand('latex-workshop-dev.getViewerStatus', pdfFilePath) as ViewerStatus[]
            return rs.length > 0 ? rs : undefined
        })
        for (const result of firstResults) {
            assert.ok( Math.abs(result.scrollTop) < 10 )
        }
        await vscode.commands.executeCommand('cursorDown')
        await vscode.commands.executeCommand('cursorDown')
        await vscode.commands.executeCommand('cursorDown')
        await vscode.commands.executeCommand('cursorDown')
        await vscode.commands.executeCommand('cursorDown')
        await vscode.commands.executeCommand('latex-workshop.synctex')
        await sleep(6000)
        const secondResults = await waitUntil(async () => {
            const rs = await vscode.commands.executeCommand('latex-workshop-dev.getViewerStatus', pdfFilePath) as ViewerStatus[]
            return rs.length > 0 ? rs : undefined
        })
        for (const result of secondResults) {
            assert.ok( Math.abs(result.scrollTop) > 10 )
        }
    })

    runTestWithFixture('fixture021', 'basic build, view, and synctex with synctex.afterBuild.enabled', async () => {
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
        const firstResults = await waitUntil(async () => {
            const rs = await vscode.commands.executeCommand('latex-workshop-dev.getViewerStatus', pdfFilePath) as ViewerStatus[]
            return rs.length > 0 ? rs : undefined
        })
        for (const result of firstResults) {
            assert.ok( Math.abs(result.scrollTop) < 10 )
        }
        await vscode.commands.executeCommand('cursorDown')
        await vscode.commands.executeCommand('cursorDown')
        await vscode.commands.executeCommand('cursorDown')
        await vscode.commands.executeCommand('cursorDown')
        await vscode.commands.executeCommand('cursorDown')
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
        await waitBuildFinish()
        await sleep(6000)
        const secondResults = await waitUntil(async () => {
            const rs = await vscode.commands.executeCommand('latex-workshop-dev.getViewerStatus', pdfFilePath) as ViewerStatus[]
            return rs.length > 0 ? rs : undefined
        })
        for (const result of secondResults) {
            assert.ok( Math.abs(result.scrollTop) > 10 )
        }
    })
})
