import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import rimraf from 'rimraf'
import * as lw from '../../src/lw'
import { sleep, runTest, openActive, loadTestFile } from './utils'

suite('Formatter test suite', () => {

    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/testground')
    const fixtureName = 'testground'

    suiteSetup(() => {
        fixture = path.resolve(lw.extensionRoot, 'test/fixtures/testground')
    })

    setup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        lw.manager.rootFile = undefined

        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.path', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.args', undefined)

        if (path.basename(fixture) === 'testground') {
            rimraf(fixture + '/{*,.vscode/*}', (e) => {if (e) {console.error(e)}})
            await sleep(500) // Required for pooling
        }
    })

    runTest(suiteName, fixtureName, 'test latex formatter', async () => {
        await loadTestFile(fixture, [
            {src: 'formatter/latex_base.tex', dst: 'main.tex'}
        ])
        await openActive(fixture, 'main.tex')
        const original = vscode.window.activeTextEditor?.document.getText()
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await sleep(1000)
        const formatted = vscode.window.activeTextEditor?.document.getText()
        assert.notStrictEqual(original, formatted)
    })

    runTest(suiteName, fixtureName, 'change latexindent.path on the fly', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.path', 'echo')
        await loadTestFile(fixture, [
            {src: 'formatter/latex_base.tex', dst: 'main.tex'}
        ])
        await openActive(fixture, 'main.tex')
        const original = vscode.window.activeTextEditor?.document.getText()
        // echo add a new \n to the end of stdin
        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.args', [original?.slice(0, -1)])
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await sleep(1000) // wait for formatter finish
        const echoed = vscode.window.activeTextEditor?.document.getText()
        assert.strictEqual(original, echoed)

        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.path', 'latexindent')
        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.args', ['-c', '%DIR%/', '%TMPFILE%', '-y=defaultIndent: \'%INDENT%\''])
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await sleep(1000) // wait for formatter finish
        const formatted = vscode.window.activeTextEditor?.document.getText()
        assert.notStrictEqual(original, formatted)
    })
})
