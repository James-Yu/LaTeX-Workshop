import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'

import { Extension, activate } from '../../src/main'
import { runTest } from './utils'


suite('Detect root file test suite', () => {

    let extension: Extension | undefined
    const suiteName = path.basename(__filename).replace('.test.js', '')

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        extension = vscode.extensions.getExtension<ReturnType<typeof activate>>('James-Yu.latex-workshop')?.exports.extension
        assert.ok(extension)
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'import package'}, async (fixture: string) => {
        const texFileName = 'sub_003/lmn/uvw/two.tex'
        const mainFileName = 'main_003.tex'
        const texFilePath = vscode.Uri.file(path.join(fixture, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()
        assert.strictEqual(extension?.manager.rootFile, path.join(fixture, mainFileName))
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'circular inclusion'}, async (fixture: string) => {
        const texFileName = 'main_016b.tex'
        const mainFileName = 'main_016.tex'
        const texFilePath = vscode.Uri.file(path.join(fixture, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()
        assert.strictEqual(extension?.manager.rootFile, path.join(fixture, mainFileName))
        const includedTeX = extension?.manager.getIncludedTeX()
        assert.ok(includedTeX)
        assert.ok(includedTeX.includes(path.join(fixture, texFileName)) && includedTeX.includes(path.join(fixture, mainFileName)) && includedTeX.includes(path.join(fixture, 'sub_004/s.tex')))
    })

})
