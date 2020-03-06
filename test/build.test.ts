import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'
import * as vscode from 'vscode'

function getFixtureDir() {
    const fixtureDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath
    if (fixtureDir) {
        return fixtureDir
    } else {
        assert.fail('fixtureDir is undefined.')
    }
}

function runTestWithFixture(
    fixtureName: string,
    label: string,
    cb: () => Promise<void>,
    skip?: () => boolean
) {
    const rootPath = vscode.workspace.workspaceFolders?.[0]
    const shouldSkip = skip && skip()
    if (rootPath && path.basename(rootPath.uri.fsPath) === fixtureName && !shouldSkip) {
        test(label, cb)
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function outputLogMessages() {
    await vscode.commands.executeCommand('latex-workshop.log')
    await sleep(1000)
    await vscode.commands.executeCommand('workbench.action.output.toggleOutput')
    await sleep(1000)
    const logMessage = vscode.window.activeTextEditor?.document.getText()
    console.log(logMessage)
    await vscode.commands.executeCommand('latex-workshop.log', true)
    await sleep(1000)
    const compilerLogMessage = vscode.window.activeTextEditor?.document.getText()
    console.log(compilerLogMessage)
}

async function assertPdfIsGenerated(pdfFilePath: string, cb: () => Promise<void>) {
    if (fs.existsSync(pdfFilePath)) {
        fs.unlinkSync(pdfFilePath)
    }
    await cb()
    for (let i = 0; i < 150; i++) {
        if (fs.existsSync(pdfFilePath)) {
            assert.ok(true, 'PDF file generated.')
            return
        }
        await sleep(100)
    }
    await outputLogMessages()
    assert.fail('Timeout Error: PDF file not generated.')
}

function isDockerEnabled() {
    return process.env['LATEXWORKSHOP_CI_ENABLE_DOCKER'] ? true : false
}

suite('Buid TeX files test suite', () => {

    suiteSetup(() => {
        if (process.env['LATEXWORKSHOP_CI_ENABLE_DOCKER']) {
            const dockerConfig = vscode.workspace.getConfiguration()
            dockerConfig.update('latex-workshop.docker.enabled', true, vscode.ConfigurationTarget.Global)
        }
    })

    //
    // Basic build tests
    //
    runTestWithFixture('fixture001', 'fixture001: basic build', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture002', 'fixture002: build with subfiles', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 'main.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture003', 'fixture003: the same multiple placeholders in a recipe', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture004', 'fixture004: automatically detect root', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await sleep(5000)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    })

    //
    // Magic comment tests
    //
    runTestWithFixture('fixture020', 'fixture020: build with magic comment', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    }, () => isDockerEnabled())

    runTestWithFixture('fixture021', 'fixture021: build with !TEX program and !TEX options', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture022', 'fixture022: build with !TEX root', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'z.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    })

    runTestWithFixture('fixture023', 'fixture023: build with invalid !TEX program', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            await vscode.window.showTextDocument(doc)
            await vscode.commands.executeCommand('latex-workshop.build')
        })
    })

    //
    // Auto build tests
    //
    runTestWithFixture('fixture030', 'fixture030: auto build', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const pdfFileName = 't.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            const editor = await vscode.window.showTextDocument(doc)
            await editor.edit((builder) => {
                builder.insert(new vscode.Position(0, 0), ' ')
            })
            await doc.save()
        })
    })

    runTestWithFixture('fixture031', 'fixture031: auto build with subfiles', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 's.pdf'
        const pdfFilePath = path.join(fixtureDir, 'sub', pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            const editor = await vscode.window.showTextDocument(doc)
            await sleep(5000)
            await editor.edit((builder) => {
                builder.insert(new vscode.Position(2, 0), ' ')
            })
            await doc.save()
        })
    })

    runTestWithFixture('fixture032', 'fixture032: auto build with input', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 's.tex'
        const pdfFileName = 'main.pdf'
        const pdfFilePath = path.join(fixtureDir, pdfFileName)
        await assertPdfIsGenerated(pdfFilePath, async () => {
            const texFilePath = vscode.Uri.file(path.join(fixtureDir, 'sub', texFileName))
            const doc = await vscode.workspace.openTextDocument(texFilePath)
            const editor = await vscode.window.showTextDocument(doc)
            await sleep(5000)
            await editor.edit((builder) => {
                builder.insert(new vscode.Position(1, 0), ' ')
            })
            await doc.save()
        })
    })

})
