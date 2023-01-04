import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as assert from 'assert'
import rimraf from 'rimraf'
import glob from 'glob'

import { Extension } from '../../src/main'
import { sleep, getExtension, getIntellisense, runTest, openActive, writeTestFile, loadTestFile, waitFileParsed } from './utils'
import { EnvSnippetType, EnvType } from '../../src/providers/completer/environment'
import { CmdType } from '../../src/providers/completer/command'
import { PkgType } from '../../src/providers/completion'
import { isTriggerSuggestNeeded } from '../../src/providers/completer/commandlib/commandfinder'

function assertKeys(keys: string[], mendatory: string[], optional: string[] = [], message: string): void {
    assert.ok(
        keys.every(k => mendatory.includes(k) || optional.includes(k)) && mendatory.every(k => keys.includes(k)),
        message
    )
}

suite('Intellisense test suite', () => {

    let extension: Extension
    let extensionRoot = path.resolve(__dirname, '../../')
    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/testground')
    const fixtureName = 'testground'

    suiteSetup(async () => {
        extension = await getExtension()
        extensionRoot = extension.extensionRoot
        fixture = path.resolve(extension.extensionRoot, 'test/fixtures/testground')
    })

    setup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        extension.manager.rootFile = undefined

        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.atSuggestion.trigger.latex', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.atSuggestionJSON.replace', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.citation.label', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.citation.format', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.label.keyval', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.argumentHint.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.commandsJSON.replace', undefined)

        if (path.basename(fixture) === 'testground') {
            rimraf(fixture + '/{*,.vscode/*}', (e) => {if (e) {console.error(e)}})
            await sleep(500) // Required for pooling
        }
    })

    runTest({suiteName, fixtureName, testName: 'check default environment .json completion file'}, () => {
        const file = `${extensionRoot}/data/environments.json`
        const envs = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'})) as {[key: string]: EnvType}
        assert.ok(Object.keys(envs).length > 0)
        Object.keys(envs).forEach(name => {
            assertKeys(
                Object.keys(envs[name]),
                ['name'],
                ['snippet', 'detail'],
                file + ': ' + JSON.stringify(envs[name])
            )
        })
    })

    runTest({suiteName, fixtureName, testName: 'check default commands .json completion file'}, () => {
        const file = `${extensionRoot}/data/commands.json`
        const cmds = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'})) as {[key: string]: CmdType}
        assert.ok(Object.keys(cmds).length > 0)
        Object.keys(cmds).forEach(name => {
            assertKeys(
                Object.keys(cmds[name]),
                ['command'],
                ['snippet', 'documentation', 'detail', 'postAction', 'label'],
                file + ': ' + JSON.stringify(cmds[name])
            )
        })
    })

    runTest({suiteName, fixtureName, testName: 'test default envs'}, () => {
        assert.ok(extension)
        let defaultEnvs = extension.completer.environment.getDefaultEnvs(EnvSnippetType.AsCommand).map(e => e.label)
        assert.ok(defaultEnvs.includes('document'))
        assert.ok(defaultEnvs.includes('align'))
        defaultEnvs = extension.completer.environment.getDefaultEnvs(EnvSnippetType.AsName).map(e => e.label)
        assert.ok(defaultEnvs.includes('document'))
        assert.ok(defaultEnvs.includes('align'))
        defaultEnvs = extension.completer.environment.getDefaultEnvs(EnvSnippetType.ForBegin).map(e => e.label)
        assert.ok(defaultEnvs.includes('document'))
        assert.ok(defaultEnvs.includes('align'))
    })

    runTest({suiteName, fixtureName, testName: 'test default cmds'}, () => {
        assert.ok(extension)
        const defaultCommands = extension.completer.command.getDefaultCmds().map(e => e.label)
        assert.ok(defaultCommands.includes('\\begin'))
        assert.ok(defaultCommands.includes('\\left('))
        assert.ok(defaultCommands.includes('\\section{title}'))
    })

    runTest({suiteName, fixtureName, testName: 'check package .json completion file'}, () => {
        const files = glob.sync('data/packages/*.json', {cwd: extensionRoot})
        files.forEach(file => {
            const pkg = JSON.parse(fs.readFileSync(path.join(extensionRoot, file), {encoding: 'utf8'})) as PkgType
            Object.keys(pkg.cmds).forEach(name => {
                assertKeys(
                    Object.keys(pkg.cmds[name]),
                    [],
                    ['command', 'snippet', 'option', 'keyvals', 'keyvalindex', 'documentation', 'detail'],
                    file + ': ' + JSON.stringify(pkg.cmds[name])
                )
            })
            Object.keys(pkg.envs).forEach(name => {
                assertKeys(
                    Object.keys(pkg.envs[name]),
                    [],
                    ['name', 'snippet', 'detail', 'option', 'keyvals', 'keyvalindex'],
                    file + ': ' + JSON.stringify(pkg.envs[name])
                )
            })
        })
    })

    runTest({suiteName, fixtureName, testName: 'test isTriggerSuggestNeeded'}, () => {
        assert.ok(!isTriggerSuggestNeeded('frac'))
    })

    runTest({suiteName, fixtureName, testName: 'command intellisense'}, async () => {
        await loadTestFile(fixture, [
            {src: 'intellisense_base.tex', dst: 'main.tex'},
            {src: 'intellisense_sub.tex', dst: 'sub/s.tex'}
        ])
        const result = await openActive(extension, fixture, 'main.tex')
        const items = getIntellisense(result.doc, new vscode.Position(0, 1), extension)
        assert.ok(items)
        assert.ok(items.length > 0)
    })

    runTest({suiteName, fixtureName, testName: 'command intellisense with usepackage'}, async () => {
        await loadTestFile(fixture, [
            {src: 'intellisense_base.tex', dst: 'main.tex'},
            {src: 'intellisense_sub.tex', dst: 'sub/s.tex'}
        ])
        let result = await openActive(extension, fixture, 'main.tex')
        await extension.manager.updateCompleter(path.resolve(fixture, 'main.tex'), result.doc.getText())
        let items = getIntellisense(result.doc, new vscode.Position(0, 1), extension)
        assert.ok(items)
        assert.ok(items.length > 0)

        let labels = items.map(item => item.label.toString())
        assert.ok(labels.includes('\\includefrom{}{}'))
        assert.ok(!labels.includes('\\gls{}'))

        await vscode.commands.executeCommand('workbench.action.closeAllEditors')

        await loadTestFile(fixture, [
            {src: 'intellisense_glossary.tex', dst: 'main.tex'},
            {src: 'intellisense_glossaryentries.tex', dst: 'sub/glossary.tex'}
        ])
        result = await openActive(extension, fixture, 'main.tex')
        await extension.manager.updateCompleter(path.resolve(fixture, 'main.tex'), result.doc.getText())
        items = getIntellisense(result.doc, new vscode.Position(0, 1), extension)
        assert.ok(items)
        assert.ok(items.length > 0)

        labels = items.map(item => item.label.toString())
        assert.ok(!labels.includes('\\includefrom{}{}'))
        assert.ok(labels.includes('\\gls{}'))
    })

    runTest({suiteName, fixtureName, testName: 'command intellisense with usepackage and option'}, async () => {
        await loadTestFile(fixture, [{src: 'intellisense/package_option_on_cmd_1.tex', dst: 'main.tex'}])
        let result = await openActive(extension, fixture, 'main.tex')
        await extension.manager.updateCompleter(path.resolve(fixture, 'main.tex'), result.doc.getText())
        let items = getIntellisense(result.doc, new vscode.Position(2, 1), extension)
        assert.ok(items)
        assert.ok(items.length > 0)

        let labels = items.map(item => item.label.toString())
        assert.ok(labels.includes('\\lstformatfiles'))

        await vscode.commands.executeCommand('workbench.action.closeAllEditors')

        await loadTestFile(fixture, [{src: 'intellisense/package_option_on_cmd_2.tex', dst: 'main.tex'}])
        result = await openActive(extension, fixture, 'main.tex')
        await extension.manager.updateCompleter(path.resolve(fixture, 'main.tex'), result.doc.getText())
        items = getIntellisense(result.doc, new vscode.Position(2, 1), extension)
        assert.ok(items)
        assert.ok(items.length > 0)

        labels = items.map(item => item.label.toString())
        assert.ok(!labels.includes('\\lstformatfiles'))
    })

    runTest({suiteName, fixtureName, testName: 'command intellisense with config `intellisense.argumentHint.enabled`'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.argumentHint.enabled', true)
        await loadTestFile(fixture, [
            {src: 'intellisense_base.tex', dst: 'main.tex'},
            {src: 'intellisense_sub.tex', dst: 'sub/s.tex'}
        ])
        const result = await openActive(extension, fixture, 'main.tex')
        await extension.manager.updateCompleter(path.resolve(fixture, 'main.tex'), result.doc.getText())
        let items = getIntellisense(result.doc, new vscode.Position(0, 1), extension)
        assert.ok(items)
        assert.ok(items.length > 0)

        let labels = items.map(item => item.label.toString())
        assert.ok(labels.includes('\\includefrom{}{}'))
        let snippet = items.filter(item => item.label === '\\includefrom{}{}')[0].insertText
        assert.ok(snippet)
        assert.ok(typeof snippet !== 'string')
        assert.ok(snippet.value.includes('${1:'))

        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.argumentHint.enabled', false)
        await extension.manager.updateCompleter(path.resolve(fixture, 'main.tex'), result.doc.getText())
        items = getIntellisense(result.doc, new vscode.Position(0, 1), extension)
        assert.ok(items)
        assert.ok(items.length > 0)

        labels = items.map(item => item.label.toString())
        assert.ok(labels.includes('\\includefrom{}{}'))
        snippet = items.filter(item => item.label === '\\includefrom{}{}')[0].insertText
        assert.ok(snippet)
        assert.ok(typeof snippet !== 'string')
        assert.ok(!snippet.value.includes('${1:'))
    })

    runTest({suiteName, fixtureName, testName: 'command intellisense with config `intellisense.commandsJSON.replace`'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.commandsJSON.replace', {'mathbb{}': ''})
        await loadTestFile(fixture, [
            {src: 'intellisense_base.tex', dst: 'main.tex'},
            {src: 'intellisense_sub.tex', dst: 'sub/s.tex'}
        ])
        const result = await openActive(extension, fixture, 'main.tex')
        let items = getIntellisense(result.doc, new vscode.Position(0, 1), extension)
        assert.ok(items)
        assert.ok(items.length > 0)

        let labels = items.map(item => item.label.toString())
        assert.ok(!labels.includes('\\mathbb{text}'))

        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.commandsJSON.replace', undefined)
        items = getIntellisense(result.doc, new vscode.Position(0, 1), extension)
        assert.ok(items)
        assert.ok(items.length > 0)

        labels = items.map(item => item.label.toString())
        assert.ok(labels.includes('\\mathbb{text}'))
    })

    runTest({suiteName, fixtureName, testName: 'reference intellisense and config intellisense.label.keyval'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.label.keyval', true)
        await loadTestFile(fixture, [
            {src: 'intellisense_base.tex', dst: 'main.tex'},
            {src: 'intellisense_sub.tex', dst: 'sub/s.tex'}
        ])
        const result = await openActive(extension, fixture, 'main.tex')
        let items = getIntellisense(result.doc, new vscode.Position(8, 5), extension)
        assert.ok(items)
        assert.ok(items.length > 0)

        let labels = items.map(item => item.label.toString())
        assert.ok(labels.includes('sec1'))
        assert.ok(labels.includes('eq1'))

        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.label.keyval', false)
        await extension.manager.updateCompleter(path.resolve(fixture, 'main.tex'), result.doc.getText())
        items = getIntellisense(result.doc, new vscode.Position(8, 5), extension)
        assert.ok(items)
        assert.ok(items.length > 0)

        labels = items.map(item => item.label.toString())
        assert.ok(labels.includes('sec1'))
        assert.ok(!labels.includes('eq1'))
    })

    runTest({suiteName, fixtureName, testName: 'environment intellisense'}, async () => {
        await loadTestFile(fixture, [
            {src: 'intellisense_base.tex', dst: 'main.tex'},
            {src: 'intellisense_sub.tex', dst: 'sub/s.tex'}
        ])
        const result = await openActive(extension, fixture, 'main.tex')
        const items = getIntellisense(result.doc, new vscode.Position(9, 7), extension)
        assert.ok(items)
        assert.ok(items.length > 0)
    })

    runTest({only: true, suiteName, fixtureName, testName: 'environment intellisense with usepackage and option'}, async () => {
        await loadTestFile(fixture, [{src: 'intellisense/package_option_on_env_1.tex', dst: 'main.tex'}])
        let result = await openActive(extension, fixture, 'main.tex')
        await extension.manager.updateCompleter(path.resolve(fixture, 'main.tex'), result.doc.getText())
        let items = getIntellisense(result.doc, new vscode.Position(3, 7), extension)
        assert.ok(items)
        assert.ok(items.length > 0)

        let labels = items.map(item => item.label.toString())
        assert.ok(labels.includes('algorithm2e'))

        await vscode.commands.executeCommand('workbench.action.closeAllEditors')

        await loadTestFile(fixture, [{src: 'intellisense/package_option_on_env_2.tex', dst: 'main.tex'}])
        result = await openActive(extension, fixture, 'main.tex')
        await extension.manager.updateCompleter(path.resolve(fixture, 'main.tex'), result.doc.getText())
        items = getIntellisense(result.doc, new vscode.Position(3, 7), extension)
        assert.ok(items)
        assert.ok(items.length > 0)

        labels = items.map(item => item.label.toString())
        assert.ok(!labels.includes('algorithm2e'))
    })

    runTest({suiteName, fixtureName, testName: 'argument intellisense'}, async () => {
        await loadTestFile(fixture, [
            {src: 'intellisense_base.tex', dst: 'main.tex'},
            {src: 'intellisense_sub.tex', dst: 'sub/s.tex'}
        ])
        const result = await openActive(extension, fixture, 'main.tex')
        let items = getIntellisense(result.doc, new vscode.Position(0, 15), extension)
        assert.ok(items)
        let labels = items.map(item => item.label.toString())
        assert.ok(labels.includes('a4paper'))
        assert.ok(labels.includes('10pt'))

        items = getIntellisense(result.doc, new vscode.Position(2, 12), extension)
        assert.ok(items)
        labels = items.map(item => item.label.toString())
        assert.ok(labels.includes('savemem'))
        assert.ok(labels.includes('noaspects'))

        items = getIntellisense(result.doc, new vscode.Position(13, 11), extension)
        assert.ok(items)
        labels = items.map(item => item.label.toString())
        assert.ok(labels.includes('print'))
        assert.ok(labels.includes('showlines'))

        items = getIntellisense(result.doc, new vscode.Position(14, 19), extension)
        assert.ok(items)
        labels = items.map(item => item.label.toString())
        assert.ok(labels.includes('print'))
        assert.ok(labels.includes('showlines'))
    })

    runTest({suiteName, fixtureName, testName: 'package and documentclass intellisense'}, async () => {
        await loadTestFile(fixture, [
            {src: 'intellisense_base.tex', dst: 'main.tex'},
            {src: 'intellisense_sub.tex', dst: 'sub/s.tex'}
        ])
        const result = await openActive(extension, fixture, 'main.tex')
        let items = getIntellisense(result.doc, new vscode.Position(2, 21), extension)
        assert.ok(items)
        assert.ok(items.length > 0)
        let labels = items.map(item => item.label.toString())
        assert.ok(labels.includes('amsmath'))
        assert.ok(labels.includes('listings'))

        items = getIntellisense(result.doc, new vscode.Position(0, 21), extension)
        assert.ok(items)
        assert.ok(items.length > 0)
        labels = items.map(item => item.label.toString())
        assert.ok(labels.includes('article'))
        assert.ok(labels.includes('IEEEtran'))
    })

    runTest({suiteName, fixtureName, testName: 'input/include/import/subimport intellisense'}, async () => {
        await loadTestFile(fixture, [
            {src: 'intellisense_base.tex', dst: 'main.tex'},
            {src: 'intellisense_sub.tex', dst: 'sub/s.tex'},
            {src: 'intellisense_sub.tex', dst: 'sub/plain.tex'}
        ])
        const result = await openActive(extension, fixture, 'main.tex')
        let items = getIntellisense(result.doc, new vscode.Position(7, 7), extension)
        assert.ok(items)
        assert.ok(items.length > 0)
        let labels = items.map(item => item.label.toString())
        assert.ok(labels.includes('main.tex'))
        assert.ok(labels.includes('sub/'))

        items = getIntellisense(result.doc, new vscode.Position(16, 13), extension)
        assert.ok(items)
        assert.ok(items.length > 0)
        labels = items.map(item => item.label.toString())
        assert.ok(labels.includes('main.tex'))
        assert.ok(labels.includes('sub/'))

        items = getIntellisense(result.doc, new vscode.Position(17, 8), extension)
        assert.ok(items)
        assert.ok(items.length > 0)
        labels = items.map(item => item.label.toString())
        assert.ok(!labels.includes('main.tex'))

        items = getIntellisense(result.doc, new vscode.Position(18, 11), extension)
        assert.ok(items)
        assert.ok(items.length > 0)
        labels = items.map(item => item.label.toString())
        assert.ok(!labels.includes('main.tex'))
        assert.ok(labels.includes('sub/'))

        items = getIntellisense(result.doc, new vscode.Position(18, 17), extension)
        assert.ok(items)
        assert.ok(items.length > 0)
        labels = items.map(item => item.label.toString())
        assert.ok(labels.includes('s.tex'))
        assert.ok(labels.includes('plain.tex'))
        assert.ok(!labels.includes('sub/'))
    })

    runTest({suiteName, fixtureName, testName: 'citation intellisense and configs intellisense.citation.*'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.citation.label', 'bibtex key')
        writeTestFile({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\begin{document}', 'abc\\cite{}', '\\bibliography{main}', '\\end{document}')
        await loadTestFile(fixture, [{src: 'base.bib', dst: 'main.bib'}])
        const result = await openActive(extension, fixture, 'main.tex')
        const wait = waitFileParsed(extension, path.resolve(fixture, 'main.bib'))
        await extension.completer.citation.parseBibFile(path.resolve(fixture, 'main.bib'))
        await wait

        let items = getIntellisense(result.doc, new vscode.Position(2, 9), extension)
        assert.ok(items)
        assert.strictEqual(items.length, 3)
        assert.strictEqual(items[0].label, 'art1')
        assert.ok(items[0].filterText)
        assert.ok(items[0].filterText.includes('Journal of CI tests'))
        assert.ok(!items[0].filterText.includes('hintFake'))

        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.citation.label', 'title')
        items = getIntellisense(result.doc, new vscode.Position(2, 9), extension)
        assert.ok(items)
        assert.strictEqual(items.length, 3)
        assert.strictEqual(items[0].label, 'A fake article')

        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.citation.label', 'authors')
        items = getIntellisense(result.doc, new vscode.Position(2, 9), extension)
        assert.ok(items)
        assert.strictEqual(items.length, 3)
        assert.strictEqual(items[0].label, 'Davis, J. and Jones, M.')

        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.citation.format', ['title', 'year', 'description', 'nonexisting'])
        items = getIntellisense(result.doc, new vscode.Position(2, 9), extension)
        assert.ok(items)
        assert.strictEqual(items.length, 3)
        assert.ok(items[0].filterText)
        assert.ok(!items[0].filterText.includes('Journal of CI tests'))
        assert.ok(items[0].filterText.includes('hintFake'))
    })

    runTest({suiteName, fixtureName, testName: 'glossary intellisense'}, async () => {
        await loadTestFile(fixture, [
            {src: 'intellisense_glossary.tex', dst: 'main.tex'},
            {src: 'intellisense_glossaryentries.tex', dst: 'sub/glossary.tex'}
        ])
        const result = await openActive(extension, fixture, 'main.tex')

        const content = extension.manager.getDirtyContent(path.resolve(fixture, 'sub/glossary.tex'))
        assert.ok(content)
        await extension.manager.updateCompleter(path.resolve(fixture, 'sub/glossary.tex'), content)

        const items = getIntellisense(result.doc, new vscode.Position(5, 5), extension)
        assert.ok(items)
        assert.strictEqual(items.length, 7)
        assert.ok(items.find(item => item.label === 'rf' && item.detail === 'radio-frequency'))
        assert.ok(items.find(item => item.label === 'te' && item.detail === 'Transverse Magnetic'))
        assert.ok(items.find(item => item.label === 'E_P' && item.detail === 'Elastic $\\varepsilon$ toto'))
        assert.ok(items.find(item => item.label === 'lw' && item.detail === 'What this extension is $\\mathbb{A}$'))
        assert.ok(items.find(item => item.label === 'vs_code' && item.detail === 'Editor'))
        assert.ok(items.find(item => item.label === 'abbr_y' && item.detail === 'A second abbreviation'))
        assert.ok(items.find(item => item.label === 'abbr_x' && item.detail === 'A first abbreviation'))
    })

    runTest({suiteName, fixtureName, testName: '@-snippet intellisense and configs intellisense.atSuggestion*'}, async () => {
        const replaces = {'@+': '\\sum', '@8': '', '@M': '\\sum'}
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.atSuggestionJSON.replace', replaces)
        await loadTestFile(fixture, [
            {src: 'intellisense_base.tex', dst: 'main.tex'},
            {src: 'intellisense_sub.tex', dst: 'sub/s.tex'}
        ])
        const result = await openActive(extension, fixture, 'main.tex')
        let items = getIntellisense(result.doc, new vscode.Position(5, 1), extension, true)
        assert.ok(items)
        assert.ok(items.length > 0)
        assert.ok(items.find(item => item.label === '@+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\sum'))
        assert.ok(undefined === items.find(item => item.label === '@+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\bigcup'))
        assert.ok(items.find(item => item.label === '@M' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\sum'))
        assert.ok(undefined === items.find(item => item.label === '@8'))

        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.atSuggestion.trigger.latex', '#')
        items = getIntellisense(result.doc, new vscode.Position(6, 1), extension, true)
        assert.ok(items)
        assert.ok(items.length > 0)
        assert.ok(items.find(item => item.label === '#+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\sum'))
        assert.ok(items.find(item => item.label === '#ve' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\varepsilon'))
        assert.ok(undefined === items.find(item => item.label === '@+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\bigcup'))
        assert.ok(undefined === items.find(item => item.label === '#+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\bigcup'))
        assert.ok(undefined === items.find(item => item.label === '#8'))
    })
})
