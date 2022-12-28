import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import rimraf from 'rimraf'
import * as assert from 'assert'

import { Extension, activate } from '../../src/main'
import { runTest, writeTeX } from './utils'
import { sleep } from '../utils/ciutils'

suite('Find root file test suite', () => {

    let extension: Extension | undefined
    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/testground')
    const fixtureName = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        extension = vscode.extensions.getExtension<ReturnType<typeof activate>>('James-Yu.latex-workshop')?.exports.extension
        assert.ok(extension)
        fixture = path.resolve(extension.extensionRoot, 'test/fixtures/testground')
    })

    setup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        if (extension) {
            extension.manager.rootFile = undefined
        }

        if (path.basename(fixture) === 'testground') {
            await sleep(250)
            rimraf(fixture + '/*', (e) => {if (e) {console.error(e)}})
            await sleep(250)
            fs.closeSync(fs.openSync(path.resolve(fixture, '.gitkeep'), 'a'))
        }
    })

    runTest({suiteName, fixtureName, testName: 'import package'}, async () => {
        await writeTeX('importthreelayer', fixture)
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'sub/subsub/sss/sss.tex')))
        await vscode.window.showTextDocument(doc)
        const root = await extension?.manager.findRoot()
        assert.strictEqual(root, path.resolve(fixture, 'main.tex'))
    })

    runTest({suiteName, fixtureName, testName: 'circular inclusion'}, async () => {
        await writeTeX('circularinclude', fixture)
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'alt.tex')))
        await vscode.window.showTextDocument(doc)
        const root = await extension?.manager.findRoot()
        assert.strictEqual(root, path.join(fixture, 'main.tex'))
        const includedTeX = extension?.manager.getIncludedTeX()
        assert.ok(includedTeX)
        assert.ok(
            includedTeX.includes(path.resolve(fixture, 'main.tex')) &&
            includedTeX.includes(path.resolve(fixture, 'alt.tex')) &&
            includedTeX.includes(path.resolve(fixture, 'sub/s.tex')))
    })
})
