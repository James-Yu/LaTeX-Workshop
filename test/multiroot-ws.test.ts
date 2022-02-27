import * as path from 'path'
import * as process from 'process'
import * as vscode from 'vscode'
import {
    assertPdfIsGenerated,
    executeVscodeCommandAfterActivation,
    getFixtureDir,
    runTestWithFixture,
} from './utils'


suite('Multi-root workspace test suite', () => {

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
    runTestWithFixture('fixture001', 'basic build with default recipe name', async () => {
        const fixtureDir = getFixtureDir()
        const wsSubDir = 'A'
        const texFileName = 'A.tex'
        const pdfFileName = 'wsA.pdf'
        const pdfFilePath = path.join(fixtureDir, wsSubDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, wsSubDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture002', 'basic build with outDir', async () => {
        const fixtureDir = getFixtureDir()
        const outDir = 'out'
        const wsSubDir = 'A'
        const texFileName = 'A.tex'
        const pdfFileName = 'A.pdf'
        const pdfFilePath = path.join(fixtureDir, wsSubDir, outDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, wsSubDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })
})
