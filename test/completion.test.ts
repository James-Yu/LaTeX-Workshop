import * as assert from 'assert'
// import * as os from 'os'
import * as path from 'path'

import * as process from 'process'
import * as vscode from 'vscode'

import {
    getFixtureDir,
//    isDockerEnabled,
    runTestWithFixture,
    waitLatexWorkshopActivated
} from './utils'


function assertCompletionItemContains(items: vscode.CompletionItem[], prefix: string, snippet: string): void {
    const matches = items.find(item =>
        item.label === prefix &&
        item.insertText instanceof vscode.SnippetString &&
        item.insertText.value === snippet)
    assert.ok(matches !== undefined, `Snippet (${prefix}, ${snippet}) not found`)
}

function assertCompletionItemDoesNotContain(items: vscode.CompletionItem[], prefix: string, snippet?: string): void {
    if (snippet) {
        const matches = items.find(item =>
            item.label === prefix &&
            item.insertText instanceof vscode.SnippetString &&
            item.insertText.value === snippet)
        assert.ok(matches === undefined, `Snippet (${prefix}, ${snippet}) found`)
    } else {
        const matches = items.find(item => item.label === prefix)
        assert.ok(matches === undefined, `Snippet ${prefix} found`)
    }
}


suite('Completion test suite', () => {

    suiteSetup(() => {
        const config = vscode.workspace.getConfiguration()
        if (process.env['LATEXWORKSHOP_CI_ENABLE_DOCKER']) {
            return config.update('latex-workshop.docker.enabled', true, vscode.ConfigurationTarget.Global)
        }
        return
    })

    runTestWithFixture('fixture001', 'basic completion', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        await vscode.window.showTextDocument(doc)
        const extension = await waitLatexWorkshopActivated()
        const pos = new vscode.Position(3,1)
        const token = new vscode.CancellationTokenSource().token
        const items = await extension.exports.realExtension?.completer.provideCompletionItems?.(
            doc, pos, token,
            {
                triggerKind: vscode.CompletionTriggerKind.Invoke,
                triggerCharacter: undefined
            }
        )
        assert.ok(items && items.length > 0)
    })

    runTestWithFixture('fixture002', '@-snippet completion', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 't.tex'
        const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        await vscode.window.showTextDocument(doc)
        const extension = await waitLatexWorkshopActivated()
        const pos = new vscode.Position(3,1)
        const token = new vscode.CancellationTokenSource().token
        const items = await extension.exports.realExtension?.snippetCompleter.provideCompletionItems(
            doc, pos, token,
            {
                triggerKind: vscode.CompletionTriggerKind.Invoke,
                triggerCharacter: undefined
            }
        )
        assert.ok(items && items.length > 0)
        assertCompletionItemContains(items, '@+', '\\sum')
        assertCompletionItemDoesNotContain(items, '@+', '\\bigcup')
        assertCompletionItemContains(items, '@M', '\\sum')
        assertCompletionItemDoesNotContain(items, '@8')
    })

})
