import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'
import * as vscode from 'vscode'
// import * as myExtension from '../../extension';

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

async function assertPdfIsGenerated(pdfFilePath: string, cb: () => Promise<void>) {
    if (fs.existsSync(pdfFilePath)) {
        fs.unlinkSync(pdfFilePath)
    }
    await cb()
    for (let i = 0; i < 50; i++) {
        if (fs.existsSync(pdfFilePath)) {
            assert.ok(true, 'PDF file generated.')
            return
        }
        await sleep(100)
    }
    assert.fail('Timeout Error: PDF file not generated.')
}

suite('Buid TeX files test suite', () => {
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

    runTestWithFixture('fixture003', 'fixture003: build when Docker enabled', async () => {
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
    }, () => process.platform !== 'linux')
})
