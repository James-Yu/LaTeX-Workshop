import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import * as test from './utils'
import { testTools } from '../../src/preview/hover/cursor'
import { lw } from '../../src/lw'

suite('Math preview test suite', () => {
    test.suite.name = path.basename(__filename).replace('.test.js', '')
    test.suite.fixture = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'never')
    })

    teardown(async () => {
        await test.reset()
    })

    test.run('mathpreviewlib/cursorrenderer: test insertCursor', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'mathpreview/base.tex', dst: 'main.tex'}
        ], {open: 0, skipCache: true})
        assert.ok(vscode.window.activeTextEditor?.document)
        const cursorPos = new vscode.Position(0, 2)
        const texMath = lw.parser.find.math(vscode.window.activeTextEditor.document, cursorPos)
        assert.ok(texMath)
        const result = texMath && await testTools.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '$a|+b$')
    })

    test.run('mathpreviewlib/cursorrenderer: test shouldNotWriteCursor', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'mathpreview/base.tex', dst: 'main.tex'}
        ], {open: 0, skipCache: true})
        assert.ok(vscode.window.activeTextEditor?.document)
        const cursorPos = new vscode.Position(0, 0)
        const texMath = lw.parser.find.math(vscode.window.activeTextEditor.document, cursorPos)
        assert.ok(texMath)

        const result = testTools.isCursorInsideTexMath(texMath.range, cursorPos)
        assert.strictEqual(result, false)

        const cursorPos1 = new vscode.Position(0, 1)
        const result1 = testTools.isCursorInsideTexMath(texMath.range, cursorPos1)
        assert.strictEqual(result1, true)

        const cursorPos4 = new vscode.Position(0, 4)
        const result4 = testTools.isCursorInsideTexMath(texMath.range, cursorPos4)
        assert.strictEqual(result4, true)

        const cursorPos5 = new vscode.Position(0, 5)
        const result5 = testTools.isCursorInsideTexMath(texMath.range, cursorPos5)
        assert.strictEqual(result5, false)

    })

    test.run('mathpreviewlib/cursorrenderer: test \\f|rac{1}{2}', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'mathpreview/base.tex', dst: 'main.tex'}
        ], {open: 0, skipCache: true})
        assert.ok(vscode.window.activeTextEditor?.document)
        const cursorPos = new vscode.Position(1, 3)
        const texMath = lw.parser.find.math(vscode.window.activeTextEditor.document, cursorPos)
        assert.ok(texMath)
        const result = texMath && await testTools.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '$\\frac{1}{2}$')
    })

    test.run('mathpreviewlib/cursorrenderer: test a^|b', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'mathpreview/base.tex', dst: 'main.tex'}
        ], {open: 0, skipCache: true})
        assert.ok(vscode.window.activeTextEditor?.document)
        const cursorPos = new vscode.Position(2, 3)
        const texMath = lw.parser.find.math(vscode.window.activeTextEditor.document, cursorPos)
        assert.ok(texMath)
        const result = texMath && await testTools.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '$a^|b$')
    })
})
