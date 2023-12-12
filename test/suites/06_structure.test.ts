import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import { lw } from '../../src/lw'
import * as test from './utils'

// async function loadTestFiles(fixture: string) {
//     await test.load(fixture, [
//         {src: 'structure_base.tex', dst: 'main.tex'},
//         {src: 'structure_sub.tex', dst: 'sub/s.tex'},
//         {src: 'structure_s2.tex', dst: 'sub/s2.tex'},
//         {src: 'structure_s3.tex', dst: 'sub/s3.tex'}
//     ])
// }

suite('Document structure test suite', () => {
    test.suite.name = path.basename(__filename).replace('.test.js', '')
    test.suite.fixture = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'never')
    })

    teardown(async () => {
        await test.reset()

        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.numbers.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.commands', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.sections', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.number.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.caption.enabled', undefined)
    })

    test.run('basic structure', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'structure/sections.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure.length, 2)
    })

    test.run('section without numbering via `view.outline.numbers.enabled`', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.numbers.enabled', false)
        await test.load(fixture, [
            {src: 'structure/sections.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure[0].label, 'Section 1')
        assert.strictEqual(structure[1].label, 'Section 2')
    })

    test.run('nested sections', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'structure/section_nest.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure.length, 1)
        assert.strictEqual(structure[0].children[0].label, '1.1 Section 1.1')
        assert.strictEqual(structure[0].children[0].children[0].label, '1.1.1 Section 1.1.1')
    })

    test.run('nested sections with level gap', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'structure/section_nest_gap.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure[0].children[0].label, '1.0.1 Section 1.0.1')
    })

    test.run('sections before root-level section', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'structure/section_before_root_level.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure.length, 3)
    })

    test.run('sections with asterisks', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'structure/section_asterisk.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure[0].label, '1 Section 1')
        assert.strictEqual(structure[1].label, '* Section *')
        assert.strictEqual(structure[1].children[0].label, '1.1 Section 1.1')
        assert.strictEqual(structure[1].children[1].label, '* Section *')
    })

    test.run('sections with atypical titles', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'structure/section_title.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure[0].label, '1 Title with line break')
        assert.strictEqual(structure[1].label, '2 Title with pdf switch')
        assert.strictEqual(structure[2].label, '3 Title with \\textit{macros}')
        assert.strictEqual(structure[3].label, '4 Short')
    })

    test.run('custom sections via `view.outline.sections`', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.sections', ['customsection', 'subsubsection'])
        await test.load(fixture, [
            {src: 'structure/section_custom.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure[0].label, '1 Section 1')
        assert.strictEqual(structure[0].children[0].label, '1.1 Section 1.1')
    })

    test.run('custom section hierarchy via `view.outline.sections`', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.sections', ['section', 'subsection|subsubsection'])
        await test.load(fixture, [
            {src: 'structure/section_nest.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure[0].label, '1 Section 1')
        assert.strictEqual(structure[0].children[0].label, '1.1 Section 1.1')
        assert.strictEqual(structure[0].children[1].label, '1.2 Section 1.1.1')
    })

    test.run('section with labels', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'structure/labels.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure[0].children[0].label, '#label: sec-1')
        assert.strictEqual(structure[0].children[1].children[0].label, '#label: sec-11')
    })

    test.run('custom commands via `view.outline.commands`', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.commands', ['note'])
        await test.load(fixture, [
            {src: 'structure/commands.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure[0].children[0].label, '#note: A note')
    })

    test.run('basic frame', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'structure/frames.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure[0].label, 'Frame 1')
    })

    test.run('float without numbering via `view.outline.floats.number.enabled`', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.number.enabled', false)
        await test.load(fixture, [
            {src: 'structure/frames.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure[0].label, 'Frame')
    })

    test.run('frame title', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'structure/frame_title.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure[0].label, 'Frame 1: Frame 1')
        assert.strictEqual(structure[1].label, 'Frame 2: Frame 2')
        assert.strictEqual(structure[2].label, 'Frame 3: Frame 3')
        assert.strictEqual(structure[3].label, 'Frame 4: Frame 4')
        assert.strictEqual(structure[4].label, 'Frame 5')
    })

    test.run('frames without title via `view.outline.floats.caption.enabled`', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.caption.enabled', false)
        await test.load(fixture, [
            {src: 'structure/frame_title.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure[0].label, 'Frame 1')
    })

    test.run('basic floats', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'structure/floats.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure[0].label, 'Table 1: Table 1')
        assert.strictEqual(structure[1].label, 'Figure 1')
        assert.strictEqual(structure[2].label, 'Figure 2')
    })

    test.run('nested floats', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'structure/float_nest.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure[0].label, 'Table 1: Table 1')
        assert.strictEqual(structure[0].children[0].label, 'Figure 1')
    })

    test.run('disable floats via `view.outline.floats.enabled`', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.enabled', false)
        await test.load(fixture, [
            {src: 'structure/floats.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure[0].label, 'Frame 1')
    })

    test.run('floats without title via `view.outline.floats.caption.enabled`', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.caption.enabled', false)
        await test.load(fixture, [
            {src: 'structure/floats.tex', dst: 'main.tex'}
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure[0].label, 'Table 1')
    })

    test.run('input subfiles', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'structure/subfiles.tex', dst: 'main.tex'},
            {src: 'structure/subfiles_s1.tex', dst: 'sub/s1.tex'},
            {src: 'structure/subfiles_s2.tex', dst: 'sub/s2.tex'},
            {src: 'structure/subfiles_s3.tex', dst: 'sub/s3.tex'},
        ])
        const structure = await lw.outline.reconstruct()
        assert.strictEqual(structure[0].label, '1 Section 1')
        assert.strictEqual(structure[0].children[0].label, '1.1 Section 1.1')
        assert.strictEqual(structure[0].children[0].children[0].label, '1.1.1 Section 1.1.1')
        assert.strictEqual(structure[1].label, '2 Section 2')
        assert.strictEqual(structure[2].label, '3 Section 3')
        assert.strictEqual(structure[2].children[0].label, '3.0.1 Section 3.0.1')
    })
})
