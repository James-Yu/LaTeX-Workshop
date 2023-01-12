import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import rimraf from 'rimraf'
import * as lw from '../../src/lw'
import * as test from './utils'
import { resetCachedLog } from '../../src/components/logger'

suite('Formatter test suite', () => {

    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/testground')
    const fixtureName = 'testground'

    suiteSetup(() => {
        fixture = path.resolve(lw.extensionRoot, 'test/fixtures/testground')
    })

    setup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        resetCachedLog()
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        lw.manager.rootFile = undefined

        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.path', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.args', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.tab', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.surround', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.case', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.trailingComma', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sortby', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.handleDuplicates', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sort.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.align-equal.enabled', undefined)

        if (path.basename(fixture) === 'testground') {
            rimraf(fixture + '/{*,.vscode/*}', (e) => {if (e) {console.error(e)}})
            await test.sleep(500) // Required for pooling
        }
    })

    test.run(suiteName, fixtureName, 'test latex formatter', async () => {
        await test.load(fixture, [{src: 'formatter/latex_base.tex', dst: 'main.tex'}])
        await test.open(fixture, 'main.tex')
        const original = vscode.window.activeTextEditor?.document.getText()
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(1000)
        const formatted = vscode.window.activeTextEditor?.document.getText()
        assert.notStrictEqual(original, formatted)
    })

    test.run(suiteName, fixtureName, 'change latexindent.path on the fly', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.path', 'echo')
        await test.load(fixture, [{src: 'formatter/latex_base.tex', dst: 'main.tex'}])
        await test.open(fixture, 'main.tex')
        const original = vscode.window.activeTextEditor?.document.getText()
        // echo add a new \n to the end of stdin
        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.args', [original?.slice(0, -1)])
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(1000) // wait for formatter finish
        const echoed = vscode.window.activeTextEditor?.document.getText()
        assert.strictEqual(original, echoed)

        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.path', 'latexindent')
        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.args', ['-c', '%DIR%/', '%TMPFILE%', '-y=defaultIndent: \'%INDENT%\''])
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(1000) // wait for formatter finish
        const formatted = vscode.window.activeTextEditor?.document.getText()
        assert.notStrictEqual(original, formatted)
    })

    test.run(suiteName, fixtureName, 'test bibtex formatter', async () => {
        await test.load(fixture, [{src: 'formatter/bibtex_base.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')
        const original = vscode.window.activeTextEditor?.document.getText()
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(1000)
        const formatted = vscode.window.activeTextEditor?.document.getText()
        assert.notStrictEqual(original, formatted)
    })

    test.run(suiteName, fixtureName, 'test bibtex formatter with `bibtex-format.tab`', async () => {
        await test.load(fixture, [{src: 'formatter/bibtex_base.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.tab', 'tab')
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(1000)
        let lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.strictEqual(lines[1].slice(0, 1), '\t')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.tab', '2 spaces')
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(1000)
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.strictEqual(lines[1].slice(0, 2), '  ')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.tab', '4')
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(1000)
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.strictEqual(lines[1].slice(0, 4), '    ')
    })

    test.run(suiteName, fixtureName, 'test bibtex formatter with `bibtex-format.surround`', async () => {
        await test.load(fixture, [{src: 'formatter/bibtex_base.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.surround', 'Curly braces')
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(1000)
        let lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.strictEqual(lines[1].slice(-2, -1), '}')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.surround', 'Quotation marks')
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(1000)
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.strictEqual(lines[1].slice(-2, -1), '"')
    })

    test.run(suiteName, fixtureName, 'test bibtex formatter with `bibtex-format.case`', async () => {
        await test.load(fixture, [{src: 'formatter/bibtex_base.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.case', 'UPPERCASE')
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(1000)
        let lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.ok(lines[1].trim().slice(0, 1).match(/[A-Z]/))

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.case', 'lowercase')
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(1000)
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.ok(lines[1].trim().slice(0, 1).match(/[a-z]/))
    })

    test.run(suiteName, fixtureName, 'test bibtex formatter with `bibtex-format.trailingComma`', async () => {
        await test.load(fixture, [{src: 'formatter/bibtex_base.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.trailingComma', true)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(1000)
        let lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.strictEqual(lines[5].trim().slice(-1), ',')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.trailingComma', false)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(1000)
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.notStrictEqual(lines[5].trim().slice(-1), ',')
    })

    test.run(suiteName, fixtureName, 'test bibtex sort with `bibtex-format.sortby`', async () => {
        await test.load(fixture, [{src: 'formatter/bibtex_base.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sortby', ['key'])
        await vscode.commands.executeCommand('latex-workshop.bibsort')
        await test.sleep(1000)
        let lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        let entries = lines.filter(line => line.includes('@'))
        assert.ok(entries[0].includes('art1'))
        assert.ok(entries[1].includes('lamport1994latex'))
        assert.ok(entries[2].includes('MR1241645'))

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sortby', ['year'])
        await vscode.commands.executeCommand('latex-workshop.bibsort')
        await test.sleep(1000)
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        entries = lines.filter(line => line.includes('@'))
        assert.ok(entries[2].includes('art1'))
        assert.ok(entries[1].includes('lamport1994latex'))
        assert.ok(entries[0].includes('MR1241645'))

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sortby', ['author'])
        await vscode.commands.executeCommand('latex-workshop.bibsort')
        await test.sleep(1000)
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        entries = lines.filter(line => line.includes('@'))
        assert.ok(entries[0].includes('art1'))
        assert.ok(entries[1].includes('lamport1994latex'))
        assert.ok(entries[2].includes('MR1241645'))

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sortby', ['year-desc'])
        await vscode.commands.executeCommand('latex-workshop.bibsort')
        await test.sleep(1000)
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        entries = lines.filter(line => line.includes('@'))
        assert.ok(entries[0].includes('art1'))
        assert.ok(entries[1].includes('lamport1994latex'))
        assert.ok(entries[2].includes('MR1241645'))
    })

    test.run(suiteName, fixtureName, 'test bibtex formatter with `bibtex-format.handleDuplicates`', async () => {
        await test.load(fixture, [{src: 'formatter/bibtex_dup.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')

        await vscode.commands.executeCommand('latex-workshop.bibsort')
        await test.sleep(1000)
        let lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.strictEqual(lines.filter(line => line.includes('@')).length, 2)

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.handleDuplicates', 'Comment Duplicates')
        await vscode.commands.executeCommand('latex-workshop.bibsort')
        await test.sleep(1000)
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.strictEqual(lines.filter(line => line.includes('@')).length, 1)
    })

    test.run(suiteName, fixtureName, 'test bibtex formatter with `bibtex-format.sort.enabled`', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sortby', ['year'])
        await test.load(fixture, [{src: 'formatter/bibtex_base.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sort.enabled', false)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(1000)
        let lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        let entries = lines.filter(line => line.includes('@'))
        assert.ok(entries[0].includes('art1'))
        assert.ok(entries[1].includes('lamport1994latex'))
        assert.ok(entries[2].includes('MR1241645'))

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sort.enabled', true)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(1000)
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        entries = lines.filter(line => line.includes('@'))
        assert.ok(entries[2].includes('art1'))
        assert.ok(entries[1].includes('lamport1994latex'))
        assert.ok(entries[0].includes('MR1241645'))
    })

    test.only(suiteName, fixtureName, 'test bibtex formatter with `bibtex-format.align-equal.enabled`', async () => {
        await test.load(fixture, [{src: 'formatter/bibtex_base.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.align-equal.enabled', false)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(1000)
        let lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        const allEqual = (arr: number[]) => arr.every(val => val === arr[0])
        assert.ok(!allEqual(lines.slice(9, 18).map(line => line.indexOf('='))))

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.align-equal.enabled', true)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(1000)
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.ok(allEqual(lines.slice(9, 18).map(line => line.indexOf('='))))
    })
})
