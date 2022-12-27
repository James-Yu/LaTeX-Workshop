import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import rimraf from 'rimraf'
import * as assert from 'assert'

import { Extension, activate } from '../../src/main'
import { assertBuild, runTest, writeTest } from './utils'

suite('Build TeX files test suite', () => {

    let extension: Extension | undefined
    const suiteName = path.basename(__filename).replace('.test.js', '')
    let testground = path.resolve(__dirname, '../../../test/fixtures/testground')

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        extension = vscode.extensions.getExtension<ReturnType<typeof activate>>('James-Yu.latex-workshop')?.exports.extension
        assert.ok(extension)
        testground = path.resolve(extension.extensionRoot, 'test/fixtures/testground')
    })

    setup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
    })

    teardown(async () => {
        if (path.basename(testground) === 'testground') {
            rimraf(testground + '/*', (e) => {if (e) {console.error(e)}})
            fs.closeSync(fs.openSync(testground + '/.gitkeep', 'a'))
        }
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.recipes', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.build.forceRecipeUsage', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.exclude', undefined)
    })

    function writeMainTeX() {
        writeTest({fixture: testground, fileName: 'main.tex'}, '\\documentclass{article}', '\\begin{document}', 'abc', '\\end{document}')
    }

    function writeSubFileTeX() {
        writeTest({fixture: testground, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{subfiles}', '\\begin{document}', 'main main', '\\subfile{sub/s}', '\\end{document}')
        writeTest({fixture: testground, fileName: 'sub/s.tex'}, '\\documentclass[../main.tex]{subfiles}', '\\begin{document}', 'sub sub', '\\end{document}')
    }

    runTest({suiteName, fixtureName: 'testground', testName: 'build'}, async () => {
        writeMainTeX()
        await assertBuild({fixture: testground, texFileName: 'main.tex', pdfFileName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'testground', testName: 'build with subfiles'}, async () => {
        writeSubFileTeX()
        await assertBuild({fixture: testground, texFileName: 'main.tex', pdfFileName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'testground', testName: 'same placeholders multiple times'}, async () => {
        const tools = [{name: 'latexmk', command: 'latexmk', args: ['-synctex=1', '-interaction=nonstopmode', '-file-line-error', '-pdf', '%DOC%', '%DOC%', '%DOC%']}]
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', tools)

        writeMainTeX()
        await assertBuild({fixture: testground, texFileName: 'main.tex', pdfFileName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'testground', testName: 'auto-detect subfile root 1'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', true)
        writeSubFileTeX()
        await assertBuild({fixture: testground, texFileName: 'sub/s.tex', pdfFileName: 'sub/s.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'testground', testName: 'auto-detect subfile root 2'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        writeSubFileTeX()
        await assertBuild({fixture: testground, texFileName: 'sub/s.tex', pdfFileName: 'main.pdf', extension})
    })
})
