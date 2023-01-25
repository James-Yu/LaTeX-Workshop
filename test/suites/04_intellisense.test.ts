import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as assert from 'assert'
import rimraf from 'rimraf'
import glob from 'glob'
import * as lw from '../../src/lw'
import * as test from './utils'
import { EnvSnippetType, EnvType } from '../../src/providers/completer/environment'
import { CmdType } from '../../src/providers/completer/command'
import { PkgType } from '../../src/providers/completion'
import { isTriggerSuggestNeeded } from '../../src/providers/completer/commandlib/commandfinder'

function assertKeys(keys: string[], expected: string[] = [], message: string): void {
    assert.ok(
        keys.every(k => expected.includes(k)),
        message
    )
}

suite('Intellisense test suite', () => {

    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/testground')
    const fixtureName = 'testground'

    suiteSetup(() => {
        fixture = path.resolve(lw.extensionRoot, 'test/fixtures/testground')
    })

    setup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
    })

    teardown(async () => {
        lw.manager.rootFile = undefined
        lw.completer.input.reset()
        lw.duplicateLabels.reset()
        lw.cacher.allPaths.forEach(filePath => lw.cacher.remove(filePath))
        await lw.cacher.resetWatcher()

        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.atSuggestion.trigger.latex', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.atSuggestion.user', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.citation.label', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.citation.format', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.label.command', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.label.keyval', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.argumentHint.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.command.user', undefined)
    })

    suiteTeardown(async () => {
        if (path.basename(fixture) === 'testground') {
            rimraf(fixture + '/{*,.vscode/*}', (e) => {if (e) {console.error(e)}})
            await test.sleep(500) // Required for pooling
        }
    })

    test.run(suiteName, fixtureName, 'check default environment .json completion file', () => {
        const file = `${lw.extensionRoot}/data/environments.json`
        const envs = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'})) as {[key: string]: EnvType}
        assert.ok(Object.keys(envs).length > 0)
        Object.values(envs).forEach(env => {
            assertKeys(
                Object.keys(env),
                ['name', 'snippet', 'detail'],
                file + ': ' + JSON.stringify(env)
            )
        })
    })

    test.run(suiteName, fixtureName, 'check default commands .json completion file', () => {
        const file = `${lw.extensionRoot}/data/commands.json`
        const cmds = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'})) as {[key: string]: CmdType}
        assert.ok(Object.keys(cmds).length > 0)
        Object.values(cmds).forEach(cmd => {
            assertKeys(
                Object.keys(cmd),
                ['command', 'snippet', 'documentation', 'detail', 'postAction'],
                file + ': ' + JSON.stringify(cmd)
            )
        })
    })

    test.run(suiteName, fixtureName, 'test default envs', () => {
        let defaultEnvs = lw.completer.environment.getDefaultEnvs(EnvSnippetType.AsCommand).map(e => e.label)
        assert.ok(defaultEnvs.includes('document'))
        assert.ok(defaultEnvs.includes('align'))
        defaultEnvs = lw.completer.environment.getDefaultEnvs(EnvSnippetType.AsName).map(e => e.label)
        assert.ok(defaultEnvs.includes('document'))
        assert.ok(defaultEnvs.includes('align'))
        defaultEnvs = lw.completer.environment.getDefaultEnvs(EnvSnippetType.ForBegin).map(e => e.label)
        assert.ok(defaultEnvs.includes('document'))
        assert.ok(defaultEnvs.includes('align'))
    })

    test.run(suiteName, fixtureName, 'test default cmds', () => {
        const defaultCommands = lw.completer.command.getDefaultCmds().map(e => e.label)
        assert.ok(defaultCommands.includes('\\begin'))
        assert.ok(defaultCommands.includes('\\left('))
        assert.ok(defaultCommands.includes('\\section{}'))
    })

    test.run(suiteName, fixtureName, 'check package .json completion file', () => {
        const files = glob.sync('data/packages/*.json', {cwd: lw.extensionRoot})
        files.forEach(file => {
            const pkg = JSON.parse(fs.readFileSync(path.join(lw.extensionRoot, file), {encoding: 'utf8'})) as PkgType
            Object.values(pkg.cmds).forEach(cmd => {
                assertKeys(
                    Object.keys(cmd),
                    ['command', 'snippet', 'option', 'keyvalindex', 'keyvalpos', 'documentation', 'detail'],
                    file + ': ' + JSON.stringify(cmd)
                )
            })
            Object.values(pkg.envs).forEach(env => {
                assertKeys(
                    Object.keys(env),
                    ['name', 'snippet', 'detail', 'option', 'keyvalindex', 'keyvalpos'],
                    file + ': ' + JSON.stringify(env)
                )
            })
        })
    })

    test.run(suiteName, fixtureName, 'test isTriggerSuggestNeeded', () => {
        assert.ok(!isTriggerSuggestNeeded('frac'))
    })

    test.run(suiteName, fixtureName, 'command intellisense', async () => {
        await test.loadAndCache(fixture, [
            {src: 'intellisense/base.tex', dst: 'main.tex'},
            {src: 'intellisense/sub.tex', dst: 'sub/s.tex'}
        ])
        const suggestions = test.suggest(0, 1)
        assert.ok(suggestions.items.length > 0)
    })

    test.run(suiteName, fixtureName, 'command intellisense with cmds provided by \\usepackage', async () => {
        await test.loadAndCache(fixture, [
            {src: 'intellisense/package_on_cmd_1.tex', dst: 'main.tex'}
        ])

        let suggestions = test.suggest(0, 1)
        assert.ok(!suggestions.labels.includes('\\lstinline'))

        await test.loadAndCache(fixture, [
            {src: 'intellisense/package_on_cmd_2.tex', dst: 'main.tex'}
        ])
        suggestions = test.suggest(0, 1)
        assert.ok(suggestions.labels.includes('\\lstinline'))
    })

    test.run(suiteName, fixtureName, 'command intellisense with cmds provided by \\usepackage and its argument', async () => {
        await test.loadAndCache(fixture, [
            {src: 'intellisense/package_option_on_cmd.tex', dst: 'main.tex'}
        ])
        let suggestions = test.suggest(0, 1)
        assert.ok(suggestions.labels.includes('\\lstformatfiles'))

        await test.loadAndCache(fixture, [
            {src: 'intellisense/package_on_cmd_2.tex', dst: 'main.tex'}
        ])
        suggestions = test.suggest(0, 1)
        assert.ok(!suggestions.labels.includes('\\lstformatfiles'))
    })

    test.run(suiteName, fixtureName, 'command intellisense with cmds defined by \\newcommand', async () => {
        await test.loadAndCache(fixture, [
            {src: 'intellisense/newcommand.tex', dst: 'main.tex'}
        ])
        const suggestions = test.suggest(0, 1)
        assert.ok(suggestions.labels.includes('\\WARNING'))
        assert.ok(suggestions.labels.includes('\\FIXME{}'))
        assert.ok(suggestions.labels.includes('\\FIXME[]{}'))
        assert.ok(suggestions.labels.includes('\\fix[]{}{}'))
        assert.ok(suggestions.labels.includes('\\fakecommand'))
        assert.ok(suggestions.labels.includes('\\fakecommand{}'))
        assert.ok(suggestions.labels.includes('\\fakecommand[]{}'))
    })

    test.run(suiteName, fixtureName, 'command intellisense with config `intellisense.argumentHint.enabled`', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.argumentHint.enabled', true)
        await test.loadAndCache(fixture, [
            {src: 'intellisense/base.tex', dst: 'main.tex'},
            {src: 'intellisense/sub.tex', dst: 'sub/s.tex'}
        ])
        let suggestions = test.suggest(0, 1)
        assert.ok(suggestions.labels.includes('\\includefrom{}{}'))
        let snippet = suggestions.items.filter(item => item.label === '\\includefrom{}{}')[0].insertText
        assert.ok(snippet)
        assert.ok(typeof snippet !== 'string')
        assert.ok(snippet.value.includes('${1:'))

        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.argumentHint.enabled', false)
        await test.loadAndCache(fixture, [
            {src: 'intellisense/base.tex', dst: 'main.tex'},
            {src: 'intellisense/sub.tex', dst: 'sub/s.tex'}
        ])
        suggestions = test.suggest(0, 1)
        assert.ok(suggestions.labels.includes('\\includefrom{}{}'))
        snippet = suggestions.items.filter(item => item.label === '\\includefrom{}{}')[0].insertText
        assert.ok(snippet)
        assert.ok(typeof snippet !== 'string')
        assert.ok(!snippet.value.includes('${1:'))
    })

    test.run(suiteName, fixtureName, 'command intellisense with config `intellisense.command.user`', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.command.user', {'mycommand[]{}': 'notsamecommand[${2:option}]{$TM_SELECTED_TEXT$1}', 'parbox{}{}': 'defchanged', 'overline{}': ''})
        await test.loadAndCache(fixture, [
            {src: 'intellisense/base.tex', dst: 'main.tex'},
            {src: 'intellisense/sub.tex', dst: 'sub/s.tex'}
        ])
        let suggestions = test.suggest(0, 1)
        assert.ok(suggestions.labels.includes('\\mycommand[]{}'))
        assert.ok(suggestions.labels.includes('\\parbox{}{}'))
        let parbox = suggestions.items.filter(item => item.label === '\\parbox{}{}')[0].insertText
        if (typeof parbox === 'string') {
            assert.strictEqual(parbox, 'defchanged')
        } else {
            assert.strictEqual(parbox?.value, 'defchanged')
        }
        assert.ok(!suggestions.labels.includes('\\overline{}'))

        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.command.user', undefined)
        await test.loadAndCache(fixture, [
            {src: 'intellisense/base.tex', dst: 'main.tex'},
            {src: 'intellisense/sub.tex', dst: 'sub/s.tex'}
        ])
        suggestions = test.suggest(0, 1)
        assert.ok(!suggestions.labels.includes('\\mycommand[]{}'))
        assert.ok(suggestions.labels.includes('\\parbox{}{}'))
        parbox = suggestions.items.filter(item => item.label === '\\parbox{}{}')[0].insertText
        if (typeof parbox === 'string') {
            assert.notStrictEqual(parbox, 'defchanged')
        } else {
            assert.notStrictEqual(parbox?.value, 'defchanged')
        }
        assert.ok(suggestions.labels.includes('\\overline{}'))
    })

    test.run(suiteName, fixtureName, 'reference intellisense and config intellisense.label.keyval', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.label.keyval', true)
        await test.loadAndCache(fixture, [
            {src: 'intellisense/base.tex', dst: 'main.tex'},
            {src: 'intellisense/sub.tex', dst: 'sub/s.tex'}
        ])
        let suggestions = test.suggest(8, 5)
        assert.ok(suggestions.labels.includes('sec1'))
        assert.ok(suggestions.labels.includes('eq1'))

        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.label.keyval', false)
        await test.loadAndCache(fixture, [
            {src: 'intellisense/base.tex', dst: 'main.tex'},
            {src: 'intellisense/sub.tex', dst: 'sub/s.tex'}
        ])
        suggestions = test.suggest(8, 5)
        assert.ok(suggestions.labels.includes('sec1'))
        assert.ok(!suggestions.labels.includes('eq1'))
    })

    test.run(suiteName, fixtureName, 'reference intellisense and config intellisense.label.command', async () => {
        await test.loadAndCache(fixture, [
            {src: 'intellisense/label.tex', dst: 'main.tex'}
        ])
        let suggestions = test.suggest(7, 5)
        assert.ok(suggestions.labels.includes('l1'))
        assert.ok(suggestions.labels.includes('e1'))

        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.label.command', ['label'])
        await test.loadAndCache(fixture, [
            {src: 'intellisense/label.tex', dst: 'main.tex'}
        ])
        suggestions = test.suggest(7, 5)
        assert.ok(!suggestions.labels.includes('l1'))
        assert.ok(suggestions.labels.includes('e1'))
    })

    test.run(suiteName, fixtureName, 'reference intellisense with `xr` package', async () => {
        await test.loadAndCache(fixture, [
            {src: 'intellisense/xr_base.tex', dst: 'main.tex'},
            {src: 'intellisense/xr_sub.tex', dst: 'sub.tex'},
            {src: 'intellisense/xr_dup.tex', dst: 'dup.tex'}
        ])
        const suggestions = test.suggest(6, 5)
        assert.ok(suggestions.labels.includes('sec:1'))
        assert.ok(suggestions.labels.includes('sec:2'))
        assert.ok(suggestions.labels.includes('alt-sec:1'))
    })

    test.run(suiteName, fixtureName, 'environment intellisense', async () => {
        await test.loadAndCache(fixture, [
            {src: 'intellisense/base.tex', dst: 'main.tex'},
            {src: 'intellisense/sub.tex', dst: 'sub/s.tex'}
        ])
        const suggestions = test.suggest(9, 7)
        assert.ok(suggestions.items.length > 0)
    })

    test.run(suiteName, fixtureName, 'environment intellisense with envs provided by \\usepackage', async () => {
        await test.loadAndCache(fixture, [
            {src: 'intellisense/package_on_env_1.tex', dst: 'main.tex'}
        ])
        let suggestions = test.suggest(3, 7)
        assert.ok(!suggestions.labels.includes('algorithm'))

        await test.loadAndCache(fixture, [
            {src: 'intellisense/package_on_env_2.tex', dst: 'main.tex'}
        ])
        suggestions = test.suggest(3, 7)
        assert.ok(suggestions.labels.includes('algorithm'))
    })

    test.run(suiteName, fixtureName, 'environment intellisense with envs provided by \\usepackage and its argument', async () => {
        await test.loadAndCache(fixture, [
            {src: 'intellisense/package_option_on_env.tex', dst: 'main.tex'}
        ])
        let suggestions = test.suggest(3, 7)
        assert.ok(suggestions.labels.includes('algorithm2e'))

        await test.loadAndCache(fixture, [
            {src: 'intellisense/package_on_env_2.tex', dst: 'main.tex'}
        ])
        suggestions = test.suggest(3, 7)
        assert.ok(!suggestions.labels.includes('algorithm2e'))
    })

    test.run(suiteName, fixtureName, 'environment intellisense in form of cmds with envs provided by \\usepackage and its argument', async () => {
        await test.loadAndCache(fixture, [
            {src: 'intellisense/package_option_on_env.tex', dst: 'main.tex'}
        ])
        let suggestions = test.suggest(3, 1)
        assert.ok(suggestions.labels.includes('algorithm2e'))

        await test.loadAndCache(fixture, [
            {src: 'intellisense/package_on_env_2.tex', dst: 'main.tex'}
        ])
        suggestions = test.suggest(3, 1)
        assert.ok(!suggestions.labels.includes('algorithm2e'))
    })

    test.run(suiteName, fixtureName, 'argument intellisense of \\documentclass, \\usepackage, commands, and environments', async () => {
        await test.loadAndCache(fixture, [
            {src: 'intellisense/base.tex', dst: 'main.tex'},
            {src: 'intellisense/sub.tex', dst: 'sub/s.tex'}
        ])
        let suggestions = test.suggest(0, 15)
        assert.ok(suggestions.labels.includes('a4paper'))
        assert.ok(suggestions.labels.includes('10pt'))

        suggestions = test.suggest(2, 12)
        assert.ok(suggestions.labels.includes('savemem'))
        assert.ok(suggestions.labels.includes('noaspects'))

        suggestions = test.suggest(13, 11)
        assert.ok(suggestions.labels.includes('print'))
        assert.ok(suggestions.labels.includes('showlines'))

        suggestions = test.suggest(14, 19)
        assert.ok(suggestions.labels.includes('print'))
        assert.ok(suggestions.labels.includes('showlines'))
    })

    test.run(suiteName, fixtureName, 'argument intellisense with braces already in the argument', async () => {
        await test.loadAndCache(fixture, [
            {src: 'intellisense/class_option_with_brace.tex', dst: 'main.tex'}
        ])
        let suggestions = test.suggest(0, 64)
        assert.ok(suggestions.labels.includes('10pt'))

        suggestions = test.suggest(3, 32)
        assert.ok(suggestions.labels.includes('label='))
    })

    test.run(suiteName, fixtureName, 'package and class intellisense', async () => {
        await test.loadAndCache(fixture, [
            {src: 'intellisense/base.tex', dst: 'main.tex'},
            {src: 'intellisense/sub.tex', dst: 'sub/s.tex'}
        ])
        let suggestions = test.suggest(2, 21)
        assert.ok(suggestions.labels.includes('amsmath'))
        assert.ok(suggestions.labels.includes('listings'))

        suggestions = test.suggest(0, 21)
        assert.ok(suggestions.labels.includes('article'))
        assert.ok(suggestions.labels.includes('IEEEtran'))
    })

    test.run(suiteName, fixtureName, 'input/include/import/subimport intellisense', async () => {
        await test.loadAndCache(fixture, [
            {src: 'intellisense/base.tex', dst: 'main.tex'},
            {src: 'intellisense/sub.tex', dst: 'sub/s.tex'},
            {src: 'intellisense/sub.tex', dst: 'sub/plain.tex'}
        ])
        let suggestions = test.suggest(7, 7)
        assert.ok(suggestions.labels.includes('main.tex'))
        assert.ok(suggestions.labels.includes('sub/'))

        suggestions = test.suggest(16, 13)
        assert.ok(suggestions.labels.includes('main.tex'))
        assert.ok(suggestions.labels.includes('sub/'))

        suggestions = test.suggest(17, 8)
        assert.ok(!suggestions.labels.includes('main.tex'))

        suggestions = test.suggest(18, 11)
        assert.ok(!suggestions.labels.includes('main.tex'))
        assert.ok(suggestions.labels.includes('sub/'))

        suggestions = test.suggest(18, 17)
        assert.ok(suggestions.labels.includes('s.tex'))
        assert.ok(suggestions.labels.includes('plain.tex'))
        assert.ok(!suggestions.labels.includes('sub/'))
    })

    test.run(suiteName, fixtureName, 'citation intellisense and configs intellisense.citation.*', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.citation.label', 'bibtex key')
        await test.loadAndCache(fixture, [
            {src: 'intellisense/citation.tex', dst: 'main.tex'},
            {src: 'base.bib', dst: 'main.bib'}
        ])
        let suggestions = test.suggest(2, 9)
        assert.strictEqual(suggestions.items.length, 3)
        assert.strictEqual(suggestions.items[0].label, 'art1')
        assert.ok(suggestions.items[0].filterText)
        assert.ok(suggestions.items[0].filterText.includes('Journal of CI tests'))
        assert.ok(!suggestions.items[0].filterText.includes('hintFake'))

        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.citation.label', 'title')
        suggestions = test.suggest(2, 9)
        assert.strictEqual(suggestions.items.length, 3)
        assert.strictEqual(suggestions.items[0].label, 'A fake article')

        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.citation.label', 'authors')
        suggestions = test.suggest(2, 9)
        assert.strictEqual(suggestions.items.length, 3)
        assert.strictEqual(suggestions.items[0].label, 'Davis, J. and Jones, M.')

        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.citation.format', ['title', 'year', 'description', 'nonexisting'])
        suggestions = test.suggest(2, 9)
        assert.strictEqual(suggestions.items.length, 3)
        assert.ok(suggestions.items[0].filterText)
        assert.ok(!suggestions.items[0].filterText.includes('Journal of CI tests'))
        assert.ok(suggestions.items[0].filterText.includes('hintFake'))
    })

    test.run(suiteName, fixtureName, 'glossary intellisense', async () => {
        await test.loadAndCache(fixture, [
            {src: 'intellisense/glossary.tex', dst: 'main.tex'},
            {src: 'intellisense/glossaryentries.tex', dst: 'sub/glossary.tex'}
        ])
        const suggestions = test.suggest(5, 5)
        assert.strictEqual(suggestions.items.length, 7)
        assert.ok(suggestions.items.find(item => item.label === 'rf' && item.detail === 'radio-frequency'))
        assert.ok(suggestions.items.find(item => item.label === 'te' && item.detail === 'Transverse Magnetic'))
        assert.ok(suggestions.items.find(item => item.label === 'E_P' && item.detail === 'Elastic $\\varepsilon$ toto'))
        assert.ok(suggestions.items.find(item => item.label === 'lw' && item.detail === 'What this extension is $\\mathbb{A}$'))
        assert.ok(suggestions.items.find(item => item.label === 'vs_code' && item.detail === 'Editor'))
        assert.ok(suggestions.items.find(item => item.label === 'abbr_y' && item.detail === 'A second abbreviation'))
        assert.ok(suggestions.items.find(item => item.label === 'abbr_x' && item.detail === 'A first abbreviation'))
    })

    test.run(suiteName, fixtureName, '@-snippet intellisense and configs intellisense.atSuggestion*', async () => {
        const replaces = {'@+': '\\sum', '@8': '', '@M': '\\sum'}
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.atSuggestion.user', replaces)
        await test.loadAndCache(fixture, [
            {src: 'intellisense/base.tex', dst: 'main.tex'},
            {src: 'intellisense/sub.tex', dst: 'sub/s.tex'}
        ])
        let suggestions = test.suggest(5, 1, true)
        assert.ok(suggestions.items.find(item => item.label === '@+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\sum'))
        assert.ok(undefined === suggestions.items.find(item => item.label === '@+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\bigcup'))
        assert.ok(suggestions.items.find(item => item.label === '@M' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\sum'))
        assert.ok(undefined === suggestions.items.find(item => item.label === '@8'))

        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.atSuggestion.trigger.latex', '#')
        suggestions = test.suggest(6, 1, true)
        assert.ok(suggestions.items.find(item => item.label === '#+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\sum'))
        assert.ok(suggestions.items.find(item => item.label === '#ve' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\varepsilon'))
        assert.ok(undefined === suggestions.items.find(item => item.label === '@+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\bigcup'))
        assert.ok(undefined === suggestions.items.find(item => item.label === '#+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\bigcup'))
        assert.ok(undefined === suggestions.items.find(item => item.label === '#8'))
    })
})
