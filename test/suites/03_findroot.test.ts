import * as vscode from 'vscode'
import * as path from 'path'
import rimraf from 'rimraf'
import * as assert from 'assert'

import { Extension } from '../../src/main'
import { assertRoot, getExtension, runTest, writeTeX } from './utils'
import { sleep } from '../utils/ciutils'

suite('Find root file test suite', () => {

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
        extension.manager.rootFile = undefined

        if (path.basename(fixture) === 'testground') {
            rimraf(fixture + '/{*,.vscode/*}', (e) => {if (e) {console.error(e)}})
            await sleep(500) // Required for pooling
        }
    })


    runTest({suiteName, fixtureName, testName: 'detect root with search.rootFiles.include'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.include', ['alt/*.tex'])
        await writeTeX('subfiletwomain', fixture)
        assert.ok(extension)
        await assertRoot({fixture, openName: 'sub/s.tex', rootName: 'alt/main.tex', extension})
    })

    runTest({suiteName, fixtureName, testName: 'detect root with search.rootFiles.exclude'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.exclude', ['*.tex'])
        await writeTeX('subfiletwomain', fixture)
        assert.ok(extension)
        await assertRoot({fixture, openName: 'sub/s.tex', rootName: 'alt/main.tex', extension})
    })

    runTest({suiteName, fixtureName, testName: 'auto-detect root with verbatim'}, async () => {
        await writeTeX('subfileverbatim', fixture)
        assert.ok(extension)
        await assertRoot({fixture, openName: 'sub/s.tex', rootName: 'main.tex', extension})
    })

    runTest({suiteName, fixtureName, testName: 'import package'}, async () => {
        await writeTeX('importthreelayer', fixture)
        assert.ok(extension)
        await assertRoot({fixture, openName: 'sub/subsub/sss/sss.tex', rootName: 'main.tex', extension})
    })

    runTest({suiteName, fixtureName, testName: 'circular inclusion'}, async () => {
        await writeTeX('circularinclude', fixture)
        assert.ok(extension)
        await assertRoot({fixture, openName: 'alt.tex', rootName: 'main.tex', extension})
        const includedTeX = extension.manager.getIncludedTeX()
        assert.ok(includedTeX)
        assert.ok(includedTeX.includes(path.resolve(fixture, 'main.tex')))
        assert.ok(includedTeX.includes(path.resolve(fixture, 'alt.tex')))
        assert.ok(includedTeX.includes(path.resolve(fixture, 'sub/s.tex')))
    })
})
