import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import glob from 'glob'
import * as assert from 'assert'

import { Extension, activate } from '../../src/main'
import { assertBuild, getViewerStatus, runTest, sleep, waitBuild, waitViewer, waitViewerChange } from './utils'


suite('PDF Viewer test suite', () => {

    let extension: Extension | undefined
    const suiteName = path.basename(__filename).replace('.test.js', '')

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        extension = vscode.extensions.getExtension<ReturnType<typeof activate>>('James-Yu.latex-workshop')?.exports.extension
        assert.ok(extension)
    })

    teardown(async () => {
        const fixture = vscode.workspace.workspaceFolders?.[0].uri.path
        if (fixture) {
            glob.sync('**/**.pdf', { cwd: fixture }).forEach(file => {
                if (!fs.existsSync(path.resolve(fixture, file))) {
                    return
                }
                fs.unlinkSync(path.resolve(fixture, file))
            })
        }
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.view.pdf.viewer', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.synctex.afterBuild.enabled', undefined)
        await sleep(500)
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'basic build and view'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_001.tex'])
        await vscode.workspace.getConfiguration().update('latex-workshop.view.pdf.viewer', 'tab')
        await assertBuild({fixture, texFileName: 'main_001.tex', pdfFileName: 'main_001.pdf', extension})
        await sleep(1000)
        await vscode.commands.executeCommand('latex-workshop.view')
        await waitViewer(extension)
        await sleep(500)
        const pdf = path.join(fixture, 'main_001.pdf')
        const results = getViewerStatus(pdf, extension)
        assert.ok(results.length > 0)
        for (const result of results) {
            assert.strictEqual(result.pdfFileUri, vscode.Uri.file(pdf).toString(true))
        }
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build a subfile and view it'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_002.tex', 'sub_002/sub_002.tex'])
        await vscode.workspace.getConfiguration().update('latex-workshop.view.pdf.viewer', 'tab')
        await assertBuild({fixture, texFileName: 'sub_002/sub_002.tex', pdfFileName: 'sub_002/sub_002.pdf', extension})
        await sleep(1000)
        await vscode.commands.executeCommand('latex-workshop.view')
        await waitViewer(extension)
        await sleep(500)
        const pdf = path.join(fixture, 'sub_002/sub_002.pdf')
        const results = getViewerStatus(pdf, extension)
        assert.ok(results.length > 0)
        for (const result of results) {
            assert.strictEqual(result.pdfFileUri, vscode.Uri.file(pdf).toString(true))
        }
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build main.tex and view it'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_002.tex', 'sub_002/sub_002.tex'])
        await vscode.workspace.getConfiguration().update('latex-workshop.view.pdf.viewer', 'tab')
        await assertBuild({fixture, texFileName: 'sub_002/sub_002.tex', pdfFileName: 'main_002.pdf', extension})
        await sleep(1000)
        await vscode.commands.executeCommand('latex-workshop.view')
        await waitViewer(extension)
        await sleep(500)
        const pdf = path.join(fixture, 'main_002.pdf')
        const results = getViewerStatus(pdf, extension)
        assert.ok(results.length > 0)
        for (const result of results) {
            assert.strictEqual(result.pdfFileUri, vscode.Uri.file(pdf).toString(true))
        }
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build main.tex, choose it in QuickPick, and view it'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', false)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_002.tex', 'sub_002/sub_002.tex'])
        await vscode.workspace.getConfiguration().update('latex-workshop.view.pdf.viewer', 'tab')
        await assertBuild({fixture, texFileName: 'sub_002/sub_002.tex', pdfFileName: 'main_002.pdf', extension, build: async () => {
            void vscode.commands.executeCommand('latex-workshop.build')
            await sleep(1000)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            await waitBuild(extension)
        }})
        await sleep(1000)
        void vscode.commands.executeCommand('latex-workshop.view')
        await sleep(1000)
        await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
        await waitViewer(extension)
        await sleep(500)
        const pdf = path.join(fixture, 'main_002.pdf')
        const results = getViewerStatus(pdf, extension)
        assert.ok(results.length > 0)
        for (const result of results) {
            assert.strictEqual(result.pdfFileUri, vscode.Uri.file(pdf).toString(true))
        }
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build s.tex, choose it in QuickPick, and view it'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', false)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_002.tex', 'sub_002/sub_002.tex'])
        await vscode.workspace.getConfiguration().update('latex-workshop.view.pdf.viewer', 'tab')
        await assertBuild({fixture, texFileName: 'sub_002/sub_002.tex', pdfFileName: 'sub_002/sub_002.pdf', extension, build: async () => {
            void vscode.commands.executeCommand('latex-workshop.build')
            await sleep(1000)
            await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
            await sleep(500)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            await waitBuild(extension)
        }})
        await sleep(1000)
        void vscode.commands.executeCommand('latex-workshop.view')
        await sleep(1000)
        await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
        await sleep(500)
        await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
        await waitViewer(extension)
        await sleep(500)
        const pdf = path.join(fixture, 'sub_002/sub_002.pdf')
        const results = getViewerStatus(pdf, extension)
        assert.ok(results.length > 0)
        for (const result of results) {
            assert.strictEqual(result.pdfFileUri, vscode.Uri.file(pdf).toString(true))
        }
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'view a PDF file in outDir'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_001.tex'])
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', './out')
        await vscode.workspace.getConfiguration().update('latex-workshop.view.pdf.viewer', 'tab')
        await assertBuild({fixture, texFileName: 'main_001.tex', pdfFileName: 'out/main_001.pdf', extension})
        await sleep(1000)
        await vscode.commands.executeCommand('latex-workshop.view')
        await waitViewer(extension)
        await sleep(500)
        const pdf = path.join(fixture, 'out/main_001.pdf')
        const results = getViewerStatus(pdf, extension)
        assert.ok(results.length > 0)
        for (const result of results) {
            assert.strictEqual(result.pdfFileUri, vscode.Uri.file(pdf).toString(true))
        }
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'basic build, view, and synctex'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_018.tex'])
        await vscode.workspace.getConfiguration().update('latex-workshop.view.pdf.viewer', 'tab')
        const texFilePath = vscode.Uri.file(path.join(fixture, 'main_018.tex'))
        const pdfFilePath = path.join(fixture, 'main_018.pdf')
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()
        await vscode.commands.executeCommand('latex-workshop.build')
        await sleep(1000)
        await vscode.commands.executeCommand('latex-workshop.view')
        await waitViewer(extension)
        await sleep(500)
        const results1 = getViewerStatus(pdfFilePath, extension)

        await vscode.window.showTextDocument(doc, vscode.ViewColumn.One)
        extension?.locator.syncTeX({line: 5, filePath: path.join(fixture, 'main_018.tex')})
        await waitViewerChange(extension)
        await sleep(500)
        const results2 = getViewerStatus(pdfFilePath, extension)

        for (const result of results1) {
            assert.ok( Math.abs(result.scrollTop) < 10 )
        }
        for (const result of results2) {
            assert.ok( Math.abs(result.scrollTop) > 10 )
        }
    })

})
