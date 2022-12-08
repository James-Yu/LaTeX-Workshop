import assert from 'assert'
import * as vscode from 'vscode'

import { runUnitTestWithFixture } from '../../../../utils/ciutils'
import { UtensilsParser } from '../../../../../src/components/parser/syntax'
import { TeXMathEnvFinder } from '../../../../../src/providers/preview/mathpreviewlib/texmathenvfinder'
import { CursorRenderer } from '../../../../../src/providers/preview/mathpreviewlib/cursorrenderer'
import { TextDocumentLike } from '../../../../../src/providers/preview/mathpreviewlib/textdocumentlike'

const pegParser = new UtensilsParser()

suite('unit test suite: mathpreviewlib/cursorrenderer', () => {

    suiteTeardown(() => {
        return pegParser.dispose()
    })

    runUnitTestWithFixture('fixture001', 'test insertCursor', async () => {
        const docString = '$a+b$'
        const doc = new TextDocumentLike(docString)
        const finder = new TeXMathEnvFinder()
        const cursorPos = new vscode.Position(0, 2)
        const texMath = finder.findMathEnvIncludingPosition(doc, cursorPos)
        assert(texMath)
        const renderer = new CursorRenderer({pegParser})
        const result = texMath && await renderer.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '${~a|+b~}$')
    })

    runUnitTestWithFixture('fixture001', 'test shouldNotWriteCursor', () => {
        const docString = '$a+b$'
        const doc = new TextDocumentLike(docString)
        const finder = new TeXMathEnvFinder()
        const cursorPos = new vscode.Position(0, 0)
        const texMath = finder.findMathEnvIncludingPosition(doc, cursorPos)
        assert(texMath)
        const renderer = new CursorRenderer({pegParser})

        const result = renderer.isCursorInsideTexMath(texMath.range, cursorPos)
        assert.strictEqual(result, false)

        const cursorPos1 = new vscode.Position(0, 1)
        const result1 = renderer.isCursorInsideTexMath(texMath.range, cursorPos1)
        assert.strictEqual(result1, true)

        const cursorPos4 = new vscode.Position(0, 4)
        const result4 = renderer.isCursorInsideTexMath(texMath.range, cursorPos4)
        assert.strictEqual(result4, true)

        const cursorPos5 = new vscode.Position(0, 5)
        const result5 = renderer.isCursorInsideTexMath(texMath.range, cursorPos5)
        assert.strictEqual(result5, false)

    })

    runUnitTestWithFixture('fixture001', 'test \\f|rac{1}{2}', async () => {
        const docString = '$\\frac{1}{2}$'
        const doc = new TextDocumentLike(docString)
        const finder = new TeXMathEnvFinder()
        const cursorPos = new vscode.Position(0, 3)
        const texMath = finder.findMathEnvIncludingPosition(doc, cursorPos)
        assert(texMath)
        const renderer = new CursorRenderer({pegParser})
        const result = texMath && await renderer.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '$\\frac{1}{2}$')
    })

    runUnitTestWithFixture('fixture001', 'test a^|b', async () => {
        const docString = '$a^b$'
        const doc = new TextDocumentLike(docString)
        const finder = new TeXMathEnvFinder()
        const cursorPos = new vscode.Position(0, 3)
        const texMath = finder.findMathEnvIncludingPosition(doc, cursorPos)
        assert(texMath)
        const renderer = new CursorRenderer({pegParser})
        const result = texMath && await renderer.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '$a^{~|b~}$')
    })

    runUnitTestWithFixture('fixture001', 'test $a^b| $', async () => {
        const docString = '$a^b $'
        const doc = new TextDocumentLike(docString)
        const finder = new TeXMathEnvFinder()
        const cursorPos = new vscode.Position(0, 4)
        const texMath = finder.findMathEnvIncludingPosition(doc, cursorPos)
        assert(texMath)
        const renderer = new CursorRenderer({pegParser})
        const result = texMath && await renderer.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '${~a^b|~} $')
    })

    runUnitTestWithFixture('fixture001', 'test $a^{b|} $', async () => {
        const docString = '$a^{b} $'
        const doc = new TextDocumentLike(docString)
        const finder = new TeXMathEnvFinder()
        const cursorPos = new vscode.Position(0, 5)
        const texMath = finder.findMathEnvIncludingPosition(doc, cursorPos)
        assert(texMath)
        const renderer = new CursorRenderer({pegParser})
        const result = texMath && await renderer.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '$a^{~b|~} $')
    })

    runUnitTestWithFixture('fixture001', 'test a_|b', async () => {
        const docString = '$a_b$'
        const doc = new TextDocumentLike(docString)
        const finder = new TeXMathEnvFinder()
        const cursorPos = new vscode.Position(0, 3)
        const texMath = finder.findMathEnvIncludingPosition(doc, cursorPos)
        assert(texMath)
        const renderer = new CursorRenderer({pegParser})
        const result = texMath && await renderer.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '$a_{~|b~}$')
    })

})
