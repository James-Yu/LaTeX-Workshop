import assert from 'assert'
import * as path from 'path'
import * as vscode from 'vscode'

import {runUnitTestWithFixture, getFixtureDir} from '../../../../utils/ciutils'
import {TextDocumentLike} from '../../../../../src/providers/preview/mathpreviewlib/textdocumentlike'

suite('unit test suite', () => {

    runUnitTestWithFixture('fixture001', 'test mathpreviewlib/textdocumentlike', () => {
        const s =
`abc
d

efg

hijk
lmn
`
        const fixtureDir = getFixtureDir()
        const filePath = path.join(fixtureDir, 'textdocumentlike', 'abc.txt')
        const a = TextDocumentLike.load(filePath)
        assert.strictEqual(s, a.getText())

        const docLike = new TextDocumentLike(s)
        const pos = new vscode.Position(0,0)
        assert.strictEqual('abc', docLike.lineAt(pos.line).text)
        assert.strictEqual('abc', docLike.lineAt(pos).text)
        let range = docLike.getWordRangeAtPosition(pos)
        assert.strictEqual('abc', docLike.getText(range))
        range = docLike.getWordRangeAtPosition(new vscode.Position(1, 0))
        assert.strictEqual('d', docLike.getText(range))
        range = docLike.getWordRangeAtPosition(new vscode.Position(2, 0))
        assert.strictEqual(undefined, range)
    })

})
