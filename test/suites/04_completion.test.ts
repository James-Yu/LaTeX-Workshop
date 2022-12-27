import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'

import { Extension, activate } from '../../src/main'
import { runTest, sleep } from './utils'


suite('Completion test suite', () => {

    let extension: Extension | undefined
    const suiteName = path.basename(__filename).replace('.test.js', '')

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        extension = vscode.extensions.getExtension<ReturnType<typeof activate>>('James-Yu.latex-workshop')?.exports.extension
        assert.ok(extension)
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.intellisense.atSuggestion.trigger.latex', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.intellisense.atSuggestionJSON.replace', undefined)
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'basic completion'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_017.tex'])
        const texFileName = 'main_017.tex'
        const texFilePath = vscode.Uri.file(path.join(fixture, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()
        const items = extension?.completer.provideCompletionItems(
            doc, new vscode.Position(9,1), new vscode.CancellationTokenSource().token, {
                triggerKind: vscode.CompletionTriggerKind.Invoke,
                triggerCharacter: undefined
            }
        )
        assert.ok(items && items.length > 0)
    })

    runTest({suiteName, fixtureName: 'basic', testName: '@-snippet completion'}, async (fixture: string) => {
        const replaces = {
            '@+': '\\sum',
            '@8': '',
            '@M': '\\sum'
        }
        await vscode.workspace.getConfiguration().update('latex-workshop.intellisense.atSuggestionJSON.replace', replaces)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_017.tex'])
        const texFileName = 'main_017.tex'
        const texFilePath = vscode.Uri.file(path.join(fixture, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()
        const items = extension?.atSuggestionCompleter.provideCompletionItems(
            doc, new vscode.Position(10,1), new vscode.CancellationTokenSource().token, {
                triggerKind: vscode.CompletionTriggerKind.Invoke,
                triggerCharacter: undefined
            }
        )
        assert.ok(items && items.length > 0)
        assert.ok(items.find(item => item.label === '@+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\sum'))
        assert.ok(undefined === items.find(item => item.label === '@+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\bigcup'))
        assert.ok(items.find(item => item.label === '@M' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\sum'))
        assert.ok(undefined === items.find(item => item.label === '@8'))
    })

    runTest({suiteName, fixtureName: 'basic', testName: '@-snippet completion with trigger #'}, async (fixture: string) => {
        const replaces = {
            '@+': '\\sum',
            '@8': ''
        }
        await vscode.workspace.getConfiguration().update('latex-workshop.intellisense.atSuggestionJSON.replace', replaces)
        await vscode.workspace.getConfiguration().update('latex-workshop.intellisense.atSuggestion.trigger.latex', '#')
        await sleep(500)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_017.tex'])
        const texFileName = 'main_017.tex'
        const texFilePath = vscode.Uri.file(path.join(fixture, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()
        const items = extension?.atSuggestionCompleter.provideCompletionItems(
            doc, new vscode.Position(11,1), new vscode.CancellationTokenSource().token, {
                triggerKind: vscode.CompletionTriggerKind.Invoke,
                triggerCharacter: undefined
            }
        )
        assert.ok(items && items.length > 0)
        assert.ok(items.find(item => item.label === '#+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\sum'))
        assert.ok(items.find(item => item.label === '#ve' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\varepsilon'))
        assert.ok(undefined === items.find(item => item.label === '@+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\bigcup'))
        assert.ok(undefined === items.find(item => item.label === '#+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\bigcup'))
        assert.ok(undefined === items.find(item => item.label === '#8'))
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'glossary completion'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_017.tex'])
        const texFileName = 'main_017.tex'
        const texFilePath = vscode.Uri.file(path.join(fixture, texFileName))
        const glossaryFileName = 'sub_017/glossary.tex'
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()
        const content = extension?.manager.getDirtyContent(path.join(fixture, glossaryFileName))
        assert.ok(content)
        await extension?.manager.updateCompleter(path.join(fixture, glossaryFileName), content)
        const items = extension?.completer.provideCompletionItems(
            doc, new vscode.Position(6,5), new vscode.CancellationTokenSource().token, {
                triggerKind: vscode.CompletionTriggerKind.Invoke,
                triggerCharacter: undefined
            }
        )
        assert.ok(items && items.length === 7)
        assert.ok(items.find(item => item.label === 'rf' && item.detail === 'radio-frequency'))
        assert.ok(items.find(item => item.label === 'te' && item.detail === 'Transverse Magnetic'))
        assert.ok(items.find(item => item.label === 'E_P' && item.detail === 'Elastic $\\varepsilon$ toto'))
        assert.ok(items.find(item => item.label === 'lw' && item.detail === 'What this extension is $\\mathbb{A}$'))
        assert.ok(items.find(item => item.label === 'vs_code' && item.detail === 'Editor'))
        assert.ok(items.find(item => item.label === 'abbr_y' && item.detail === 'A second abbreviation'))
        assert.ok(items.find(item => item.label === 'abbr_x' && item.detail === 'A first abbreviation'))
    })

})
