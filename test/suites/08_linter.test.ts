import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import rimraf from 'rimraf'
import * as lw from '../../src/lw'
import { sleep, runTest, openActive, loadTestFile } from './utils'
import { ChkTeX } from '../../src/components/linterlib/chktex'
import { LaCheck } from '../../src/components/linterlib/lacheck'

suite('Linter test suite', () => {

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

        if (path.basename(fixture) === 'testground') {
            rimraf(fixture + '/{*,.vscode/*}', (e) => {if (e) {console.error(e)}})
            await sleep(500) // Required for pooling
        }
    })

    runTest({suiteName, fixtureName, testName: 'test chktex log parser'}, async () => {
        await loadTestFile(fixture, [
            {src: 'linter_base.tex', dst: 'main.tex'},
            {src: 'linter_sub.tex', dst: 'sub/s.tex'}
        ])
        await openActive(fixture, 'main.tex')
        const linter = new ChkTeX()
        const log = 'main.tex:5:18:1:Warning:24:Delete this space to maintain correct pagereferences.\nsub/s.tex:1:26:1:Warning:24:Delete this space to maintain correct pagereferences.\n'
        linter.parseLog(log)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'main.tex')))?.length, 1)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))?.length, 1)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'main.tex')))?.[0].message || '', /Delete this space/)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))?.[0].message || '', /Delete this space/)
    })

    runTest({suiteName, fixtureName, testName: 'test lacheck'}, async () => {
        await loadTestFile(fixture, [
            {src: 'linter_base.tex', dst: 'main.tex'},
            {src: 'linter_sub.tex', dst: 'sub/s.tex'}
        ])
        await openActive(fixture, 'main.tex')
        assert.ok(lw.manager.rootFile)
        const linter = new LaCheck()
        await linter.lintRootFile(lw.manager.rootFile)
        assert.strictEqual(linter.linterDiagnostics.name, 'LaCheck')
    })

    runTest({suiteName, fixtureName, testName: 'test lacheck log parser'}, async () => {
        await loadTestFile(fixture, [
            {src: 'linter_base.tex', dst: 'main.tex'},
            {src: 'linter_sub.tex', dst: 'sub/s.tex'}
        ])
        await openActive(fixture, 'main.tex')
        const linter = new LaCheck()
        const log = '"main.tex", line 7: double space at "~~"\n** sub/sub:\n"sub/s.tex", line 2: double space at "~~"\n'
        linter.parseLog(log)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'main.tex')))?.length, 1)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))?.length, 1)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'main.tex')))?.[0].message || '', /double space at/)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))?.[0].message || '', /double space at/)
    })
})
