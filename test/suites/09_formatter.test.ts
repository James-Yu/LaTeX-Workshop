import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import * as test from './utils'
import { readFileSync } from 'fs'

suite('Formatter test suite', () => {
    test.suite.name = path.basename(__filename).replace('.test.js', '')
    test.suite.fixture = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'never')
    })

    setup(async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sort.enabled', true)
    })

    teardown(async () => {
        await test.reset()

        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.path', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.args', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.tab', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.surround', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.case', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.trailingComma', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sort.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sortby', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.handleDuplicates', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.align-equal.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-entries.first', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-fields.sort.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-fields.order', undefined)
    })

    test.run('test latex formatter', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'formatter/latex_base.tex', dst: 'main.tex'}
        ], {open: 0, skipCache: true})
        const original = readFileSync(path.resolve(fixture, 'main.tex')).toString()
        const formatted = await test.format()
        assert.notStrictEqual(original, formatted)
    })

    test.run('change latexindent.path on the fly', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.path', 'echo')
        await test.load(fixture, [
            {src: 'formatter/latex_base.tex', dst: 'main.tex'}
        ], {open: 0, skipCache: true})
        const original = readFileSync(path.resolve(fixture, 'main.tex')).toString()
        // echo add a new \n to the end of stdin
        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.args', [original?.slice(0, -1)])
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(250) // wait for echo finish
        const echoed = vscode.window.activeTextEditor?.document.getText()
        assert.strictEqual(original, echoed)

        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.path', 'latexindent')
        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.args', ['-c', '%DIR%/', '%TMPFILE%', '-y=defaultIndent: \'%INDENT%\''])
        const formatted = await test.format()
        assert.notStrictEqual(original, formatted)
    })

    test.run('test bibtex formatter', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'formatter/bibtex_base.bib', dst: 'main.bib'}
        ], {open: 0, skipCache: true})
        const original = readFileSync(path.resolve(fixture, 'main.bib')).toString()
        const formatted = await test.format()
        assert.notStrictEqual(original, formatted)
    })

    test.run('test bibtex formatter with `bibtex-format.tab`', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'formatter/bibtex_base.bib', dst: 'main.bib'}
        ], {open: 0, skipCache: true})

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.tab', 'tab')
        let lines = (await test.format()).split('\n')
        assert.strictEqual(lines[1].slice(0, 1), '\t')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.tab', '2 spaces')
        lines = (await test.format()).split('\n')
        assert.strictEqual(lines[1].slice(0, 2), '  ')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.tab', '4')
        lines = (await test.format()).split('\n')
        assert.strictEqual(lines[1].slice(0, 4), '    ')
    })

    test.run('test bibtex formatter with `bibtex-format.surround`', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'formatter/bibtex_base.bib', dst: 'main.bib'}
        ], {open: 0, skipCache: true})

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.surround', 'Curly braces')
        let lines = (await test.format()).split('\n')
        assert.strictEqual(lines[1].slice(-2, -1), '}')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.surround', 'Quotation marks')
        lines = (await test.format()).split('\n')
        assert.strictEqual(lines[1].slice(-2, -1), '"')
    })

    test.run('test bibtex formatter with `bibtex-format.case`', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'formatter/bibtex_base.bib', dst: 'main.bib'}
        ], {open: 0, skipCache: true})

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.case', 'UPPERCASE')
        let lines = (await test.format()).split('\n')
        assert.ok(lines[1].trim().slice(0, 1).match(/[A-Z]/))

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.case', 'lowercase')
        lines = (await test.format()).split('\n')
        assert.ok(lines[1].trim().slice(0, 1).match(/[a-z]/))
    })

    test.run('test bibtex formatter with `bibtex-format.trailingComma`', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'formatter/bibtex_base.bib', dst: 'main.bib'}
        ], {open: 0, skipCache: true})

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.trailingComma', true)
        let lines = (await test.format()).split('\n')
        assert.strictEqual(lines[5].trim().slice(-1), ',')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.trailingComma', false)
        lines = (await test.format()).split('\n')
        assert.notStrictEqual(lines[5].trim().slice(-1), ',')
    })

    test.run('test bibtex sorter with `bibtex-format.sortby`', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'formatter/bibtex_base.bib', dst: 'main.bib'}
        ], {open: 0, skipCache: true})

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sortby', ['year'])
        let lines = (await test.format()).split('\n')
        let entries = lines.filter(line => line.includes('@'))
        assert.ok(entries[2].includes('art1'))
        assert.ok(entries[1].includes('lamport1994latex'))
        assert.ok(entries[0].includes('MR1241645'))

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sortby', ['year-desc'])
        lines = (await test.format()).split('\n')
        entries = lines.filter(line => line.includes('@'))
        assert.ok(entries[0].includes('art1'))
        assert.ok(entries[1].includes('lamport1994latex'))
        assert.ok(entries[2].includes('MR1241645'))
    })

    test.run('test bibtex sorter with `bibtex-format.handleDuplicates`', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'formatter/bibtex_dup.bib', dst: 'main.bib'}
        ], {open: 0, skipCache: true})

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.handleDuplicates', 'Comment Duplicates')
        const lines = (await test.format()).split('\n')
        assert.strictEqual(lines.filter(line => line.includes('@')).length, 1)
    })

    test.run('test bibtex formatter with `bibtex-format.sort.enabled`', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sortby', ['year'])
        await test.load(fixture, [
            {src: 'formatter/bibtex_base.bib', dst: 'main.bib'}
        ], {open: 0, skipCache: true})

        const lines = (await test.format()).split('\n')
        const entries = lines.filter(line => line.includes('@'))
        assert.ok(entries[2].includes('art1'))
        assert.ok(entries[1].includes('lamport1994latex'))
        assert.ok(entries[0].includes('MR1241645'))
    })

    test.run('test bibtex formatter with `bibtex-format.align-equal.enabled`', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'formatter/bibtex_base.bib', dst: 'main.bib'}
        ], {open: 0, skipCache: true})

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.align-equal.enabled', false)
        let lines = (await test.format()).split('\n')
        const allEqual = (arr: number[]) => arr.every(val => val === arr[0])
        assert.ok(!allEqual(lines.filter(line => line.includes('=')).map(line => line.indexOf('='))))

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.align-equal.enabled', true)
        lines = (await test.format()).split('\n')
        assert.ok(allEqual(lines.filter(line => line.includes('=')).map(line => line.indexOf('='))))
    })

    test.run('test bibtex sorter with `bibtex-entries.first`', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'formatter/bibtex_base.bib', dst: 'main.bib'}
        ], {open: 0, skipCache: true})

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-entries.first', ['book'])
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sortby', ['key'])
        const lines = (await test.format()).split('\n')
        const entries = lines.filter(line => line.includes('@'))
        assert.ok(entries[2].includes('art1'))
        assert.ok(entries[0].includes('lamport1994latex'))
        assert.ok(entries[1].includes('MR1241645'))
    })

    test.run('test bibtex aligner with `bibtex-fields.sort.enabled` and `bibtex-fields.order`', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-fields.sort.enabled', true)
        await test.load(fixture, [
            {src: 'formatter/bibtex_sortfield.bib', dst: 'main.bib'}
        ], {open: 0, skipCache: true})

        let lines = (await test.format()).split('\n')
        let entries = lines.filter(line => line.includes('='))
        assert.ok(entries[0].includes('author'))
        assert.ok(entries[1].includes('description'))
        assert.ok(entries[2].includes('journal'))
        assert.ok(entries[3].includes('title'))
        assert.ok(entries[4].includes('year'))

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-fields.order', ['title', 'author', 'year'])
        lines = (await test.format()).split('\n')
        entries = lines.filter(line => line.includes('='))
        assert.ok(entries[0].includes('title'))
        assert.ok(entries[1].includes('author'))
        assert.ok(entries[2].includes('year'))
        assert.ok(entries[3].includes('description'))
        assert.ok(entries[4].includes('journal'))
    })
})
