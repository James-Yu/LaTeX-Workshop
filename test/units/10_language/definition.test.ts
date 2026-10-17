import * as path from 'path'
import * as sinon from 'sinon'
import * as vscode from 'vscode'
import { lw } from '../../../src/lw'
import { DefinitionProvider } from '../../../src/language/definition'
import { assert, get, mock, set } from '../utils'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const texPath = get.path(get.fixture(__filename), 'main.tex')
    const provider = new DefinitionProvider()
    let document: vscode.TextDocument
    let readStub: sinon.SinonStub

    before(async () => {
        mock.init(lw, 'root', 'cache', 'parser', 'completion')
        readStub = sinon.stub(lw.file, 'read')
        document = await vscode.workspace.openTextDocument(vscode.Uri.file(texPath))
    })

    beforeEach(async () => {
        set.root(texPath)
        readStub.resolves(document.getText())
        await lw.cache.refreshCache(texPath)
        assert.ok(lw.cache.get(texPath)?.ast)
    })

    after(() => {
        sinon.restore()
    })

    for (const [description, line] of [
        ['a row break with optional spacing on the same line (#5006)', 5],
        ['a row break on the next line', 6],
        ['another macro with arguments on the same line', 8]
    ] as const) {
        it(`should find a custom macro definition before ${description}`, async () => {
            const start = document.lineAt(line).text.indexOf('\\studentname')
            const definitions = await provider.provideDefinition(document, new vscode.Position(line, start + 4))

            assert.strictEqual(definitions.length, 1)
            assert.pathStrictEqual(definitions[0].targetUri.fsPath, texPath)
            assert.ok(definitions[0].targetRange.isEqual(new vscode.Range(1, 0, 1, 0)))
            assert.ok(definitions[0].originSelectionRange?.isEqual(
                new vscode.Range(line, start, line, start + '\\studentname'.length)
            ))
        })
    }
})
