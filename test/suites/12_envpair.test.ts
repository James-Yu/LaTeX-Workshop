import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import { lw } from '../../src/lw'
import * as test from './utils'

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

    test.run('Test env_pair AST', async (fixture: string) => {
        await loadTestFiles(fixture)
        const activeTextEditor = vscode.window.activeTextEditor
        assert.ok(activeTextEditor)
        const pairTree = await lw.locate.pair.build(activeTextEditor.document)
        assert.strictEqual(pairTree.length, 7)
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

    test.run('Select env name', async (fixture: string) => {
        await loadTestFiles(fixture)
        const activeTextEditor = vscode.window.activeTextEditor
        assert.ok(activeTextEditor)
        const curPos = new vscode.Position(18, 6)
        const startNamePos = new vscode.Position(15, 9)
        const endNamePos = new vscode.Position(19, 7)
        activeTextEditor.selection = new vscode.Selection(curPos, curPos)
        await lw.locate.pair.name('selection')
        await test.sleep(250)
        assert.strictEqual(activeTextEditor.selections.length, 2)
        assert.deepStrictEqual(activeTextEditor.selections[0], new vscode.Selection(startNamePos, startNamePos.translate(0, 5)))
        assert.deepStrictEqual(activeTextEditor.selections[1], new vscode.Selection(endNamePos, endNamePos.translate(0, 5)))
    })

    test.run('Add multi-cursor env name', async (fixture: string) => {
        await loadTestFiles(fixture)
        const activeTextEditor = vscode.window.activeTextEditor
        assert.ok(activeTextEditor)
        const curPos = new vscode.Position(18, 6)
        const startNamePos = new vscode.Position(15, 9)
        const endNamePos = new vscode.Position(19, 7)
        activeTextEditor.selection = new vscode.Selection(curPos, curPos)
        await lw.locate.pair.name('cursor')
        await test.sleep(250)
        assert.strictEqual(activeTextEditor.selections.length, 2)
        assert.deepStrictEqual(activeTextEditor.selections[0], new vscode.Selection(startNamePos, startNamePos))
        assert.deepStrictEqual(activeTextEditor.selections[1], new vscode.Selection(endNamePos, endNamePos))
    })

    test.run('Toggle equation - \\[ \\]', async (fixture: string) => {
        await loadTestFiles(fixture)
        const activeTextEditor = vscode.window.activeTextEditor
        assert.ok(activeTextEditor)
        const curPos = new vscode.Position(7, 3)
        activeTextEditor.selection = new vscode.Selection(curPos, curPos)
        await lw.locate.pair.name('equationToggle')
        await test.sleep(250)
        const line = activeTextEditor.document.lineAt(7).text
        assert.strictEqual(line, '\\begin{equation*} 1 + 2 \\end{equation*}')
    })

    test.run('Toggle \\[ \\] - equation', async (fixture: string) => {
        await loadTestFiles(fixture)
        const activeTextEditor = vscode.window.activeTextEditor
        assert.ok(activeTextEditor)
        const curPos = new vscode.Position(10, 4)
        activeTextEditor.selection = new vscode.Selection(curPos, curPos)
        await lw.locate.pair.name('equationToggle')
        await test.sleep(250)
        const text = activeTextEditor.document.getText(new vscode.Range(new vscode.Position(9, 0), new vscode.Position(11, 2)))
        assert.strictEqual(text, '\\[\n  1 + 2\n\\]')
    })

    test.run('Select env content', async (fixture: string) => {
        await loadTestFiles(fixture)
        const activeTextEditor = vscode.window.activeTextEditor
        assert.ok(activeTextEditor)
        const curPos = new vscode.Position(15, 5)
        const startEnvContentPos = new vscode.Position(14, 14)
        const endEnvContentPos = new vscode.Position(20, 0)
        activeTextEditor.selection = new vscode.Selection(curPos, curPos)
        await lw.locate.pair.select('content')
        await test.sleep(250)
        assert.strictEqual(activeTextEditor.selections.length, 1)
        assert.deepStrictEqual(activeTextEditor.selection, new vscode.Selection(startEnvContentPos, endEnvContentPos))
    })

    test.run('Select \\(...\\) content', async (fixture: string) => {
        await loadTestFiles(fixture)
        const activeTextEditor = vscode.window.activeTextEditor
        assert.ok(activeTextEditor)
        const curPos = new vscode.Position(6, 4)
        const startEnvContentPos = new vscode.Position(6, 2)
        const endEnvContentPos = new vscode.Position(6, 9)
        activeTextEditor.selection = new vscode.Selection(curPos, curPos)
        await lw.locate.pair.select('content')
        await test.sleep(250)
        assert.strictEqual(activeTextEditor.selections.length, 1)
        assert.deepStrictEqual(activeTextEditor.selection, new vscode.Selection(startEnvContentPos, endEnvContentPos))
    })

    test.run('Select $...$ content', async (fixture: string) => {
        await loadTestFiles(fixture)
        const activeTextEditor = vscode.window.activeTextEditor
        assert.ok(activeTextEditor)
        const curPos = new vscode.Position(29, 6)
        const startEnvContentPos = new vscode.Position(29, 4)
        const endEnvContentPos = new vscode.Position(29, 11)
        activeTextEditor.selection = new vscode.Selection(curPos, curPos)
        await lw.locate.pair.select('content')
        await test.sleep(250)
        assert.strictEqual(activeTextEditor.selections.length, 1)
        assert.deepStrictEqual(activeTextEditor.selection, new vscode.Selection(startEnvContentPos, endEnvContentPos))
    })


    test.run('Select env', async (fixture: string) => {
        await loadTestFiles(fixture)
        const activeTextEditor = vscode.window.activeTextEditor
        assert.ok(activeTextEditor)
        const curPos = new vscode.Position(17, 6)
        const startEnvContentPos = new vscode.Position(15, 2)
        const endEnvContentPos = new vscode.Position(19, 13)
        activeTextEditor.selection = new vscode.Selection(curPos, curPos)
        // Double call expands selection to outer env
        await lw.locate.pair.select('whole')
        await test.sleep(250)
        await lw.locate.pair.select('whole')
        await test.sleep(250)
        assert.strictEqual(activeTextEditor.selections.length, 1)
        assert.deepStrictEqual(activeTextEditor.selection, new vscode.Selection(startEnvContentPos, endEnvContentPos))
    })

    test.run('Close env', async (fixture: string) => {
        await loadTestFiles(fixture)
        const activeTextEditor = vscode.window.activeTextEditor
        assert.ok(activeTextEditor)
        const curPos = new vscode.Position(28, 0)
        activeTextEditor.selection = new vscode.Selection(curPos, curPos)
        await lw.locate.pair.close()
        await test.sleep(250)
        const endString = '\\end{poo}'
        const text = activeTextEditor.document.getText(new vscode.Range(curPos, curPos.translate(0, endString.length)))
        assert.strictEqual(text, endString)
    })

    test.run('Go to pair', async (fixture: string) => {
        await loadTestFiles(fixture)
        const activeTextEditor = vscode.window.activeTextEditor
        assert.ok(activeTextEditor)
        const pair1 = new vscode.Position(18, 6)
        const altPair1 = new vscode.Position(16, 4)
        activeTextEditor.selection = new vscode.Selection(pair1, pair1)
        await lw.locate.pair.goto()
        await test.sleep(250)
        assert.strictEqual(activeTextEditor.selections.length, 1)
        assert.deepStrictEqual(activeTextEditor.selection, new vscode.Selection(altPair1, altPair1))

        const pair2 = new vscode.Position(15, 4)
        const altPair2 = new vscode.Position(19, 2)
        activeTextEditor.selection = new vscode.Selection(pair2, pair2)
        await lw.locate.pair.goto()
        await test.sleep(250)
        assert.strictEqual(activeTextEditor.selections.length, 1)
        assert.deepStrictEqual(activeTextEditor.selection, new vscode.Selection(altPair2, altPair2))

        const cicrlePair1 = new vscode.Position(23,0)
        const cicrlePair2 = new vscode.Position(25,0)
        const cicrlePair3 = new vscode.Position(27,0)
        activeTextEditor.selection = new vscode.Selection(cicrlePair1, cicrlePair1)
        await lw.locate.pair.goto()
        await test.sleep(250)
        assert.deepStrictEqual(activeTextEditor.selection, new vscode.Selection(cicrlePair2, cicrlePair2))
        await lw.locate.pair.goto()
        await test.sleep(250)
        assert.deepStrictEqual(activeTextEditor.selection, new vscode.Selection(cicrlePair3, cicrlePair3))
        await lw.locate.pair.goto()
        await test.sleep(250)
        assert.deepStrictEqual(activeTextEditor.selection, new vscode.Selection(cicrlePair1, cicrlePair1))
    })

})
