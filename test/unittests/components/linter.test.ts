import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { getFixtureDir, runUnitTestWithFixture, waitLatexWorkshopActivated } from '../../utils/ciutils'
import assert from 'assert'

import { ChkTeX } from '../../../src/components/linterlib/chktex'
import { LaCheck } from '../../../src/components/linterlib/lacheck'

suite('linter test suite', () => {

    runUnitTestWithFixture('fixture030_linter', 'test chktex', async () => {
        const fixtureDir = getFixtureDir()
        const texFilePath = path.join(fixtureDir, 'main.tex')
        const extension = (await waitLatexWorkshopActivated()).exports.realExtension
        assert.ok(extension)
        extension.manager.rootFile = texFilePath
        const linter = new ChkTeX(extension)
        await linter.lintRootFile()
        assert.strictEqual(linter.linterDiagnostics.name, 'ChkTeX')
    })

    runUnitTestWithFixture('fixture030_linter', 'test chktex log parser', async () => {
        const fixtureDir = getFixtureDir()
        const texFilePath = path.join(fixtureDir, 'main.tex')
        const subFilePath = path.join(fixtureDir, 'sub/sub.tex')
        const extension = (await waitLatexWorkshopActivated()).exports.realExtension
        assert.ok(extension)
        extension.manager.rootFile = texFilePath
        const linter = new ChkTeX(extension)
        const log = fs.readFileSync(path.join(fixtureDir, 'chktex.linterlog')).toString()
        linter.parseLog(log)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(texFilePath))?.length, 1)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(subFilePath))?.length, 1)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(texFilePath))?.[0].message || '', /Delete this space/)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(subFilePath))?.[0].message || '', /Delete this space/)
    })

    runUnitTestWithFixture('fixture030_linter', 'test lacheck', async () => {
        const fixtureDir = getFixtureDir()
        const texFilePath = path.join(fixtureDir, 'main.tex')
        const extension = (await waitLatexWorkshopActivated()).exports.realExtension
        assert.ok(extension)
        extension.manager.rootFile = texFilePath
        const linter = new LaCheck(extension)
        await linter.lintRootFile()
        assert.strictEqual(linter.linterDiagnostics.name, 'LaCheck')
    })

    runUnitTestWithFixture('fixture030_linter', 'test lacheck log parser', async () => {
        const fixtureDir = getFixtureDir()
        const texFilePath = path.join(fixtureDir, 'main.tex')
        const subFilePath = path.join(fixtureDir, 'sub/sub.tex')
        const extension = (await waitLatexWorkshopActivated()).exports.realExtension
        assert.ok(extension)
        extension.manager.rootFile = texFilePath
        const linter = new LaCheck(extension)
        const log = fs.readFileSync(path.join(fixtureDir, 'lacheck.linterlog')).toString()
        linter.parseLog(log)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(texFilePath))?.length, 1)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(subFilePath))?.length, 1)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(texFilePath))?.[0].message || '', /double space at/)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(subFilePath))?.[0].message || '', /double space at/)
    })
})
