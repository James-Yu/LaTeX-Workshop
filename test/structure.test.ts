import * as assert from 'assert'
import * as path from 'path'
import * as process from 'process'
import * as vscode from 'vscode'

import {
    getFixtureDir,
    promisify,
    runTestWithFixture,
    waitLatexWorkshopActivated
} from './utils/ciutils'

suite('LaTeX project structure test suite', () => {

    suiteSetup(() => {
        const config = vscode.workspace.getConfiguration()
        if (process.env['LATEXWORKSHOP_CI_ENABLE_DOCKER']) {
            return config.update('latex-workshop.docker.enabled', true, vscode.ConfigurationTarget.Global)
        }
        return
    })

    runTestWithFixture('fixture001', 'basic section hierarchy', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 'main.tex'
        const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        const rootFileFound = promisify('findrootfileend')
        await vscode.window.showTextDocument(doc)
        await rootFileFound
        const extension = await waitLatexWorkshopActivated()
        await extension.exports.realExtension?.structureViewer.refreshView()
        const sections = extension.exports.realExtension?.structureViewer.getTreeData()
        assert.ok(sections)
        assert.strictEqual(sections.length, 2)
        assert.strictEqual(sections[0].children.length, 1)
        assert.strictEqual(sections[0].children[0].children.length, 1)
        assert.strictEqual(sections[1].children.length, 1)
        assert.strictEqual(sections[1].children[0].label, '2.0.1 Section 2.0.1')
    })

    runTestWithFixture('fixture002', '`view.outline.sections` and `view.outline.numbers.enabled`', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 'main.tex'
        const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        const rootFileFound = promisify('findrootfileend')
        await vscode.window.showTextDocument(doc)
        await rootFileFound
        const extension = await waitLatexWorkshopActivated()
        await extension.exports.realExtension?.structureViewer.refreshView()
        const sections = extension.exports.realExtension?.structureViewer.getTreeData()
        assert.ok(sections)
        assert.strictEqual(sections[0].children[0].label, 'Section 1.1.?')
        assert.strictEqual(sections[0].children[0].children.length, 1)
    })

    runTestWithFixture('fixture003', 'labels', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 'main.tex'
        const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        const rootFileFound = promisify('findrootfileend')
        await vscode.window.showTextDocument(doc)
        await rootFileFound
        const extension = await waitLatexWorkshopActivated()
        await extension.exports.realExtension?.structureViewer.refreshView()
        const sections = extension.exports.realExtension?.structureViewer.getTreeData()
        assert.ok(sections)
        assert.strictEqual(sections.length, 1)
        assert.strictEqual(sections[0].children.length, 2)
        assert.strictEqual(sections[0].children[1].children.length, 1)
        assert.strictEqual(sections[0].children[0].label, '#label: sec1')
        assert.strictEqual(sections[0].children[0].lineNumber, 3)
    })

    runTestWithFixture('fixture004', 'floats and captions', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 'main.tex'
        const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        const rootFileFound = promisify('findrootfileend')
        await vscode.window.showTextDocument(doc)
        await rootFileFound
        const extension = await waitLatexWorkshopActivated()
        await extension.exports.realExtension?.structureViewer.refreshView()
        const sections = extension.exports.realExtension?.structureViewer.getTreeData()
        assert.ok(sections)
        assert.strictEqual(sections.length, 6)
        assert.strictEqual(sections[0].label, 'Figure: Untitled')
        assert.strictEqual(sections[1].label, 'Figure: Figure Caption')
        assert.strictEqual(sections[2].label, 'Table: Table Caption')
        assert.strictEqual(sections[3].label, 'Frame: Frame Title 1')
        assert.strictEqual(sections[4].label, 'Frame: Frame Title 2')
        assert.strictEqual(sections[5].label, 'Frame: Untitled')
    })

    runTestWithFixture('fixture005', 'floats disabled', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 'main.tex'
        const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        const rootFileFound = promisify('findrootfileend')
        await vscode.window.showTextDocument(doc)
        await rootFileFound
        const extension = await waitLatexWorkshopActivated()
        await extension.exports.realExtension?.structureViewer.refreshView()
        const sections = extension.exports.realExtension?.structureViewer.getTreeData()
        assert.ok(sections)
        assert.strictEqual(sections.length, 3)
        assert.strictEqual(sections[0].label, 'Frame: Frame Title 1')
        assert.strictEqual(sections[1].label, 'Frame: Frame Title 2')
        assert.strictEqual(sections[2].label, 'Frame: Untitled')
    })

    runTestWithFixture('fixture006', 'inputs and imports and edge cases', async () => {
        const fixtureDir = getFixtureDir()
        const texFileName = 'main.tex'
        const texFilePath = vscode.Uri.file(path.join(fixtureDir, texFileName))
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        const rootFileFound = promisify('findrootfileend')
        await vscode.window.showTextDocument(doc)
        await rootFileFound
        const extension = await waitLatexWorkshopActivated()
        await extension.exports.realExtension?.structureViewer.refreshView()
        const sections = extension.exports.realExtension?.structureViewer.getTreeData()
        assert.ok(sections)
        assert.strictEqual(sections.length, 6)
        assert.strictEqual(sections[0].children.length, 2)
        assert.strictEqual(sections[1].children.length, 1)
        assert.strictEqual(sections[0].children[0].children.length, 1)
        assert.strictEqual(sections[0].children[1].children.length, 1)
        assert.strictEqual(sections[1].children[0].label, '2.0.1 2.0.1')
        assert.strictEqual(sections[3].label, '4 4 A long title split over two lines')
        assert.strictEqual(sections[4].label, '* No \\textit{Number} Section')
        assert.strictEqual(sections[5].label, '5 Section pdf Caption')
    })
})
