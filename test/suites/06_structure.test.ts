import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import rimraf from 'rimraf'

import { Extension } from '../../src/main'
import { sleep, getExtension, runTest, openActive, loadTestFile } from './utils'
import { SectionNodeProvider } from '../../src/providers/structure'

async function loadTestFiles(fixture: string) {
    await loadTestFile(fixture, [
        {src: 'structure_base.tex', dst: 'main.tex'},
        {src: 'structure_sub.tex', dst: 'sub/s.tex'},
        {src: 'structure_s2.tex', dst: 'sub/s2.tex'},
        {src: 'structure_s3.tex', dst: 'sub/s3.tex'}
    ])
}

suite('Document structure test suite', () => {

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

        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.numbers.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.sections', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.number.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.caption.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.fastparse.enabled', undefined)

        if (path.basename(fixture) === 'testground') {
            rimraf(fixture + '/{*,.vscode/*}', (e) => {if (e) {console.error(e)}})
            await sleep(500) // Required for pooling
        }
    })

    runTest({suiteName, fixtureName, testName: 'test structure'}, async () => {
        await loadTestFiles(fixture)
        await openActive(extension, fixture, 'main.tex')
        assert.ok(extension)
        const structure = new SectionNodeProvider(extension)
        await structure.update(true)
        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections.length, 6)
        assert.strictEqual(sections[0].children.length, 3)
        assert.strictEqual(sections[0].children[1].children.length, 2)
        assert.strictEqual(sections[0].children[1].children[0].label, '#label: sec11')
        assert.strictEqual(sections[0].children[1].children[0].lineNumber, 5)
        assert.strictEqual(sections[1].children.length, 1)
        assert.strictEqual(sections[1].children[0].label, '2.0.1 2.0.1')
        assert.strictEqual(sections[3].label, '4 4 A long title split over two lines')
        assert.strictEqual(sections[4].label, '* No \\textit{Number} Section')
        assert.strictEqual(sections[5].label, '5 Section pdf Caption')
        assert.strictEqual(sections[5].children[0].label, 'Figure 1')
        assert.strictEqual(sections[5].children[1].label, 'Figure 2: Figure Caption')
        assert.strictEqual(sections[5].children[2].label, 'Table 1: Table Caption')
        assert.strictEqual(sections[5].children[3].label, 'Frame 1: Frame Title 1')
        assert.strictEqual(sections[5].children[4].label, 'Frame 2: Frame Title 2')
        assert.strictEqual(sections[5].children[5].label, 'Frame 3')
    })

    runTest({suiteName, fixtureName, testName: 'test view.outline.numbers.enabled'}, async () => {
        await loadTestFiles(fixture)
        await openActive(extension, fixture, 'main.tex')
        assert.ok(extension)
        const structure = new SectionNodeProvider(extension)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.numbers.enabled', false)
        await structure.update(true)
        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections[1].children[0].label, '2.0.1')
    })

    runTest({suiteName, fixtureName, testName: 'test view.outline.sections'}, async () => {
        await loadTestFiles(fixture)
        await openActive(extension, fixture, 'main.tex')
        assert.ok(extension)
        const structure = new SectionNodeProvider(extension)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.sections', ['section', 'altsection', 'subsubsection'])
        await structure.update(true)
        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections[0].children.length, 2)
        assert.strictEqual(sections[0].children[1].label, '1.1 1.1?')
    })

    runTest({suiteName, fixtureName, testName: 'test view.outline.floats.enabled'}, async () => {
        await loadTestFiles(fixture)
        await openActive(extension, fixture, 'main.tex')
        assert.ok(extension)
        const structure = new SectionNodeProvider(extension)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.enabled', false)
        await structure.update(true)
        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections[5].children.length, 3)
        assert.strictEqual(sections[5].children[0].label, 'Frame 1: Frame Title 1')
        assert.strictEqual(sections[5].children[1].label, 'Frame 2: Frame Title 2')
        assert.strictEqual(sections[5].children[2].label, 'Frame 3')
    })

    runTest({suiteName, fixtureName, testName: 'test view.outline.floats.number.enabled'}, async () => {
        await loadTestFiles(fixture)
        await openActive(extension, fixture, 'main.tex')
        assert.ok(extension)
        const structure = new SectionNodeProvider(extension)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.number.enabled', false)
        await structure.update(true)
        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections[5].children.length, 6)
        assert.strictEqual(sections[5].children[0].label, 'Figure')
        assert.strictEqual(sections[5].children[1].label, 'Figure: Figure Caption')
        assert.strictEqual(sections[5].children[2].label, 'Table: Table Caption')
        assert.strictEqual(sections[5].children[3].label, 'Frame: Frame Title 1')
        assert.strictEqual(sections[5].children[4].label, 'Frame: Frame Title 2')
        assert.strictEqual(sections[5].children[5].label, 'Frame')
    })

    runTest({suiteName, fixtureName, testName: 'test view.outline.floats.caption.enabled'}, async () => {
        await loadTestFiles(fixture)
        await openActive(extension, fixture, 'main.tex')
        assert.ok(extension)
        const structure = new SectionNodeProvider(extension)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.caption.enabled', false)
        await structure.update(true)
        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections[5].children.length, 6)
        assert.strictEqual(sections[5].children[0].label, 'Figure 1')
        assert.strictEqual(sections[5].children[1].label, 'Figure 2')
        assert.strictEqual(sections[5].children[2].label, 'Table 1')
        assert.strictEqual(sections[5].children[3].label, 'Frame 1')
        assert.strictEqual(sections[5].children[4].label, 'Frame 2')
        assert.strictEqual(sections[5].children[5].label, 'Frame 3')
    })

    runTest({suiteName, fixtureName, testName: 'test view.outline.fastparse.enabled'}, async () => {
        await loadTestFiles(fixture)
        await openActive(extension, fixture, 'main.tex')
        assert.ok(extension)
        const structure = new SectionNodeProvider(extension)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.fastparse.enabled', true)
        await structure.update(true)
        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections.length, 6)
        assert.strictEqual(sections[0].children.length, 3)
        assert.strictEqual(sections[0].children[1].children.length, 2)
        assert.strictEqual(sections[0].children[1].children[0].label, '#label: sec11')
        assert.strictEqual(sections[0].children[1].children[0].lineNumber, 5)
        assert.strictEqual(sections[1].children.length, 1)
        assert.strictEqual(sections[1].children[0].label, '2.0.1 2.0.1')
        assert.strictEqual(sections[3].label, '4 4 A long title split over two lines')
        assert.strictEqual(sections[4].label, '* No \\textit{Number} Section')
        assert.strictEqual(sections[5].label, '5 Section pdf Caption')
        assert.strictEqual(sections[5].children[0].label, 'Figure 1')
        assert.strictEqual(sections[5].children[1].label, 'Figure 2: Figure Caption')
        assert.strictEqual(sections[5].children[2].label, 'Table 1: Table Caption')
        assert.strictEqual(sections[5].children[3].label, 'Frame 1: Frame Title 1')
        assert.strictEqual(sections[5].children[4].label, 'Frame 2: Frame Title 2')
        assert.strictEqual(sections[5].children[5].label, 'Frame 3')
    })
})
