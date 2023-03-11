import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import * as test from './utils'
import { EnvPair } from '../../src/components/envpair'

async function loadTestFiles(fixture: string) {
    await test.load(fixture, [
        {src: 'env_pair.tex', dst: 'main.tex'}
    ], {open: 0})
}

suite('EnvPair test suite', () => {
    test.suite.name = path.basename(__filename).replace('.test.js', '')
    test.suite.fixture = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
    })

    teardown(async () => {
        await test.reset()
    })

    test.run('test structure', async (fixture: string) => {
        await loadTestFiles(fixture)
        const activeTextEditor = vscode.window.activeTextEditor
        assert.ok(activeTextEditor)
        const pairTree = await EnvPair.buildCommandPairTree(activeTextEditor.document)
        assert.strictEqual(pairTree.length, 6)
        assert.strictEqual(pairTree[0].children.length, 0)
        assert.strictEqual(pairTree[0].start, '\\iftest')
        assert.strictEqual(pairTree[0].end, '\\fi')
        assert.strictEqual(pairTree[1].start, '\\(')
        assert.strictEqual(pairTree[1].end, '\\)')
        assert.strictEqual(pairTree[1].children.length, 0)
        assert.strictEqual(pairTree[2].start, '\\[')
        assert.strictEqual(pairTree[2].end, '\\]')
        assert.strictEqual(pairTree[2].children.length, 0)
        assert.strictEqual(pairTree[3].start, '\\begin{equation*}')
        assert.strictEqual(pairTree[3].end, '\\end{equation*}')
        assert.strictEqual(pairTree[3].children.length, 0)
        assert.strictEqual(pairTree[4].start, '\\begin{center}')
        assert.strictEqual(pairTree[4].end, '\\end{center}')
        assert.strictEqual(pairTree[4].children.length, 1)
        assert.strictEqual(pairTree[4].children[0].start, '\\begin{align}')
        assert.strictEqual(pairTree[4].children[0].end, '\\end{align}')
        assert.strictEqual(pairTree[4].children[0].children.length, 1)
        assert.strictEqual(pairTree[4].children[0].children[0].start, '\\iftest')
        assert.strictEqual(pairTree[4].children[0].children[0].end, '\\fi')
        assert.strictEqual(pairTree[4].children[0].children[0].children.length, 0)
        assert.ok(pairTree[4].children[0].children[0].parent)
        assert.strictEqual(pairTree[5].start, '\\begin{poo}')
        assert.deepStrictEqual(pairTree[5].startPosition, new vscode.Position(22, 0))
        assert.strictEqual(pairTree[5].children.length, 2)
        assert.ok(pairTree[5].end === undefined)
        assert.strictEqual(pairTree[5].children[0].start, '\\ifpoo')
        assert.strictEqual(pairTree[5].children[0].end, '\\else')
        assert.strictEqual(pairTree[5].children[1].start, '\\else')
        assert.strictEqual(pairTree[5].children[1].end, '\\fi')
        assert.deepStrictEqual(pairTree[5].children[0].startPosition, new vscode.Position(23, 0))
        assert.deepStrictEqual(pairTree[5].children[0].endPosition, new vscode.Position(25, 5))
        assert.deepStrictEqual(pairTree[5].children[1].startPosition, new vscode.Position(25, 0))
        assert.deepStrictEqual(pairTree[5].children[1].endPosition, new vscode.Position(27, 3))
    })

})
