import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import { lw } from '../../src/lw'
import * as test from './utils'
import { chkTeX } from '../../src/lint/latex-linter/chktex'
import { laCheck } from '../../src/lint/latex-linter/lacheck'

suite('Linter test suite', () => {
    test.suite.name = path.basename(__filename).replace('.test.js', '')
    test.suite.fixture = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'never')
    })

    teardown(async () => {
        await test.reset()
    })

    test.run('test chktex', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'linter_base.tex', dst: 'main.tex'},
            {src: 'linter_sub.tex', dst: 'sub/s.tex'}
        ], {skipCache: true})
        await chkTeX.lintRootFile(lw.root.file.path ?? '')
        assert.strictEqual(chkTeX.linterDiagnostics.name, 'ChkTeX')
    })

    test.run('test chktex log parser', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'linter_base.tex', dst: 'main.tex'},
            {src: 'linter_sub.tex', dst: 'sub/s.tex'}
        ], {skipCache: true})
        const log = 'main.tex:5:18:1:Warning:24:Delete this space to maintain correct pagereferences.\nsub/s.tex:1:26:1:Warning:24:Delete this space to maintain correct pagereferences.\n'
        chkTeX.parseLog(log)
        assert.strictEqual(chkTeX.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'main.tex')))?.length, 1)
        assert.strictEqual(chkTeX.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))?.length, 1)
        assert.match(chkTeX.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'main.tex')))?.[0].message || '', /Delete this space/)
        assert.match(chkTeX.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))?.[0].message || '', /Delete this space/)
    })

    test.run('test lacheck', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'linter_base.tex', dst: 'main.tex'},
            {src: 'linter_sub.tex', dst: 'sub/s.tex'}
        ], {skipCache: true})
        await laCheck.lintRootFile(lw.root.file.path ?? '')
        assert.strictEqual(laCheck.linterDiagnostics.name, 'LaCheck')
    })

    test.run('test lacheck log parser', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'linter_base.tex', dst: 'main.tex'},
            {src: 'linter_sub.tex', dst: 'sub/s.tex'}
        ], {skipCache: true})
        const log = '"main.tex", line 7: double space at "~~"\n** sub/sub:\n"sub/s.tex", line 2: double space at "~~"\n'
        laCheck.parseLog(log)
        assert.strictEqual(laCheck.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'main.tex')))?.length, 1)
        assert.strictEqual(laCheck.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))?.length, 1)
        assert.match(laCheck.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'main.tex')))?.[0].message || '', /double space at/)
        assert.match(laCheck.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))?.[0].message || '', /double space at/)
    })
})
