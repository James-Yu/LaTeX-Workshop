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

        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.fileTypes', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.subfolder.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.method', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.command', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.args', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoClean.run', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.cleanAndRetry.enabled', undefined)
    })

    test.run('glob clean', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.method', 'glob')
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

    test.run('glob clean with `latex-workshop.latex.clean.fileTypes`', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.method', 'glob')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.fileTypes', ['*.aux'])
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'},
            {src: 'empty', dst: 'main.aux'},
            {src: 'empty', dst: 'main.fls'},
            {src: 'empty', dst: 'sub.aux'}
        ], {skipCache: true})
        await lw.extra.clean(path.resolve(fixture, 'main.tex'))
        assert.ok(!fs.existsSync(path.resolve(fixture, 'main.aux')))
        assert.ok(fs.existsSync(path.resolve(fixture, 'main.fls')))
        assert.ok(!fs.existsSync(path.resolve(fixture, 'sub.aux')))
    })

    test.run('glob clean with `latex.clean.subfolder.enabled`', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.method', 'glob')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.subfolder.enabled', false)
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'},
            {src: 'empty', dst: 'out/main.aux'}
        ], {skipCache: true})
        await lw.extra.clean(path.resolve(fixture, 'main.tex'))
        assert.ok(fs.existsSync(path.resolve(fixture, 'out/main.aux')))

        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.subfolder.enabled', true)
        await lw.extra.clean(path.resolve(fixture, 'main.tex'))
        assert.ok(!fs.existsSync(path.resolve(fixture, 'out/main.aux')))
    })

    test.run('latexmk clean', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.command', 'latexmk')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.args', ['-c', '%TEX%'])
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'},
            {src: 'empty', dst: 'main.aux'}
        ], {skipCache: true})
        await lw.extra.clean()
        assert.ok(!fs.existsSync(path.resolve(fixture, 'main.aux')))
    })

    test.run('latexmk clean with auxdir', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.command', 'latexmk')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.args', ['-c', '-auxdir=%OUTDIR%/aux_files', '%TEX%'])
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'},
            {src: 'empty', dst: 'aux_files/main.aux'}
        ], {skipCache: true})
        await lw.extra.clean()
        assert.ok(!fs.existsSync(path.resolve(fixture, 'aux_files/main.aux')))
    })

    test.run('clean with `latex.autoClean.run` on `never` and failed build', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.method', 'glob')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.fileTypes', ['*.aux','*.fls', '*.pdf'])
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.cleanAndRetry.enabled', false)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoClean.run', 'never')
        await test.load(fixture, [
            {src: 'invalid_cmd.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await lw.extra.clean() // Clean up previous remainders to ensure next build to fail
        const cleaned = test.wait(lw.event.AutoCleaned).then(() => true)
        await test.build(fixture, 'main.tex')
        const result = await Promise.any([cleaned, test.sleep(1000)])
        assert.ok(!result)
    })

    test.run('clean with `latex.autoClean.run` on `never` and passed build', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoClean.run', 'never')
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await lw.extra.clean()
        const cleaned = test.wait(lw.event.AutoCleaned).then(() => true)
        await test.build(fixture, 'main.tex')
        const result = await Promise.any([cleaned, test.sleep(1000)])
        assert.ok(!result)
    })

    test.run('clean with `latex.autoClean.run` on `onFailed`', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.method', 'glob')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.fileTypes', ['*.aux','*.fls', '*.pdf'])
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.cleanAndRetry.enabled', false)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoClean.run', 'onFailed')
        await test.load(fixture, [
            {src: 'invalid_cmd.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await lw.extra.clean() // Clean up previous remainders to ensure next build to fail
        let cleaned = test.wait(lw.event.AutoCleaned).then(() => true)
        await test.build(fixture, 'main.tex')
        let result = await Promise.any([cleaned, test.sleep(1000)])
        assert.ok(result)

        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await lw.extra.clean() // Clean up previous remainders to ensure next build to fail
        cleaned = test.wait(lw.event.AutoCleaned).then(() => true)
        await test.build(fixture, 'main.tex')
        result = await Promise.any([cleaned, test.sleep(1000)])
        assert.ok(!result)
    })

    test.run('clean with `latex.autoClean.run` on `onBuilt`', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.method', 'glob')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.fileTypes', ['*.aux','*.fls', '*.pdf'])
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.cleanAndRetry.enabled', false)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoClean.run', 'onBuilt')
        await test.load(fixture, [
            {src: 'invalid_cmd.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await lw.extra.clean() // Clean up previous remainders to ensure next build to fail
        let cleaned = test.wait(lw.event.AutoCleaned).then(() => true)
        await test.build(fixture, 'main.tex')
        let result = await Promise.any([cleaned, test.sleep(1000)])
        assert.ok(result)

        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await lw.extra.clean()
        cleaned = test.wait(lw.event.AutoCleaned).then(() => true)
        await test.build(fixture, 'main.tex')
        result = await Promise.any([cleaned, test.sleep(1000)])
        assert.ok(result)
    })

    test.run('clean and retry on failed build', async (fixture: string) => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.method', 'glob')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.clean.fileTypes', ['*.aux','*.fls', '*.pdf'])
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.cleanAndRetry.enabled', false)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.build.forceRecipeUsage', false)
        await test.load(fixture, [
            {src: 'invalid_cmd.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await lw.extra.clean() // Clean up previous remainders to ensure next build to fail
        let cleaned = test.wait(lw.event.AutoCleaned).then(() => true)
        await test.build(fixture, 'main.tex')
        let result = await Promise.any([cleaned, test.sleep(1000)])
        assert.ok(!result)

        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.cleanAndRetry.enabled', true)
        await lw.extra.clean()
        cleaned = test.wait(lw.event.AutoCleaned).then(() => true)
        await test.build(fixture, 'main.tex')
        result = await Promise.any([cleaned, test.sleep(1000)])
        assert.ok(result)
    })
})
