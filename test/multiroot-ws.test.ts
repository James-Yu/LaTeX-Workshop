import * as assert from 'assert'
import * as path from 'path'
import * as process from 'process'
import * as fs from 'fs'
import * as os from 'os'
import {sleep} from '../src/utils/utils'
import {activate} from '../src/main'
import * as vscode from 'vscode'
import {
    assertPdfIsGenerated,
    executeVscodeCommandAfterActivation,
    getFixtureDir, isDockerEnabled, runTestWithFixture,
    waitGivenRootFile,
    waitLatexWorkshopActivated,
    promisify
} from './utils/ciutils'

function getCompletionItems(extension: vscode.Extension<ReturnType<typeof activate>>, doc: vscode.TextDocument, pos: vscode.Position): vscode.CompletionItem[] | undefined {
    const token = new vscode.CancellationTokenSource().token
    return extension.exports.realExtension?.completer.provideCompletionItems?.(
        doc, pos, token,
        {
            triggerKind: vscode.CompletionTriggerKind.Invoke,
            triggerCharacter: undefined
        }
    )
}

function assertCompletionLabelsEqual(items: vscode.CompletionItem[] | undefined, labels: string[]) {
    assert.ok(items !== undefined, 'Undefined completionItems')
    assert.strictEqual(items.length, labels.length, 'Completion array has wrong length')
    for(let i = 0; i<items.length; i++) {
        assert.strictEqual(items[i].label, labels[i], 'Wrong label')
    }
}

function assertCompletionFilterTextContains(items: vscode.CompletionItem[] | undefined, filterTexts: string[]) {
    assert.ok(items !== undefined, 'Undefined completionItems')
    assert.strictEqual(items.length, filterTexts.length, 'Completion array has wrong length')
    for(let i = 0; i<items.length; i++) {
        assert.ok(items[i].filterText && items[i].filterText?.includes(filterTexts[i]), `Wrong filterText: \n${items[i].filterText}\n${filterTexts[i]}`)
    }
}


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
            await promisify('findrootfileend')
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
            await promisify('findrootfileend')
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

        const structure = extension.exports.realExtension?.structureViewer.getTreeData()
        const filesWatched = extension.exports.realExtension?.manager.getFilesWatched()
        const isStructureOK = structure && structure.length > 0 && structure[0].fileName === docA.fileName
        const isWatcherOK = filesWatched && filesWatched.length === 1 && filesWatched[0] === docA.fileName
        assert.ok(isStructureOK, JSON.stringify(structure))
        assert.ok(isWatcherOK, JSON.stringify(filesWatched))
    }, () => os.platform() === 'win32')

    //
    // Recipe name
    //
    runTestWithFixture('fixture030', 'basic build with recipes and default recipe name defined in subdir', async () => {
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

    runTestWithFixture('fixture031', 'basic build with recipes defined in subdir and lastUsed', async () => {
        const fixtureDir = getFixtureDir()
        const wsSubDir = 'A'
        const texFileName = 'A.tex'
        const pdfFileName = 'wsA.pdf'
        const pdfFilePath = path.join(fixtureDir, wsSubDir, pdfFileName)
        const texFilePath = vscode.Uri.file(path.join(fixtureDir, wsSubDir, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        await vscode.window.showTextDocument(doc)
        await waitLatexWorkshopActivated()
        await sleep(1000)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            await vscode.commands.executeCommand('latex-workshop.recipes', 'latexmk A')
        })
        fs.unlinkSync(pdfFilePath)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture032', 'basic build with lastUsed and switching rootFile', async () => {
        const fixtureDir = getFixtureDir()
        const texFileNameA = 'A.tex'
        const texFileNameB = 'B.tex'
        const texFilePathA = vscode.Uri.file(path.join(fixtureDir, 'A', texFileNameA))
        const texFilePathB = vscode.Uri.file(path.join(fixtureDir, 'B', texFileNameB))
        const pdfFileName = 'wsA.pdf'
        const pdfFilePath = path.join(fixtureDir, 'A', pdfFileName)
        const docA = await vscode.workspace.openTextDocument(texFilePathA)

        // Open A.tex and build
        await vscode.window.showTextDocument(docA)
        await waitLatexWorkshopActivated()
        await waitGivenRootFile(docA.fileName)
        await sleep(1000)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            await vscode.commands.executeCommand('latex-workshop.recipes', 'latexmk A')
        })
        fs.unlinkSync(pdfFilePath)

        // Switch to B.tex
        const docB = await vscode.workspace.openTextDocument(texFilePathB)
        await vscode.window.showTextDocument(docB)
        await waitGivenRootFile(docB.fileName)
        await sleep(1000)

        // Switch back to A.tex and build
        await vscode.window.showTextDocument(docA)
        await waitGivenRootFile(docA.fileName)
        await sleep(1000)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            await executeVscodeCommandAfterActivation('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture040', 'citation intellisense', async () => {
        const fixtureDir = getFixtureDir()
        const texFileNameA = 'A.tex'
        const texFileNameB = 'B.tex'
        const texFilePathA = vscode.Uri.file(path.join(fixtureDir, 'A', texFileNameA))
        const texFilePathB = vscode.Uri.file(path.join(fixtureDir, 'B', texFileNameB))
        const docA = await vscode.workspace.openTextDocument(texFilePathA)
        const pos = new vscode.Position(3,10)
        const descriptions = [
            'hintFake',
            'hintLaTex',
            'hintRubi'
        ]

        // Open A.tex and trigger citation completion
        await vscode.window.showTextDocument(docA)
        const extension = await waitLatexWorkshopActivated()
        await waitGivenRootFile(docA.fileName)
        await sleep(3000)
        const itemsA = getCompletionItems(extension, docA, pos)
        const expectedLabelsA = [
            'A fake article',
            'LATEX: A Document Preparation System : User\'s Guide and Reference Manual',
            'Discrete event systems'
        ]
        assertCompletionLabelsEqual(itemsA, expectedLabelsA)
        assertCompletionFilterTextContains(itemsA, descriptions)

        // Switch to B.tex and trigger citation completion
        const docB = await vscode.workspace.openTextDocument(texFilePathB)
        await vscode.window.showTextDocument(docB)
        await waitGivenRootFile(docB.fileName)
        await sleep(3000)
        const itemsB = getCompletionItems(extension, docB, pos)
        const expectedLabelsB = [
            'art1',
            'lamport1994latex',
            'MR1241645'
        ]
        assertCompletionLabelsEqual(itemsB, expectedLabelsB)
        assertCompletionFilterTextContains(itemsB, descriptions)
    })

})
