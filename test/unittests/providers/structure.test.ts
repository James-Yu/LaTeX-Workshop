import * as vscode from 'vscode'
import * as path from 'path'
import {getFixtureDir, runUnitTestWithFixture, waitLatexWorkshopActivated} from '../../utils/ciutils'
import assert from 'assert'

import {SectionNodeProvider} from '../../../src/providers/structure'

async function resetConfig() {
    const config = vscode.workspace.getConfiguration()
    await config.update('latex-workshop.view.outline.numbers.enabled', undefined)
    await config.update('latex-workshop.view.outline.sections', undefined)
    await config.update('latex-workshop.view.outline.floats.enabled', undefined)
    await config.update('latex-workshop.view.outline.fastparse.enabled', undefined)
}

suite('unit test suite', () => {

    suiteSetup(resetConfig)

    runUnitTestWithFixture('fixture020_structure', 'test structure', async () => {
        const fixtureDir = getFixtureDir()
        const texFilePath = path.join(fixtureDir, 'main.tex')
        const extension = (await waitLatexWorkshopActivated()).exports.realExtension
        assert.ok(extension)
        extension.manager.rootFile = texFilePath
        const structure = new SectionNodeProvider(extension)
        await structure.update(true)
        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections.length, 6)
        assert.strictEqual(sections[0].children.length, 3)
        assert.strictEqual(sections[0].children[1].children.length, 2)
        assert.strictEqual(sections[0].children[1].children[0].label, '#label: sec11')
        assert.strictEqual(sections[0].children[1].children[0].lineNumber, 8)
        assert.strictEqual(sections[1].children.length, 1)
        assert.strictEqual(sections[1].children[0].label, '2.0.1 2.0.1')
        assert.strictEqual(sections[3].label, '4 4 A long title split over two lines')
        assert.strictEqual(sections[4].label, '* No \\textit{Number} Section')
        assert.strictEqual(sections[5].label, '5 Section pdf Caption')
        assert.strictEqual(sections[5].children[0].label, 'Figure: Untitled')
        assert.strictEqual(sections[5].children[1].label, 'Figure: Figure Caption')
        assert.strictEqual(sections[5].children[2].label, 'Table: Table Caption')
        assert.strictEqual(sections[5].children[3].label, 'Frame: Frame Title 1')
        assert.strictEqual(sections[5].children[4].label, 'Frame: Frame Title 2')
        assert.strictEqual(sections[5].children[5].label, 'Frame: Untitled')
    })

    runUnitTestWithFixture('fixture020_structure', 'view.outline.numbers.enabled', async () => {
        const fixtureDir = getFixtureDir()
        const texFilePath = path.join(fixtureDir, 'main.tex')
        const config = vscode.workspace.getConfiguration()
        await config.update('latex-workshop.view.outline.numbers.enabled', false)
        const extension = (await waitLatexWorkshopActivated()).exports.realExtension
        assert.ok(extension)
        extension.manager.rootFile = texFilePath
        const structure = new SectionNodeProvider(extension)
        await structure.update(true)
        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections[1].children[0].label, '2.0.1')
    })

    runUnitTestWithFixture('fixture020_structure', 'view.outline.sections', async () => {
        const fixtureDir = getFixtureDir()
        const texFilePath = path.join(fixtureDir, 'main.tex')
        const config = vscode.workspace.getConfiguration()
        await config.update('latex-workshop.view.outline.sections', [
            'section',
            'altsection',
            'subsubsection'
        ])
        const extension = (await waitLatexWorkshopActivated()).exports.realExtension
        assert.ok(extension)
        extension.manager.rootFile = texFilePath
        const structure = new SectionNodeProvider(extension)
        await structure.update(true)
        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections[0].children.length, 2)
        assert.strictEqual(sections[0].children[1].label, '1.1 1.1?')
    })

    runUnitTestWithFixture('fixture020_structure', 'view.outline.floats.enabled', async () => {
        const fixtureDir = getFixtureDir()
        const texFilePath = path.join(fixtureDir, 'main.tex')
        const config = vscode.workspace.getConfiguration()
        await config.update('latex-workshop.view.outline.floats.enabled', false)
        const extension = (await waitLatexWorkshopActivated()).exports.realExtension
        assert.ok(extension)
        extension.manager.rootFile = texFilePath
        const structure = new SectionNodeProvider(extension)
        await structure.update(true)
        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections[5].children.length, 3)
        assert.strictEqual(sections[5].children[0].label, 'Frame: Frame Title 1')
        assert.strictEqual(sections[5].children[1].label, 'Frame: Frame Title 2')
        assert.strictEqual(sections[5].children[2].label, 'Frame: Untitled')
    })

    runUnitTestWithFixture('fixture020_structure', 'view.outline.fastparse.enabled', async () => {
        const fixtureDir = getFixtureDir()
        const texFilePath = path.join(fixtureDir, 'main.tex')
        const config = vscode.workspace.getConfiguration()
        await config.update('latex-workshop.view.outline.fastparse.enabled', true)
        const extension = (await waitLatexWorkshopActivated()).exports.realExtension
        assert.ok(extension)
        extension.manager.rootFile = texFilePath
        const structure = new SectionNodeProvider(extension)
        await structure.update(true)
        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections.length, 6)
        assert.strictEqual(sections[0].children.length, 3)
        assert.strictEqual(sections[0].children[1].children.length, 2)
        assert.strictEqual(sections[0].children[1].children[0].label, '#label: sec11')
        assert.strictEqual(sections[0].children[1].children[0].lineNumber, 8)
        assert.strictEqual(sections[1].children.length, 1)
        assert.strictEqual(sections[1].children[0].label, '2.0.1 2.0.1')
        assert.strictEqual(sections[3].label, '4 4 A long title split over two lines')
        assert.strictEqual(sections[4].label, '* No \\textit{Number} Section')
        assert.strictEqual(sections[5].label, '5 Section pdf Caption')
        assert.strictEqual(sections[5].children[0].label, 'Figure: Untitled')
        assert.strictEqual(sections[5].children[1].label, 'Figure: Figure Caption')
        assert.strictEqual(sections[5].children[2].label, 'Table: Table Caption')
        assert.strictEqual(sections[5].children[3].label, 'Frame: Frame Title 1')
        assert.strictEqual(sections[5].children[4].label, 'Frame: Frame Title 2')
        assert.strictEqual(sections[5].children[5].label, 'Frame: Untitled')
    })

    teardown(async () => {
        await resetConfig()
        const extension = (await waitLatexWorkshopActivated()).exports.realExtension
        if (extension) {
            extension.manager.rootFile = undefined
        }
    })
})
