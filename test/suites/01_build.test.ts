import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'

import { Extension, activate } from '../../src/main'
import { assertBuild, runTest, sleep, waitBuild } from './utils'

suite('Build TeX files test suite', () => {

    let extension: Extension | undefined
    const suiteName = path.basename(__filename).replace('.test.js', '')

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
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.recipes', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.build.forceRecipeUsage', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.exclude', undefined)
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build'}, async (fixture: string) => {
        await assertBuild({fixture, texFileName: 'main_001.tex', pdfFileName: 'main_001.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build with subfiles'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await assertBuild({fixture, texFileName: 'main_002.tex', pdfFileName: 'main_002.pdf', extension})
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
        await assertBuild({fixture, texFileName: 'main_001.tex', pdfFileName: 'main_001.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto-detect subfile root 1'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', true)
        await assertBuild({fixture, texFileName: 'sub_002/sub_002.tex', pdfFileName: 'sub_002/sub_002.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto-detect subfile root 2'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await assertBuild({fixture, texFileName: 'sub_002/sub_002.tex', pdfFileName: 'main_002.pdf', extension})
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
        await assertBuild({fixture, texFileName: 'main_001.tex', pdfFileName: 'out/main_001.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'detect root with search.rootFiles.include'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_004/*.tex'])
        await assertBuild({fixture, texFileName: 'sub_004/s.tex', pdfFileName: 'main_004/main.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'detect root with search.rootFiles.exclude'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.exclude', ['*.tex'])
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_004.tex', 'main_004/*.tex'])
        await assertBuild({fixture, texFileName: 'sub_004/s.tex', pdfFileName: 'main_004/main.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'basic build with spaces in names'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', './')
        await assertBuild({fixture, texFileName: 'main_005 space/main 005.tex', pdfFileName: 'main_005 space/main 005.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'basic build with spaces in outdir'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', '%DIR%/main_005 space')
        await assertBuild({fixture, texFileName: 'main_001.tex', pdfFileName: 'main_005 space/main_001.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'auto-detect root with verbatim'}, async (fixture: string) => {
        await assertBuild({fixture, texFileName: 'sub_005.tex', pdfFileName: 'main_005.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build with magic comment'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.recipes', [])
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.build.forceRecipeUsage', false)
        await assertBuild({fixture, texFileName: 'main_006.tex', pdfFileName: 'main_006.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build with !TEX program and !TEX options'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.recipes', [])
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.build.forceRecipeUsage', false)
        await assertBuild({fixture, texFileName: 'main_007.tex', pdfFileName: 'main_007/main_007.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build with !TEX program and !TEX options'}, async (fixture: string) => {
        await assertBuild({fixture, texFileName: 'sub_008/s.tex', pdfFileName: 'main_008.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build with invalid !TEX program'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.build.forceRecipeUsage', false)
        await assertBuild({fixture, texFileName: 'main_009.tex', pdfFileName: '', extension})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build with forceRecipeUsage: true'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.build.forceRecipeUsage', true)
        await assertBuild({fixture, texFileName: 'main_009.tex', pdfFileName: 'main_009.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build a subfile when main.tex opened'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', true)

        const docMain = await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(fixture, 'main_002.tex')))
        await vscode.window.showTextDocument(docMain)
        const docSub = await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(fixture, 'sub_002/sub_002.tex')))
        await vscode.window.showTextDocument(docSub, vscode.ViewColumn.Beside)

        await assertBuild({fixture, texFileName: 'sub_002/sub_002.tex', pdfFileName: 'sub_002/sub_002.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build main.tex choosing it in QuickPick'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', false)
        await assertBuild({fixture, texFileName: 'sub_002/sub_002.tex', pdfFileName: 'main_002.pdf', extension, build: async () => {
            void vscode.commands.executeCommand('latex-workshop.build')
            await sleep(1000)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            await waitBuild(extension)
        }})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build sub.tex choosing it in QuickPick'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', false)
        await assertBuild({fixture, texFileName: 'sub_002/sub_002.tex', pdfFileName: 'sub_002/sub_002.pdf', extension, build: async () => {
            void vscode.commands.executeCommand('latex-workshop.build')
            await sleep(1000)
            await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
            await sleep(500)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            await waitBuild(extension)
        }})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'build sub.tex choosing it in QuickPick'}, async (fixture: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', './out')
        await assertBuild({fixture, texFileName: 'sub_014/s.tex', pdfFileName: 'sub_014/out/s.pdf', extension})
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'basic build with makeindex'}, async (fixture: string) => {
        await assertBuild({fixture, texFileName: 'main_015.tex', pdfFileName: 'main_015.pdf', extension})
    })

    runTest({win32only: true, suiteName, fixtureName: 'basic', testName: 'test q/.../ on Windows'}, async (fixture: string) => {
        const tools = [{
            'name': 'latexmk',
            'command': 'latexmk',
            'args': [
                '-e',
                '$pdflatex=q/pdflatex %O -synctex=1 -interaction=nonstopmode -file-line-error %S/',
                '-outdir=%OUTDIR%',
                '-pdf',
                '%DOC%'
            ],
            'env': {}
        }]
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', tools)
        await assertBuild({fixture, texFileName: 'main_001.tex', pdfFileName: 'main_001.pdf', extension})
    })

    runTest({win32only: true, suiteName, fixtureName: 'basic', testName: 'test q/.../ with spaces in outdir on Windows'}, async (fixture: string) => {
        const tools = [{
            'name': 'latexmk',
            'command': 'latexmk',
            'args': [
                '-e',
                '$pdflatex=q/pdflatex %O -synctex=1 -interaction=nonstopmode -file-line-error %S/',
                '-outdir=%OUTDIR%',
                '-pdf',
                '%DOC%'
            ],
            'env': {}
        }]
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', tools)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', '%DIR%/out dir')
        await assertBuild({fixture, texFileName: 'main_001.tex', pdfFileName: 'out dir/main_001.pdf', extension})
    })

    runTest({win32only: true, suiteName, fixtureName: 'basic', testName: 'test copy on Windows'}, async (fixture: string) => {
        const tools = [{
            'name': 'latexmk',
            'command': 'latexmk',
            'args': [
                '-e',
                '$pdflatex=q/pdflatex %O -synctex=1 -interaction=nonstopmode -file-line-error %S/',
                '-outdir=%OUTDIR%',
                '-pdf',
                '%DOC%'
            ],
            'env': {}
        }, {
            'name': 'copyPDF',
            'command': 'copy',
            'args': ['%OUTDIR_W32%\\%DOCFILE%.pdf', '%OUTDIR_W32%\\copy_001.pdf'],
            'env': {}
        }]
        const recipes = [{
            'name': 'latexmk_copy',
            'tools': ['latexmk', 'copyPDF']
        }]
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', tools)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.recipes', recipes)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', '%DIR%/out dir')
        await assertBuild({fixture, texFileName: 'main_001.tex', pdfFileName: 'out dir/copy_001.pdf', extension})
    })

})
