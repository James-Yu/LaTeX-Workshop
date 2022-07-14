import * as vscode from 'vscode'
import * as path from 'path'
import { getFixtureDir, runUnitTestWithFixture, waitLatexWorkshopActivated } from '../../utils/ciutils'
import assert from 'assert'

import { ChkTeX } from '../../../src/components/linters/chktex'
import { LaCheck } from '../../../src/components/linters/lacheck'

suite('unit test suite', () => {

    runUnitTestWithFixture('fixture030_linter', 'test chktex', async () => {
        const fixtureDir = getFixtureDir()
        const texFilePath = path.join(fixtureDir, 'main.tex')
        const subFilePath = path.join(fixtureDir, 'sub/sub.tex')
        const extension = (await waitLatexWorkshopActivated()).exports.realExtension
        assert.ok(extension)
        extension.manager.rootFile = texFilePath
        const linter = new ChkTeX(extension)
        await linter.lintRootFile()
        const diags = linter.logParser.getDisgnostics()
        assert.strictEqual(diags.get(vscode.Uri.file(texFilePath))?.length, 1)
        assert.strictEqual(diags.get(vscode.Uri.file(subFilePath))?.length, 1)
        assert.match(diags.get(vscode.Uri.file(texFilePath))?.[0].message || '', /Delete this space/)
        assert.match(diags.get(vscode.Uri.file(subFilePath))?.[0].message || '', /Delete this space/)
    })

    runUnitTestWithFixture('fixture030_linter', 'test lacheck', async () => {
        const fixtureDir = getFixtureDir()
        const texFilePath = path.join(fixtureDir, 'main.tex')
        const subFilePath = path.join(fixtureDir, 'sub/sub.tex')
        const extension = (await waitLatexWorkshopActivated()).exports.realExtension
        assert.ok(extension)
        extension.manager.rootFile = texFilePath
        const linter = new LaCheck(extension)
        await linter.lintRootFile()
        const diags = linter.logParser.getDisgnostics()
        assert.strictEqual(diags.get(vscode.Uri.file(texFilePath))?.length, 1)
        assert.strictEqual(diags.get(vscode.Uri.file(subFilePath))?.length, 1)
        assert.match(diags.get(vscode.Uri.file(texFilePath))?.[0].message || '', /double space at/)
        assert.match(diags.get(vscode.Uri.file(subFilePath))?.[0].message || '', /double space at/)
    })
})
