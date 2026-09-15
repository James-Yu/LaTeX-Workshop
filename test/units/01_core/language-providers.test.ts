import * as path from 'path'
import * as vscode from 'vscode'
import * as sinon from 'sinon'
import { lw } from '../../../src/lw'
import { testing } from '../../../src/main'
import { assert, mock, set } from '../utils'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const providerNames = [
        'registerDocumentFormattingEditProvider',
        'registerDocumentRangeFormattingEditProvider',
        'registerHoverProvider',
        'registerDefinitionProvider',
        'registerDocumentSymbolProvider',
        'registerWorkspaceSymbolProvider',
        'registerColorProvider',
        'registerCompletionItemProvider',
        'registerCodeActionsProvider',
        'registerFoldingRangeProvider',
        'registerSelectionRangeProvider'
    ] as const
    let providers: sinon.SinonStub[]
    let serializer: sinon.SinonStub
    let customEditor: sinon.SinonStub
    let configurationChange: sinon.SinonStub
    let context: vscode.ExtensionContext

    beforeEach(() => {
        mock.config()
        providers = providerNames.map(name => sinon.stub(vscode.languages, name).returns(new vscode.Disposable(() => undefined)))
        serializer = sinon.stub(vscode.window, 'registerWebviewPanelSerializer').returns(new vscode.Disposable(() => undefined))
        customEditor = sinon.stub(vscode.window, 'registerCustomEditorProvider').returns(new vscode.Disposable(() => undefined))
        sinon.stub(vscode.window, 'registerWebviewViewProvider').returns(new vscode.Disposable(() => undefined))
        configurationChange = sinon.stub(lw, 'onConfigChange')
        context = { subscriptions: [] } as unknown as vscode.ExtensionContext
    })

    afterEach(() => {
        context.subscriptions.forEach(disposable => { disposable.dispose() })
        sinon.restore()
    })

    it('keeps the PDF viewer registered when language providers are disabled', () => {
        set.config('languageFeatures.enabled', false)
        testing.registerProviders(context)

        providers.forEach(provider => assert.strictEqual(provider.callCount, 0))
        assert.strictEqual(configurationChange.callCount, 0)
        assert.ok(serializer.calledWith('latex-workshop-pdf', lw.viewer.serializer))
        assert.ok(customEditor.calledWith('latex-workshop-pdf-hook', lw.viewer.hook))
    })

    it('registers language providers by default', () => {
        testing.registerProviders(context)

        providers.forEach(provider => assert.ok(provider.called))
        assert.ok(serializer.calledWith('latex-workshop-pdf', lw.viewer.serializer))
        assert.strictEqual(configurationChange.callCount, 2)
    })

    it('retains completion trigger updates when language features are enabled', () => {
        testing.registerProviders(context)
        const completion = providers[providerNames.indexOf('registerCompletionItemProvider')]
        const count = completion.callCount
        set.config('intellisense.triggers.latex', ['!'])
        const callback = configurationChange.getCalls().find(call => call.args[0] === 'intellisense.triggers.latex')?.args[1] as () => void
        callback()

        assert.strictEqual(completion.callCount, count + 1)
        assert.strictEqual(completion.lastCall.args[2], '!')
    })
})
