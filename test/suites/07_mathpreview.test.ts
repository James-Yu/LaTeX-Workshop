import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import rimraf from 'rimraf'
import * as lw from '../../src/lw'
import { sleep, runTest } from './utils'
import { TextDocumentLike } from '../../src/providers/preview/mathpreviewlib/textdocumentlike'
import { TeXMathEnvFinder } from '../../src/providers/preview/mathpreviewlib/texmathenvfinder'
import { CursorRenderer } from '../../src/providers/preview/mathpreviewlib/cursorrenderer'

suite('Math preview test suite', () => {

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

    runTest(suiteName, fixtureName, 'mathpreviewlib/cursorrenderer: test insertCursor', async () => {
        const docString = '$a+b$'
        const doc = new TextDocumentLike(docString)
        const cursorPos = new vscode.Position(0, 2)
        const texMath = TeXMathEnvFinder.findMathEnvIncludingPosition(doc, cursorPos)
        assert.ok(texMath)
        const result = texMath && await CursorRenderer.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '${~a|+b~}$')
    })

    runTest(suiteName, fixtureName, 'mathpreviewlib/cursorrenderer: test shouldNotWriteCursor', () => {
        const docString = '$a+b$'
        const doc = new TextDocumentLike(docString)
        const cursorPos = new vscode.Position(0, 0)
        const texMath = TeXMathEnvFinder.findMathEnvIncludingPosition(doc, cursorPos)
        assert.ok(texMath)

        const result = CursorRenderer.isCursorInsideTexMath(texMath.range, cursorPos)
        assert.strictEqual(result, false)

        const cursorPos1 = new vscode.Position(0, 1)
        const result1 = CursorRenderer.isCursorInsideTexMath(texMath.range, cursorPos1)
        assert.strictEqual(result1, true)

        const cursorPos4 = new vscode.Position(0, 4)
        const result4 = CursorRenderer.isCursorInsideTexMath(texMath.range, cursorPos4)
        assert.strictEqual(result4, true)

        const cursorPos5 = new vscode.Position(0, 5)
        const result5 = CursorRenderer.isCursorInsideTexMath(texMath.range, cursorPos5)
        assert.strictEqual(result5, false)

    })

    runTest(suiteName, fixtureName, 'mathpreviewlib/cursorrenderer: test \\f|rac{1}{2}', async () => {
        const docString = '$\\frac{1}{2}$'
        const doc = new TextDocumentLike(docString)
        const cursorPos = new vscode.Position(0, 3)
        const texMath = TeXMathEnvFinder.findMathEnvIncludingPosition(doc, cursorPos)
        assert.ok(texMath)
        const result = texMath && await CursorRenderer.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '$\\frac{1}{2}$')
    })

    runTest(suiteName, fixtureName, 'mathpreviewlib/cursorrenderer: test a^|b', async () => {
        const docString = '$a^b$'
        const doc = new TextDocumentLike(docString)
        const cursorPos = new vscode.Position(0, 3)
        const texMath = TeXMathEnvFinder.findMathEnvIncludingPosition(doc, cursorPos)
        assert.ok(texMath)
        const result = texMath && await CursorRenderer.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '$a^{~|b~}$')
    })

    runTest(suiteName, fixtureName, 'mathpreviewlib/cursorrenderer: test $a^b| $', async () => {
        const docString = '$a^b $'
        const doc = new TextDocumentLike(docString)
        const cursorPos = new vscode.Position(0, 4)
        const texMath = TeXMathEnvFinder.findMathEnvIncludingPosition(doc, cursorPos)
        assert.ok(texMath)
        const result = texMath && await CursorRenderer.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '${~a^b|~} $')
    })

    runTest(suiteName, fixtureName, 'mathpreviewlib/cursorrenderer: test $a^{b} $', async () => {
        const docString = '$a^{b} $'
        const doc = new TextDocumentLike(docString)
        const cursorPos = new vscode.Position(0, 5)
        const texMath = TeXMathEnvFinder.findMathEnvIncludingPosition(doc, cursorPos)
        assert.ok(texMath)
        const result = texMath && await CursorRenderer.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '$a^{~b|~} $')
    })

    runTest(suiteName, fixtureName, 'mathpreviewlib/cursorrenderer: test a_|b', async () => {
        const docString = '$a_b$'
        const doc = new TextDocumentLike(docString)
        const cursorPos = new vscode.Position(0, 3)
        const texMath = TeXMathEnvFinder.findMathEnvIncludingPosition(doc, cursorPos)
        assert.ok(texMath)
        const result = texMath && await CursorRenderer.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '$a_{~|b~}$')
    })
})
