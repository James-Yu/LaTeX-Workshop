import * as vscode from 'vscode'
import * as path from 'path'
import rimraf from 'rimraf'
import * as assert from 'assert'

import { Extension } from '../../src/main'
import { getExtension, getIntellisense, runTest, writeTeX } from './utils'
import { sleep } from '../utils/ciutils'

suite('Intellisense test suite', () => {

    let extension: Extension
    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/testground')
    const fixtureName = 'testground'

    suiteSetup(async () => {
        extension = await getExtension()
        fixture = path.resolve(extension.extensionRoot, 'test/fixtures/testground')
    })

    setup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        if (extension) {
            extension.manager.invalidateCache()
            extension.manager.rootFile = undefined
        }

        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.atSuggestion.trigger.latex', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.atSuggestionJSON.replace', undefined)

        if (path.basename(fixture) === 'testground') {
            rimraf(fixture + '/{*,.vscode}', (e) => {if (e) {console.error(e)}})
            await sleep(500) // Required for pooling
        }
    })

    runTest({suiteName, fixtureName, testName: 'basic completion'}, async () => {
        await writeTeX('intellisense', fixture)
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'main.tex')))
        await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()
        const items = getIntellisense(doc, new vscode.Position(7, 1), extension)
        assert.ok(items && items.length > 0)
    })

    runTest({suiteName, fixtureName, testName: '@-snippet completion'}, async () => {
        const replaces = {'@+': '\\sum', '@8': '', '@M': '\\sum'}
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.atSuggestionJSON.replace', replaces)
        await writeTeX('intellisense', fixture)
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'main.tex')))
        await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()
        const items = getIntellisense(doc, new vscode.Position(8, 1), extension, true)
        assert.ok(items && items.length > 0)
        assert.ok(items.find(item => item.label === '@+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\sum'))
        assert.ok(undefined === items.find(item => item.label === '@+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\bigcup'))
        assert.ok(items.find(item => item.label === '@M' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\sum'))
        assert.ok(undefined === items.find(item => item.label === '@8'))
    })

    runTest({suiteName, fixtureName, testName: '@-snippet completion with trigger #'}, async () => {
        const replaces = {'@+': '\\sum', '@8': ''}
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.atSuggestionJSON.replace', replaces)
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.atSuggestion.trigger.latex', '#')
        await writeTeX('intellisense', fixture)
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'main.tex')))
        await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()
        const items = getIntellisense(doc, new vscode.Position(9, 1), extension, true)
        assert.ok(items && items.length > 0)
        assert.ok(items.find(item => item.label === '#+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\sum'))
        assert.ok(items.find(item => item.label === '#ve' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\varepsilon'))
        assert.ok(undefined === items.find(item => item.label === '@+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\bigcup'))
        assert.ok(undefined === items.find(item => item.label === '#+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\bigcup'))
        assert.ok(undefined === items.find(item => item.label === '#8'))
    })

    runTest({suiteName, fixtureName, testName: 'glossary completion'}, async () => {
        await writeTeX('intellisense', fixture)
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'main.tex')))
        await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()

        const content = extension?.manager.getDirtyContent(path.resolve(fixture, 'sub/glossary.tex'))
        assert.ok(content)
        await extension?.manager.updateCompleter(path.resolve(fixture, 'sub/glossary.tex'), content)

        const items = getIntellisense(doc, new vscode.Position(5, 5), extension)
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
