import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as assert from 'assert'
import { lw } from '../../src/lw'
import * as test from './utils'

suite('Cleaner test suite', () => {
    test.suite.name = path.basename(__filename).replace('.test.js', '')
    test.suite.fixture = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'never')
    })

    teardown(async () => {
        await test.reset()

        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoClean.run', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.cleanAndRetry.enabled', undefined)
    })

    test.run('fixed clean removes standard aux files but not unrelated files', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'},
            {src: 'empty', dst: 'main.aux'},
            {src: 'empty', dst: 'main.fls'},
            {src: 'empty', dst: 'sub.aux'}
        ], {skipCache: true})
        await lw.extra.clean(path.resolve(fixture, 'main.tex'))
        assert.ok(!fs.existsSync(path.resolve(fixture, 'main.aux')))
        assert.ok(!fs.existsSync(path.resolve(fixture, 'main.fls')))
        assert.ok(fs.existsSync(path.resolve(fixture, 'sub.aux')))
    })

    test.run('fixed clean never removes the built pdf', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'},
            {src: 'empty', dst: 'main.aux'},
            {src: 'empty', dst: 'main.pdf'}
        ], {skipCache: true})
        await lw.extra.clean(path.resolve(fixture, 'main.tex'))
        assert.ok(!fs.existsSync(path.resolve(fixture, 'main.aux')))
        assert.ok(fs.existsSync(path.resolve(fixture, 'main.pdf')))
    })

    test.run('fixed clean ignores external clean command settings', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.command', 'echo')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.args', ['should-not-run'])
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'},
            {src: 'empty', dst: 'main.aux'}
        ], {skipCache: true})
        await lw.extra.clean(path.resolve(fixture, 'main.tex'))
        assert.ok(!fs.existsSync(path.resolve(fixture, 'main.aux')))
    })

    test.run('build failure does not trigger auto clean or retry', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.cleanAndRetry.enabled', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoClean.run', 'onBuilt')
        await test.load(fixture, [
            {src: 'invalid_cmd.tex', dst: 'main.tex'}
        ], {skipCache: true})
        const cleaned = test.wait(lw.event.AutoCleaned).then(() => true)
        await test.build(fixture, 'main.tex')
        const result = await Promise.any([cleaned, test.sleep(1000)])
        assert.ok(!result)
    })

    test.run('successful build does not trigger auto clean', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoClean.run', 'onBuilt')
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})
        const cleaned = test.wait(lw.event.AutoCleaned).then(() => true)
        await test.build(fixture, 'main.tex')
        const result = await Promise.any([cleaned, test.sleep(1000)])
        assert.ok(!result)
    })
})
