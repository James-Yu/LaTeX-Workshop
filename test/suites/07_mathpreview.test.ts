import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import * as test from './utils'
import { TextDocumentLike } from '../../src/providers/preview/mathpreviewlib/textdocumentlike'
import { TeXMathEnvFinder } from '../../src/providers/preview/mathpreviewlib/texmathenvfinder'
import { testTools } from '../../src/providers/preview/mathpreviewlib/cursorrenderer'

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

    test.run('mathpreviewlib/cursorrenderer: test insertCursor', () => {
        const docString = '$a+b$'
        const doc = new TextDocumentLike(docString)
        const cursorPos = new vscode.Position(0, 2)
        const texMath = TeXMathEnvFinder.findMathEnvIncludingPosition(doc, cursorPos)
        assert.ok(texMath)
        const result = texMath && testTools.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '$a|+b$')
    })

    test.run('mathpreviewlib/cursorrenderer: test shouldNotWriteCursor', () => {
        const docString = '$a+b$'
        const doc = new TextDocumentLike(docString)
        const cursorPos = new vscode.Position(0, 0)
        const texMath = TeXMathEnvFinder.findMathEnvIncludingPosition(doc, cursorPos)
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

    test.run('mathpreviewlib/cursorrenderer: test \\f|rac{1}{2}', () => {
        const docString = '$\\frac{1}{2}$'
        const doc = new TextDocumentLike(docString)
        const cursorPos = new vscode.Position(0, 3)
        const texMath = TeXMathEnvFinder.findMathEnvIncludingPosition(doc, cursorPos)
        assert.ok(texMath)
        const result = texMath && testTools.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '$\\frac{1}{2}$')
    })

    test.run('mathpreviewlib/cursorrenderer: test a^|b', () => {
        const docString = '$a^b$'
        const doc = new TextDocumentLike(docString)
        const cursorPos = new vscode.Position(0, 3)
        const texMath = TeXMathEnvFinder.findMathEnvIncludingPosition(doc, cursorPos)
        assert.ok(texMath)
        const result = texMath && testTools.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '$a^|b$')
    })
})
