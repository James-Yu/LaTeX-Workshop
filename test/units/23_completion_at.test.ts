import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { assert, get, mock, set, type TextDocument } from './utils'
import { provider } from '../../src/completion/completer/atsuggestion'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]
    const texPath = get.path(fixture, 'main.tex')
    let document: TextDocument
    let atSpy: sinon.SinonSpy

    before(() => {
        mock.init(lw, 'root', 'cache', 'parser', 'completion')
        mock.activeTextEditor(get.path('main.tex'), '', {
            languageId: 'latex',
        })
        document = vscode.window.activeTextEditor?.document as TextDocument
        atSpy = sinon.spy(provider, 'from')
    })

    beforeEach(() => {
        // Reset the trigger character
        lw.completion.atProvider.updateTrigger()
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.completion->atsuggestion', () => {
        function getSuggestions(content: string = '') {
            return provider.from([content], {
                uri: lw.file.toUri(texPath),
                langId: 'latex',
                line: content,
                position: new vscode.Position(0, content.length),
            })
        }

        function getLabels(content: string = '') {
            return getSuggestions(content).map((s) => s.label)
        }

        it('should invoke @-suggestion provider', () => {
            atSpy.resetHistory()
            document.setContent('@')
            const pos = new vscode.Position(0, 1)
            lw.completion.atProvider.provideCompletionItems(document, pos)
            assert.strictEqual(atSpy.callCount, 1)
        })

        it('should provide @-suggestions', () => {
            assert.ok(getLabels().includes('@{'))
        })

        it('should only provide @@ if multiple consecutive @ is typed', () => {
            const labels = getLabels('@@')

            assert.ok(labels.includes('@@'))
            assert.ok(!labels.includes('@{'))
        })

        it('should follow `intellisense.atSuggestion.trigger.latex` and change the trigger character', () => {
            set.config('intellisense.atSuggestion.trigger.latex', '{')
            lw.completion.atProvider.updateTrigger() // This appeared in main.ts, not loaded
            atSpy.resetHistory()
            document.setContent('{')
            const pos = new vscode.Position(0, 1)
            lw.completion.atProvider.provideCompletionItems(document, pos)
            assert.strictEqual(atSpy.callCount, 1)
        })

        it('should follow `intellisense.atSuggestion.trigger.latex` and change the suggestion content', () => {
            set.config('intellisense.atSuggestion.trigger.latex', '{')
            lw.completion.atProvider.updateTrigger() // This appeared in main.ts, not loaded

            assert.ok(getLabels().includes('{@'))
        })

        it('should follow `intellisense.atSuggestion.trigger.latex` and handle multiple triggering characters case', () => {
            set.config('intellisense.atSuggestion.trigger.latex', '{')
            lw.completion.atProvider.updateTrigger() // This appeared in main.ts, not loaded
            const labels = getLabels('{{')

            assert.ok(labels.includes('{{'))
            assert.ok(!labels.includes('{@'))
        })

        it('should add new suggestions from `intellisense.atSuggestion.user`', async () => {
            assert.ok(!getLabels().includes('@?'))
            await set.codeConfig('intellisense.atSuggestion.user', { '@?': '\\sum' })
            assert.ok(getLabels().includes('@?'))
        })

        it('should change existing suggestions from `intellisense.atSuggestion.user`', async () => {
            let snippet = getSuggestions().find(s => s.label === '@+')?.insertText
            assert.ok(snippet instanceof vscode.SnippetString)
            assert.strictEqual(snippet.value, '\\bigcup')
            await set.codeConfig('intellisense.atSuggestion.user', { '@+': '\\sum' })
            snippet = getSuggestions().find(s => s.label === '@+')?.insertText
            assert.ok(snippet instanceof vscode.SnippetString)
            assert.strictEqual(snippet.value, '\\sum')
        })

        it('should remove existing suggestions from `intellisense.atSuggestion.user`', async () => {
            assert.ok(getLabels().includes('@8'))
            await set.codeConfig('intellisense.atSuggestion.user', { '@8': '' })
            assert.ok(!getLabels().includes('@8'))
        })

        it('should add new suggestions with another triggering character', async () => {
            set.config('intellisense.atSuggestion.trigger.latex', '{')
            lw.completion.atProvider.updateTrigger() // This appeared in main.ts, not loaded

            assert.ok(!getLabels().includes('{?'))
            await set.codeConfig('intellisense.atSuggestion.user', { '@?': '\\sum' })
            assert.ok(getLabels().includes('{?'))
        })

        it('should change existing suggestions with another triggering character', async () => {
            set.config('intellisense.atSuggestion.trigger.latex', '{')
            lw.completion.atProvider.updateTrigger() // This appeared in main.ts, not loaded

            let snippet = getSuggestions().find(s => s.label === '{+')?.insertText
            assert.ok(snippet instanceof vscode.SnippetString)
            assert.strictEqual(snippet.value, '\\bigcup')
            await set.codeConfig('intellisense.atSuggestion.user', { '@+': '\\sum' })
            snippet = getSuggestions().find(s => s.label === '{+')?.insertText
            assert.ok(snippet instanceof vscode.SnippetString)
            assert.strictEqual(snippet.value, '\\sum')
        })

        it('should remove existing suggestions with another triggering character', async () => {
            set.config('intellisense.atSuggestion.trigger.latex', '{')
            lw.completion.atProvider.updateTrigger() // This appeared in main.ts, not loaded

            assert.ok(getLabels().includes('{8'))
            await set.codeConfig('intellisense.atSuggestion.user', { '@8': '' })
            assert.ok(!getLabels().includes('{8'))
        })
    })
})
