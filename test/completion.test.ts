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


suite('Completion test suite', () => {

    suiteSetup(() => {
        const config = vscode.workspace.getConfiguration()
        if (process.env['LATEXWORKSHOP_CI_ENABLE_DOCKER']) {
            config.update('latex-workshop.docker.enabled', true, vscode.ConfigurationTarget.Global)
        }
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
        const items = await extension.exports.completer.provideCompletionItems?.(doc, pos, token, {triggerKind: vscode.CompletionTriggerKind.Invoke})
        assert.ok(items && items.length > 0)
    })

})
