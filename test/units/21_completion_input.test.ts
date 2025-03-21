import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { assert, get, mock, set } from './utils'
import { inputProvider, importProvider, subimportProvider } from '../../src/completion/completer/input'
import type { CompletionProvider } from '../../src/types'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]
    const texPath = get.path(fixture, 'main.tex')

    before(() => {
        mock.init(lw, 'root', 'cache', 'parser', 'completion')
    })

    beforeEach(() => {
        set.root(texPath)
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.completion->input', () => {
        function getSuggestions(provider: CompletionProvider, matches: RegExpMatchArray) {
            return provider.from(matches, {
                uri: lw.file.toUri(texPath),
                langId: 'latex',
                line: '',
                position: new vscode.Position(0, 0),
            })
        }

        function getInputs(provider: CompletionProvider, matches: RegExpMatchArray) {
            return getSuggestions(provider, matches).map((s) => s.label)
        }

        it('should provide \\input suggestions', () => {
            const labels = getInputs(inputProvider, ['\\input{', 'input', ''])

            assert.listStrictEqual(labels, ['main.tex', 'sub/'])
        })

        it('should provide \\includeonly suggestions', () => {
            const labels = getInputs(inputProvider, ['\\includeonly{', 'includeonly', ''])

            assert.listStrictEqual(labels, ['main.tex', 'sub/'])
        })

        it('should provide \\import folder suggestions', () => {
            const labels = getInputs(importProvider, ['\\import{', 'import', '', ''])

            assert.ok(!labels.includes('main.tex'))
        })

        it('should provide \\import subfile suggestions', () => {
            const labels = getInputs(importProvider, ['\\import{', 'import', get.path(fixture), ''])

            assert.listStrictEqual(labels, ['main.tex', 'sub/'])
        })

        it('should provide \\subimport folder suggestions', () => {
            const labels = getInputs(subimportProvider, ['\\subimport{', 'import', '', ''])

            assert.listStrictEqual(labels, ['sub/'])
        })

        it('should provide \\subimport subfile suggestions', () => {
            const labels = getInputs(subimportProvider, ['\\subimport{sub}{', 'import', 'sub', ''])

            assert.listStrictEqual(labels, ['sub1.tex', 'sub2.tex'])
        })

        it('should provide \\subimport subfile suggestions with extension-less inserted text', () => {
            const suggestions = getSuggestions(subimportProvider, ['\\subimport{sub}{', 'import', 'sub', ''])

            assert.ok(!suggestions.some(s => s.insertText instanceof vscode.SnippetString && s.insertText?.value.includes('.tex')))
        })
    })
})
