import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as assert from 'assert'
import rimraf from 'rimraf'
import glob from 'glob'

import { Extension } from '../../src/main'
import { sleep, getExtension, getIntellisense, runTest, writeTeX, openActive } from './utils'
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

    runTest({suiteName, fixtureName, testName: 'basic completion'}, async () => {
        await writeTeX('intellisense', fixture)
        const result = await openActive(extension, fixture, 'main.tex')
        const items = getIntellisense(result.doc, new vscode.Position(7, 1), extension)
        assert.ok(items)
        assert.ok(items.length > 0)
    })

    runTest({suiteName, fixtureName, testName: '@-snippet completion'}, async () => {
        const replaces = {'@+': '\\sum', '@8': '', '@M': '\\sum'}
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.atSuggestionJSON.replace', replaces)
        await writeTeX('intellisense', fixture)
        const result = await openActive(extension, fixture, 'main.tex')
        const items = getIntellisense(result.doc, new vscode.Position(8, 1), extension, true)
        assert.ok(items)
        assert.ok(items.length > 0)
        assert.ok(items.find(item => item.label === '@+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\sum'))
        assert.ok(undefined === items.find(item => item.label === '@+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\bigcup'))
        assert.ok(items.find(item => item.label === '@M' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\sum'))
        assert.ok(undefined === items.find(item => item.label === '@8'))
    })

    runTest({suiteName, fixtureName, testName: '@-snippet completion with trigger #'}, async () => {
        const replaces = {'@+': '\\sum', '@8': ''}
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.atSuggestionJSON.replace', replaces)
        await vscode.workspace.getConfiguration('latex-workshop').update('intellisense.atSuggestion.trigger.latex', '#')
        await writeTeX('intellisense', fixture)
        const result = await openActive(extension, fixture, 'main.tex')
        const items = getIntellisense(result.doc, new vscode.Position(9, 1), extension, true)
        assert.ok(items)
        assert.ok(items.length > 0)
        assert.ok(items.find(item => item.label === '#+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\sum'))
        assert.ok(items.find(item => item.label === '#ve' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\varepsilon'))
        assert.ok(undefined === items.find(item => item.label === '@+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\bigcup'))
        assert.ok(undefined === items.find(item => item.label === '#+' && item.insertText instanceof vscode.SnippetString && item.insertText.value === '\\bigcup'))
        assert.ok(undefined === items.find(item => item.label === '#8'))
    })

    runTest({suiteName, fixtureName, testName: 'glossary completion'}, async () => {
        await writeTeX('intellisense', fixture)
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
})
