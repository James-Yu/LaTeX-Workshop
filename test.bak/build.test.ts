import * as path from 'path'
import * as process from 'process'
import * as vscode from 'vscode'
import * as os from 'os'
import {
    assertPdfIsGenerated,
    executeVscodeCommandAfterActivation,
    execCommandThenPick,
    getFixtureDir,
    isDockerEnabled,
    runTestWithFixture,
    waitLatexWorkshopActivated
} from './utils/ciutils'

suite('Build TeX files test suite', () => {

    suiteSetup(() => {
        const config = vscode.workspace.getConfiguration()
        if (process.env['LATEXWORKSHOP_CI_ENABLE_DOCKER']) {
            return config.update('latex-workshop.docker.enabled', true, vscode.ConfigurationTarget.Global)
        }
        return
    })

    //
    // Basic build tests
    //

    //
    // Magic comment tests
    //

    //
    // Auto build tests
    //

    //
    // Multi-file project build tests
    //

    runTestWithFixture('fixture053', 'build a subfile when main.tex opened', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 's.pdf'
        const pdfFilePath = path.join(fixtureDir, 'sub', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const mainTexFilePath = vscode.Uri.file(path.join(fixtureDir, 'main.tex'))
            const mainDoc = await vscode.workspace.openTextDocument(mainTexFilePath)
            await vscode.window.showTextDocument(mainDoc)
            const subTexFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(subTexFilePath)
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture059', 'build main.tex choosing it in QuickPick', async () => {
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
                () => vscode.commands.executeCommand('latex-workshop.build'),
                () => vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            )
        })
    })

    runTestWithFixture('fixture05a', 'build s.tex choosing it in QuickPick', async () => {
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
                () => vscode.commands.executeCommand('latex-workshop.build'),
                async () => {
                    await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
                    await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
                    return undefined
                }
            )
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture05b', 'build a subfile with extra input file', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 's.pdf'
        const pdfFilePath = path.join(fixtureDir, 'sub', 'out', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    }, () => isDockerEnabled())

    //
    // Build with makeindex
    //
    runTestWithFixture('fixture060', 'basic build with makeindex', async () => {
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
    })

    //
    // Recipe tests
    //
    runTestWithFixture('fixture100', 'test q/.../ on Windows', async () => {
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
    }, () => os.platform() !== 'win32')

    runTestWithFixture('fixture101', 'test q/.../ with spaces in outdir on Windows', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, 'out dir', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    }, () => os.platform() !== 'win32')

    runTestWithFixture('fixture102', 'test copy on Windows', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 'b.pdf'
        const pdfFilePath = path.join(fixtureDir, 'out dir', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    }, () => os.platform() !== 'win32')

})
