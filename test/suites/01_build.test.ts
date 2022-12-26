import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as assert from 'assert'
import glob from 'glob'

import { Extension, activate } from '../../src/main'
import { runTest } from './utils'

suite('Build TeX files test suite', () => {

    let extension: Extension | undefined
    const suiteName = path.basename(__filename).replace('.test.js', '')

    async function assertBuild(fixture: string, texFileName: string, pdfFileName: string) {
        const texFilePath = vscode.Uri.file(path.join(fixture, texFileName))
        const pdfFilePath = path.join(fixture, pdfFileName)
        const doc = await vscode.workspace.openTextDocument(texFilePath)
        await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()
        await vscode.commands.executeCommand('latex-workshop.build')
        for (const ext of ['aux', 'fdb_latexmk', 'fls', 'log', 'synctex.gz']) {
            const files = glob.sync(`**/**.${ext}`, { cwd: fixture })
            files.forEach(file => {
                if (!fs.existsSync(path.resolve(fixture, file))) {
                    return
                }
                fs.unlinkSync(path.resolve(fixture, file))
            })
        }
        const pdfs = glob.sync('**/**.pdf', { cwd: fixture })
        pdfs.forEach(file => {
            if (!fs.existsSync(path.resolve(fixture, file))) {
                return
            }
            fs.unlinkSync(path.resolve(fixture, file))
        })
        assert.strictEqual(pdfs.map(file => path.resolve(fixture, file)).join(','), pdfFileName === '' ? pdfFileName : pdfFilePath)
    }

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        extension = vscode.extensions.getExtension<ReturnType<typeof activate>>('James-Yu.latex-workshop')?.exports.extension
        assert.ok(extension)
    })

    setup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.autoBuild.run', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.recipes', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.build.forceRecipeUsage', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.exclude', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.watch.files.ignore', undefined)
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build'}, async (fixture: string) => {
        await assertBuild(fixture, 'main_001.tex', 'main_001.pdf')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build with subfiles'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await assertBuild(fixture, 'main_002.tex', 'main_002.pdf')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'same placeholders multiple times'}, async (fixture: string) => {
        const tools = [{
            'name': 'latexmk',
            'command': 'latexmk',
            'args': [
                '-synctex=1',
                '-interaction=nonstopmode',
                '-file-line-error',
                '-pdf',
                '%DOC%',
                '%DOC%',
                '%DOC%'
            ]
        }]
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', tools)
        await assertBuild(fixture, 'main_001.tex', 'main_001.pdf')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto-detect subfile root 1'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', true)
        await assertBuild(fixture, 'sub_002/sub_002.tex', 'sub_002/sub_002.pdf')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto-detect subfile root 2'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await assertBuild(fixture, 'sub_002/sub_002.tex', 'main_002.pdf')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build with outDir'}, async (fixture: string) => {
        const tools = [{
            'name': 'latexmk',
            'command': 'latexmk',
            'args': [
                '-synctex=1',
                '-interaction=nonstopmode',
                '-file-line-error',
                '-pdf',
                '-outdir=out',
                '%DOC%'
            ]
        }]
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', tools)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', './out')
        await assertBuild(fixture, 'main_001.tex', 'out/main_001.pdf')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'detect root with search.rootFiles.include'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_004/*.tex'])
        await assertBuild(fixture, 'sub_004/s.tex', 'main_004/main.pdf')
    })

    runTest({only: true, suiteName, fixtureName: 'basic', testName: 'detect root with search.rootFiles.exclude'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.exclude', ['*.tex'])
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_004.tex', 'main_004/*.tex'])
        await assertBuild(fixture, 'sub_004/s.tex', 'main_004/main.pdf')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'basic build with spaces in names'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', './')
        await assertBuild(fixture, 'main_005 space/main 005.tex', 'main_005 space/main 005.pdf')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'basic build with spaces in outdir'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', '%DIR%/main_005 space')
        await assertBuild(fixture, 'main_001.tex', 'main_005 space/main_001.pdf')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto-detect root with verbatim'}, async (fixture: string) => {
        await assertBuild(fixture, 'sub_005.tex', 'main_005.pdf')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build with magic comment'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.recipes', [])
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.build.forceRecipeUsage', false)
        await assertBuild(fixture, 'main_006.tex', 'main_006.pdf')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build with !TEX program and !TEX options'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.recipes', [])
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.build.forceRecipeUsage', false)
        await assertBuild(fixture, 'main_007.tex', 'main_007/main_007.pdf')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build with !TEX program and !TEX options'}, async (fixture: string) => {
        await assertBuild(fixture, 'sub_008/s.tex', 'main_008.pdf')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build with invalid !TEX program'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.build.forceRecipeUsage', false)
        await assertBuild(fixture, 'main_009.tex', '')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build with forceRecipeUsage: true'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.build.forceRecipeUsage', true)
        await assertBuild(fixture, 'main_009.tex', 'main_009.pdf')
    })

})
