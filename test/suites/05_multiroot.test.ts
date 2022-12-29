import * as vscode from 'vscode'
import * as path from 'path'
import rimraf from 'rimraf'
import * as assert from 'assert'

import { Extension, activate } from '../../src/main'
import { runTest, writeTeX, assertBuild, touch, assertAutoBuild } from './utils'
import { sleep } from '../utils/ciutils'

suite('Multi-root workspace test suite', () => {

    let extension: Extension | undefined
    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/multiroot')
    const fixtureName = 'multiroot'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        extension = vscode.extensions.getExtension<ReturnType<typeof activate>>('James-Yu.latex-workshop')?.exports.extension
        assert.ok(extension)
        fixture = path.resolve(extension.extensionRoot, 'test/fixtures/multiroot')
    })

    setup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        if (extension) {
            extension.manager.rootFile = undefined
        }

        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.recipes', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.build.forceRecipeUsage', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.exclude', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', undefined)

        if (path.basename(fixture) === 'multiroot') {
            await sleep(250)
            rimraf(fixture + '/A/*', (e) => {if (e) {console.error(e)}})
            rimraf(fixture + '/B/*', (e) => {if (e) {console.error(e)}})
            await sleep(250)
            touch(path.resolve(fixture, 'A', '.gitkeep'))
            touch(path.resolve(fixture, 'B', '.gitkeep'))
        }
    })

    runTest({suiteName, fixtureName, testName: 'basic build A'}, async () => {
        const tools = [
            {name: 'latexmk', command: 'latexmk', args: ['-synctex=1', '-interaction=nonstopmode', '-file-line-error', '-pdf', '-outdir=%OUTDIR%', '-jobname=wsA', '%DOC%'], env: {}},
            {name: 'fake', command: 'touch', args: ['%DIR%/fake.pdf']}
        ]
        const recipes = [{name: 'latexmk', tools: ['latexmk']}]
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', tools)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.recipes', recipes)
        await writeTeX('main', fixture, {fileName: 'A/main.tex'})
        touch(path.resolve(fixture, 'B', 'empty'))
        await assertBuild({fixture, texFileName: 'A/main.tex', pdfFileName: 'A/wsA.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'basic build B'}, async () => {
        const tools = [
            {name: 'latexmk', command: 'latexmk', args: ['-synctex=1', '-interaction=nonstopmode', '-file-line-error', '-pdf', '-outdir=%OUTDIR%', '-jobname=wsB', '%DOC%'], env: {}},
            {name: 'fake', command: 'touch', args: ['%DIR%/fake.pdf']}
        ]
        const recipes = [{name: 'latexmk', tools: ['latexmk']}]
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', tools)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.recipes', recipes)
        await writeTeX('main', fixture, {fileName: 'B/main.tex'})
        touch(path.resolve(fixture, 'A', 'empty'))
        await assertBuild({fixture, texFileName: 'B/main.tex', pdfFileName: 'B/wsB.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'basic build with outDir A'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', './out')
        await writeTeX('main', fixture, {fileName: 'A/main.tex'})
        touch(path.resolve(fixture, 'B', 'empty'))
        await assertBuild({fixture, texFileName: 'A/main.tex', pdfFileName: 'A/out/main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'basic build with outDir B'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', './out')
        await writeTeX('main', fixture, {fileName: 'B/main.tex'})
        touch(path.resolve(fixture, 'A', 'empty'))
        await assertBuild({fixture, texFileName: 'B/main.tex', pdfFileName: 'B/out/main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build with forceRecipeUsage: true'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.build.forceRecipeUsage', true)
        await writeTeX('magicinvalidprogram', fixture, {fileName: 'A/main.tex'})
        touch(path.resolve(fixture, 'B', 'empty'))
        await assertBuild({fixture, texFileName: 'A/main.tex', pdfFileName: 'A/main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'detect root with search.rootFiles.include'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['alt/*.tex'])
        await writeTeX('subfiletwomain', fixture, {fileDir: 'A/'})
        touch(path.resolve(fixture, 'B', 'empty'))
        await assertBuild({fixture, texFileName: 'A/sub/s.tex', pdfFileName: 'A/alt/main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'detect root with search.rootFiles.exclude'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.exclude', ['*.tex'])
        await writeTeX('subfiletwomain', fixture, {fileDir: 'A/'})
        touch(path.resolve(fixture, 'B', 'empty'))
        await assertBuild({fixture, texFileName: 'A/sub/s.tex', pdfFileName: 'A/alt/main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'auto-detect subfile root A1'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', true)
        await writeTeX('subfile', fixture, {fileDir: 'A/'})
        touch(path.resolve(fixture, 'B', 'empty'))
        await assertBuild({fixture, texFileName: 'A/sub/s.tex', pdfFileName: 'A/sub/s.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'auto-detect subfile root A2'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await writeTeX('subfile', fixture, {fileDir: 'A/'})
        touch(path.resolve(fixture, 'B', 'empty'))
        await assertBuild({fixture, texFileName: 'A/sub/s.tex', pdfFileName: 'A/main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'auto-detect subfile root B1'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', true)
        await writeTeX('subfile', fixture, {fileDir: 'B/'})
        touch(path.resolve(fixture, 'A', 'empty'))
        await assertBuild({fixture, texFileName: 'B/sub/s.tex', pdfFileName: 'B/sub/s.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'auto-detect subfile root B2'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await writeTeX('subfile', fixture, {fileDir: 'B/'})
        touch(path.resolve(fixture, 'A', 'empty'))
        await assertBuild({fixture, texFileName: 'B/sub/s.tex', pdfFileName: 'B/main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'auto build with subfiles and onSave 1'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onSave')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await writeTeX('subfile', fixture, {fileDir: 'A/'})
        touch(path.resolve(fixture, 'B', 'empty'))
        await assertAutoBuild({fixture, texFileName: 'A/sub/s.tex', pdfFileName: 'A/main.pdf', extension}, 'onSave')
    })

    runTest({suiteName, fixtureName, testName: 'auto build with subfiles and onSave 2'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', 'onSave')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', true)
        await writeTeX('subfile', fixture, {fileDir: 'A/'})
        touch(path.resolve(fixture, 'B', 'empty'))
        await assertAutoBuild({fixture, texFileName: 'A/sub/s.tex', pdfFileName: 'A/sub/s.pdf', extension}, 'onSave')
    })

    runTest({suiteName, fixtureName, testName: 'switching rootFile'}, async () => {
        await writeTeX('main', fixture, {fileName: 'A/main.tex'})
        await writeTeX('main', fixture, {fileName: 'B/main.tex'})
        await assertBuild({fixture, texFileName: 'A/main.tex', pdfFileName: 'A/main.pdf', extension, removepdf: true})
        await assertBuild({fixture, texFileName: 'B/main.tex', pdfFileName: 'B/main.pdf', extension, removepdf: true})
        await assertBuild({fixture, texFileName: 'A/main.tex', pdfFileName: 'A/main.pdf', extension})
    })
})
