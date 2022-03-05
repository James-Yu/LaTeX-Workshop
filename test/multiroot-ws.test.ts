import * as assert from 'assert'
import * as path from 'path'
import * as process from 'process'
import * as os from 'os'
import {sleep} from '../src/utils/utils'
import * as vscode from 'vscode'
import {
    assertPdfIsGenerated,
    executeVscodeCommandAfterActivation,
    getFixtureDir, isDockerEnabled, runTestWithFixture,
    waitGivenRootFile,
    waitLatexWorkshopActivated,
    waitRootFileFound
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

    runTestWithFixture('fixture003', 'basic build with forceRecipeUsage: true', async () => {
        const fixtureDir = getFixtureDir()
        const wsSubDir = 'A'
        const texFileName = 'A.tex'
        const pdfFileName = 'A.pdf'
        const pdfFilePath = path.join(fixtureDir, wsSubDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, wsSubDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture004', 'detect root with search.rootFiles.include', async () => {
        const fixtureDir = getFixtureDir()
        const wsSubDir = 'A'
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, wsSubDir, 'main', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, wsSubDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture005', 'detect root with search.rootFiles.exclude', async () => {
        const fixtureDir = getFixtureDir()
        const wsSubDir = 'A'
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, wsSubDir, 'main', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, wsSubDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    }, () => isDockerEnabled())

    //
    // Auto build tests
    //
    runTestWithFixture('fixture010', 'auto build with subfiles and onSave', async () => {
        const fixtureDir = getFixtureDir()
        const wsSubDir = 'A'
        const texFileName = 's.tex'
        const pdfFileName = 's.pdf'
        const pdfFilePath = path.join(fixtureDir, wsSubDir, 'sub', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, wsSubDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            const editor = await vscode.window.showTextDocument(doc)
            await waitLatexWorkshopActivated()
            await waitRootFileFound()
            await editor.edit((builder) => {
                builder.insert(new vscode.Position(2, 0), ' ')
            })
            await doc.save()
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture011', 'auto build main.tex when editing s.tex with onSave', async () => {
        const fixtureDir = getFixtureDir()
        const wsSubDir = 'A'
        const texFileName = 's.tex'
        const pdfFileName = 'A.pdf'
        const pdfFilePath = path.join(fixtureDir, wsSubDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, wsSubDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            const editor = await vscode.window.showTextDocument(doc)
            await waitLatexWorkshopActivated()
            await waitRootFileFound()
            await editor.edit((builder) => {
                builder.insert(new vscode.Position(2, 0), ' ')
            })
            await doc.save()
        })
    })

    runTestWithFixture('fixture012', 'automatically detect root', async () => {
        const fixtureDir = getFixtureDir()
        const wsSubDir = 'A'
        const texFileName = 's.tex'
        const pdfFileName = 'A.pdf'
        const pdfFilePath = path.join(fixtureDir, wsSubDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, wsSubDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })

    //
    // Test structure and file watcher
    //

    runTestWithFixture('fixture020', 'structure and file watcher', async () => {
        const fixtureDir = getFixtureDir()
        const texFileNameA = 'A.tex'
        const texFileNameB = 'B.tex'
        const texFilePathA = vscode.Uri.file(path.join(fixtureDir, 'A', texFileNameA))
        const texFilePathB = vscode.Uri.file(path.join(fixtureDir, 'B', texFileNameB))
        const docA = await vscode.workspace.openTextDocument(texFilePathA)
        await vscode.window.showTextDocument(docA)
        const extension = await waitLatexWorkshopActivated()
        await waitGivenRootFile(docA.fileName)
        await sleep(1000)
        const docB = await vscode.workspace.openTextDocument(texFilePathB)
        await vscode.window.showTextDocument(docB)
        await waitGivenRootFile(docB.fileName)
        await sleep(1000)
        await vscode.window.showTextDocument(docA)
        await waitGivenRootFile(docA.fileName)
        await sleep(1000)

        const structure = extension.exports.realExtension?.structureProvider.ds
        const filesWatched = extension.exports.realExtension?.manager.getFilesWatched()
        const isStructureOK = structure && structure.length > 0 && structure[0].fileName === docA.fileName
        const isWatcherOK = filesWatched && filesWatched.length === 1 && filesWatched[0] === docA.fileName
        assert.ok(isStructureOK, JSON.stringify(structure))
        assert.ok(isWatcherOK, JSON.stringify(filesWatched))
    }, () => os.platform() === 'win32')

})
