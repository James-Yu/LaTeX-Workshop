import * as assert from 'assert'
import * as path from 'path'

import * as process from 'process'
import * as vscode from 'vscode'

import {
    getFixtureDir,
    runTestWithFixture,
    waitLatexWorkshopActivated,
    waitRootFileFound
} from './utils'


suite('RootFile test suite', () => {

    suiteSetup(() => {
        const config = vscode.workspace.getConfiguration()
        if (process.env['LATEXWORKSHOP_CI_ENABLE_DOCKER']) {
            return config.update('latex-workshop.docker.enabled', true, vscode.ConfigurationTarget.Global)
        }
        return
    })

    runTestWithFixture('fixture001', 'import package', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 'abc/lmn/uvw/two.tex'
        const mainFileName = 'main.tex'
        const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        await vscode.window.showTextDocument(doc)
        const extension = await waitLatexWorkshopActivated()
        await waitRootFileFound()
        console.log(`rootFile: ${extension.exports.realExtension?.manager.rootFile}`)
        assert.strictEqual(extension.exports.realExtension?.manager.rootFile, path.join(fixtureDir, mainFileName))
    })

    runTestWithFixture('fixture002', 'circular inclusion', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 'a.tex'
        const tex2FileName = 'poo.tex'
        const mainFileName = 'main.tex'
        const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        await vscode.window.showTextDocument(doc)
        const extension = await waitLatexWorkshopActivated()
        await waitRootFileFound()
        console.log(`rootFile: ${extension.exports.realExtension?.manager.rootFile}`)
        assert.strictEqual(extension.exports.realExtension?.manager.rootFile, path.join(fixtureDir, mainFileName))
        if (extension.exports.realExtension) {
            extension.exports.realExtension.manager.rootFile = undefined
            await extension.exports.realExtension?.manager.findRoot()
            const includedTeX = extension.exports.realExtension.manager.getIncludedTeX()
            console.log(`rootFile: ${extension.exports.realExtension?.manager.rootFile}`)
            console.log(JSON.stringify(includedTeX))
            return assert.ok(includedTeX.includes(path.join(fixtureDir, texFileName)) && includedTeX.includes(path.join(fixtureDir, tex2FileName)) && includedTeX.includes(path.join(fixtureDir, mainFileName)))
        }
        assert.fail('Real extension is undefined.')
    })

})
