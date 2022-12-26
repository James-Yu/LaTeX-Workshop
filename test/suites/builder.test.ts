import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as assert from 'assert'
import glob from 'glob'

import { Extension, activate } from '../../src/main'
import { runTest } from './utils'

async function assertBuild(fixture: string, texFileName: string, pdfFileName: string) {
    const texFilePath = vscode.Uri.file(path.join(fixture, texFileName))
    const pdfFilePath = path.join(fixture, pdfFileName)
    const doc = await vscode.workspace.openTextDocument(texFilePath)
    await vscode.window.showTextDocument(doc)
    await vscode.commands.executeCommand('latex-workshop.build')
    assert.ok(fs.existsSync(pdfFilePath))
    fs.unlinkSync(pdfFilePath)
    for (const ext of ['aux', 'fdb_latexmk', 'fls', 'log', 'synctex.gz']) {
        glob(`**/**.${ext}`, { cwd: fixture }, (_, files) => files.forEach(file => {
            if (!fs.existsSync(path.resolve(fixture, file))) {
                return
            }
            fs.unlinkSync(path.resolve(fixture, file))
        }))
    }
}

suite('Build TeX files test suite', () => {

    let extension: Extension | undefined
    const suiteName = path.basename(__filename).replace('.test.js', '')

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        extension = vscode.extensions.getExtension<ReturnType<typeof activate>>('James-Yu.latex-workshop')?.exports.extension
        assert.ok(extension)
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', undefined)
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build'}, async (fixture: string) => {
        await assertBuild(fixture, 'main_001.tex', 'main_001.pdf')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build with subfiles'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await assertBuild(fixture, 'main_002.tex', 'main_002.pdf')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'same placeholders multiple times'}, async (fixture: string) => {
        const tools = [{
            'name': 'latexmk',
            'command': 'latexmk',
            'args': [
                '-synctex=1',
                '-interaction=nonstopmode',
                '-file-line-error',
                '-pdf',
                '%DOC%',
                '%DOC%',
                '%DOC%'
            ]
        }]
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', tools)
        await assertBuild(fixture, 'main_001.tex', 'main_001.pdf')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto-detect subfile root 1'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', true)
        await assertBuild(fixture, 'sub_002/sub_002.tex', 'sub_002/sub_002.pdf')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto-detect subfile root 2'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await assertBuild(fixture, 'sub_002/sub_002.tex', 'main_002.pdf')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build with outDir'}, async (fixture: string) => {
        const tools = [{
            'name': 'latexmk',
            'command': 'latexmk',
            'args': [
                '-synctex=1',
                '-interaction=nonstopmode',
                '-file-line-error',
                '-pdf',
                '-outdir=out',
                '%DOC%'
            ]
        }]
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', tools)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', './out')
        await assertBuild(fixture, 'main_001.tex', 'out/main_001.pdf')
    })
})
