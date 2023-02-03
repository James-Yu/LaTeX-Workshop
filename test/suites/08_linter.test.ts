import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import * as lw from '../../src/lw'
import * as test from './utils'
import { ChkTeX } from '../../src/components/linterlib/chktex'
import { LaCheck } from '../../src/components/linterlib/lacheck'

suite('Linter test suite', () => {

    const suiteName = path.basename(__filename).replace('.test.js', '')
    const fixtureName = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
    })

    teardown(async () => {
        await test.reset()
    })

    test.run(suiteName, fixtureName, 'test chktex', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'linter_base.tex', dst: 'main.tex'},
            {src: 'linter_sub.tex', dst: 'sub/s.tex'}
        ], {skipCache: true})
        const linter = new ChkTeX()
        await linter.lintRootFile(lw.manager.rootFile ?? '')
        assert.strictEqual(linter.linterDiagnostics.name, 'ChkTeX')
    })

    test.run(suiteName, fixtureName, 'test chktex log parser', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'linter_base.tex', dst: 'main.tex'},
            {src: 'linter_sub.tex', dst: 'sub/s.tex'}
        ], {skipCache: true})
        const linter = new ChkTeX()
        const log = 'main.tex:5:18:1:Warning:24:Delete this space to maintain correct pagereferences.\nsub/s.tex:1:26:1:Warning:24:Delete this space to maintain correct pagereferences.\n'
        linter.parseLog(log)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'main.tex')))?.length, 1)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))?.length, 1)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'main.tex')))?.[0].message || '', /Delete this space/)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))?.[0].message || '', /Delete this space/)
    })

    test.run(suiteName, fixtureName, 'test lacheck', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'linter_base.tex', dst: 'main.tex'},
            {src: 'linter_sub.tex', dst: 'sub/s.tex'}
        ], {skipCache: true})
        const linter = new LaCheck()
        await linter.lintRootFile(lw.manager.rootFile ?? '')
        assert.strictEqual(linter.linterDiagnostics.name, 'LaCheck')
    })

    test.run(suiteName, fixtureName, 'test lacheck log parser', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'linter_base.tex', dst: 'main.tex'},
            {src: 'linter_sub.tex', dst: 'sub/s.tex'}
        ], {skipCache: true})
        const linter = new LaCheck()
        const log = '"main.tex", line 7: double space at "~~"\n** sub/sub:\n"sub/s.tex", line 2: double space at "~~"\n'
        linter.parseLog(log)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'main.tex')))?.length, 1)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))?.length, 1)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'main.tex')))?.[0].message || '', /double space at/)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))?.[0].message || '', /double space at/)
    })
})
