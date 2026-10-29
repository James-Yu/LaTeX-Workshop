import * as path from 'path'
import * as sinon from 'sinon'
import * as vscode from 'vscode'
import { lw } from '../../../src/lw'
import { DefinitionProvider } from '../../../src/language/definition'
import { provider as hoverProvider } from '../../../src/preview/hover'
import { assert, get, mock, set } from '../utils'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const texPath = get.path(get.fixture(__filename), 'main.tex')
    const provider = new DefinitionProvider()
    let document: vscode.TextDocument
    let readStub: sinon.SinonStub

    before(async () => {
        mock.init(lw, 'root', 'cache', 'parser', 'completion', 'preview')
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

    for (const [description, source, key, offset, target, preview] of [
        ['the first word of a label with spaces (#5018)', '\\ref{Even theorem}', 'Even theorem', 1, '\\label{Even theorem}', 'Every even integer'],
        ['the space inside a label (#5018)', '\\ref{Even theorem}', 'Even theorem', 4, '\\label{Even theorem}', 'Every even integer'],
        ['the last word of a label with spaces (#5018)', '\\ref{Even theorem}', 'Even theorem', 7, '\\label{Even theorem}', 'Every even integer'],
        ['the first key in a multiline citation', '    first,', 'first', 2, '\\bibitem{first}', 'First citation'],
        ['the last key in a multiline citation', '    second\n', 'second', 2, '\\bibitem{second}', 'Second citation']
    ] as const) {
        it(`should find the definition and hover for ${description}`, async () => {
            const content = document.getText()
            const start = content.indexOf(source) + source.indexOf(key)
            const position = document.positionAt(start + offset)
            const targetPosition = document.positionAt(content.indexOf(target))
            const definitions = await provider.provideDefinition(document, position)

            assert.strictEqual(definitions.length, 1)
            assert.pathStrictEqual(definitions[0].targetUri.fsPath, texPath)
            assert.ok(definitions[0].targetRange.isEqual(new vscode.Range(targetPosition, targetPosition)))
            assert.ok(definitions[0].originSelectionRange?.isEqual(
                new vscode.Range(document.positionAt(start), document.positionAt(start + key.length))
            ))

            set.config('hover.preview.enabled', false)
            set.config('hover.ref.enabled', true)
            set.config('hover.citation.enabled', true)
            const ctoken = new vscode.CancellationTokenSource()
            try {
                const hover = await hoverProvider.provideHover(document, position, ctoken.token)
                assert.ok(hover)
                assert.ok(hover.contents.some(value => typeof value === 'string'
                    ? value.includes(preview)
                    : value.value.includes(preview)))
            } finally {
                ctoken.dispose()
            }
        })
    }
})
