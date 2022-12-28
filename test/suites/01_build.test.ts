import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import rimraf from 'rimraf'
import * as assert from 'assert'

import { Extension, activate } from '../../src/main'
import { assertBuild, runTest, waitBuild, writeTest } from './utils'
import { sleep } from '../utils/ciutils'

suite('Build TeX files test suite', () => {

    let extension: Extension | undefined
    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/testground')
    const fixtureName = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        extension = vscode.extensions.getExtension<ReturnType<typeof activate>>('James-Yu.latex-workshop')?.exports.extension
        assert.ok(extension)
        fixture = path.resolve(extension.extensionRoot, 'test/fixtures/testground')
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
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.exclude', undefined)

        if (path.basename(fixture) === 'testground') {
            await sleep(250)
            rimraf(fixture + '/*', (e) => {if (e) {console.error(e)}})
            await sleep(250)
            fs.closeSync(fs.openSync(fixture + '/.gitkeep', 'a'))
        }
    })

    async function writeMainTeX(fileName?: string) {
        fileName = fileName || 'main.tex'
        writeTest({fixture, fileName}, '\\documentclass{article}', '\\begin{document}', 'abc', '\\end{document}')
        await sleep(250)
    }

    async function writeMakeIndexTeX() {
        writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{makeidx}', '\\makeindex', '\\begin{document}', 'abc\\index{abc}', '\\printindex', '\\end{document}')
        await sleep(250)
    }

    async function writeMagicProgramTeX() {
        writeTest({fixture, fileName: 'main.tex'}, '% !TEX program = pdflatex', '\\documentclass{article}', '\\begin{document}', 'abc', '\\end{document}')
        await sleep(250)
    }

    async function writeMagicOptionTeX() {
        writeTest({fixture, fileName: 'main.tex'}, '% !TEX program = latexmk', '% !TEX options = -synctex=1 -interaction=nonstopmode -file-line-error -pdf -outdir="./out/" "%DOC%"', '\\documentclass{article}', '\\begin{document}', 'abc', '\\end{document}')
        await sleep(250)
    }

    async function writeMagicRootTeX() {
        writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\begin{document}', 'main main', '\\input{sub/s}', '\\end{document}')
        writeTest({fixture, fileName: 'alt.tex'}, '\\documentclass{article}', '\\begin{document}', 'alt alt', '\\input{sub/s}', '\\end{document}')
        writeTest({fixture, fileName: 'sub/s.tex'}, '% !TEX root = ../main.tex', 'sub sub')
        await sleep(250)
    }

    async function writeMagicInvalidProgramTeX() {
        writeTest({fixture, fileName: 'main.tex'}, '% !TEX program = noexistprogram', '\\documentclass{article}', '\\begin{document}', 'abc', '\\end{document}')
        await sleep(250)
    }

    async function writeSubFileTeX() {
        writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{subfiles}', '\\begin{document}', 'main main', '\\subfile{sub/s}', '\\end{document}')
        writeTest({fixture, fileName: 'sub/s.tex'}, '\\documentclass[../main.tex]{subfiles}', '\\begin{document}', 'sub sub', '\\end{document}')
        await sleep(250)
    }

    async function writeSubFileVerbtimTeX() {
        writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\begin{document}', 'main main', '\\input{sub/s}', '\\end{document}')
        writeTest({fixture, fileName: 'sub/s.tex'}, '\\section{Introduction}', 'This is a minimum \\LaTeX\\ document:', '\\begin{verbatim}', '\\documentclass{article}', '\\begin{document}', 'sub sub', '\\end{document}', '\\end{verbatim}')
        await sleep(250)
    }

    async function writeSubFileTwoMainTeX() {
        writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{subfiles}', '\\begin{document}', 'main main', '\\subfile{sub/s}', '\\end{document}')
        writeTest({fixture, fileName: 'alt/main.tex'}, '\\documentclass{article}', '\\begin{document}', 'alt alt', '\\input{../sub/s}', '\\end{document}')
        writeTest({fixture, fileName: 'sub/s.tex'}, 'sub sub')
        await sleep(250)
    }

    async function writeSubFileThreeLayerTeX() {
        writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{subfiles}', '\\begin{document}', 'main main', '\\subfile{sub/s}', '\\end{document}')
        writeTest({fixture, fileName: 'sub/s.tex'}, '\\documentclass[../main.tex]{subfiles}', '\\begin{document}', 'sub sub', '\\input{./subsub/infile}', '\\end{document}')
        writeTest({fixture, fileName: 'sub/subsub/infile.tex'}, 'subsub subsub')
        await sleep(250)
    }

    runTest({suiteName, fixtureName, testName: 'build'}, async () => {
        await writeMainTeX()
        await assertBuild({fixture, texFileName: 'main.tex', pdfFileName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build with subfiles'}, async () => {
        await writeSubFileTeX()
        await assertBuild({fixture, texFileName: 'main.tex', pdfFileName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'same placeholders multiple times'}, async () => {
        const tools = [{name: 'latexmk', command: 'latexmk', args: ['-synctex=1', '-interaction=nonstopmode', '-file-line-error', '-pdf', '%DOC%', '%DOC%', '%DOC%']}]
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', tools)

        await writeMainTeX()
        await assertBuild({fixture, texFileName: 'main.tex', pdfFileName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'auto-detect subfile root 1'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', true)
        await writeSubFileTeX()
        await assertBuild({fixture, texFileName: 'sub/s.tex', pdfFileName: 'sub/s.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'auto-detect subfile root 2'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', false)
        await writeSubFileTeX()
        await assertBuild({fixture, texFileName: 'sub/s.tex', pdfFileName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build with outDir'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', './out')
        await writeMainTeX()
        await assertBuild({fixture, texFileName: 'main.tex', pdfFileName: 'out/main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'detect root with search.rootFiles.include'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['alt/*.tex'])
        await writeSubFileTwoMainTeX()
        await assertBuild({fixture, texFileName: 'sub/s.tex', pdfFileName: 'alt/main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'detect root with search.rootFiles.exclude'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.exclude', ['*.tex'])
        await writeSubFileTwoMainTeX()
        await assertBuild({fixture, texFileName: 'sub/s.tex', pdfFileName: 'alt/main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'basic build with spaces in names'}, async () => {
        await writeMainTeX('main space/main.tex')
        await assertBuild({fixture, texFileName: 'main space/main.tex', pdfFileName: 'main space/main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'basic build with spaces in outdir'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', '%DIR%/out space')
        await writeMainTeX()
        await assertBuild({fixture, texFileName: 'main.tex', pdfFileName: 'out space/main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'auto-detect root with verbatim'}, async () => {
        await writeSubFileVerbtimTeX()
        await assertBuild({fixture, texFileName: 'sub/s.tex', pdfFileName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build with magic comment'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.recipes', [])
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.build.forceRecipeUsage', false)
        await writeMagicProgramTeX()
        await assertBuild({fixture, texFileName: 'main.tex', pdfFileName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build with !TEX program and !TEX options'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.recipes', [])
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.build.forceRecipeUsage', false)
        await writeMagicOptionTeX()
        await assertBuild({fixture, texFileName: 'main.tex', pdfFileName: 'out/main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build with !TEX root'}, async () => {
        await writeMagicRootTeX()
        await assertBuild({fixture, texFileName: 'sub/s.tex', pdfFileName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build with invalid !TEX program'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.build.forceRecipeUsage', false)
        await writeMagicInvalidProgramTeX()
        await assertBuild({fixture, texFileName: 'main.tex', pdfFileName: '', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build with forceRecipeUsage: true'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.build.forceRecipeUsage', true)
        await writeMagicInvalidProgramTeX()
        await assertBuild({fixture, texFileName: 'main.tex', pdfFileName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build a subfile when main.tex opened'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.useSubFile', true)
        await writeSubFileTeX()

        const docMain = await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(fixture, 'main.tex')))
        await vscode.window.showTextDocument(docMain)
        const docSub = await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(fixture, 'sub/s.tex')))
        await vscode.window.showTextDocument(docSub, vscode.ViewColumn.Beside)

        await assertBuild({fixture, texFileName: 'sub/s.tex', pdfFileName: 'sub/s.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'build main.tex choosing it in QuickPick'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', false)
        await writeSubFileTeX()
        await assertBuild({fixture, texFileName: 'sub/s.tex', pdfFileName: 'main.pdf', extension, build: async () => {
            void vscode.commands.executeCommand('latex-workshop.build')
            await sleep(1000)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            await waitBuild(extension)
        }})
    })

    runTest({suiteName, fixtureName, testName: 'build s.tex choosing it in QuickPick'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', false)
        await writeSubFileTeX()
        await assertBuild({fixture, texFileName: 'sub/s.tex', pdfFileName: 'sub/s.pdf', extension, build: async () => {
            void vscode.commands.executeCommand('latex-workshop.build')
            await sleep(1000)
            await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext')
            await sleep(500)
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem')
            await waitBuild(extension)
        }})
    })

    runTest({suiteName, fixtureName, testName: 'build sub.tex to outdir'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', './out')
        await writeSubFileThreeLayerTeX()
        await assertBuild({fixture, texFileName: 'sub/s.tex', pdfFileName: 'sub/out/s.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'basic build with makeindex'}, async () => {
        await writeMakeIndexTeX()
        await assertBuild({fixture, texFileName: 'main.tex', pdfFileName: 'main.pdf', extension})
    })

    runTest({win32only: true, suiteName, fixtureName, testName: 'test q/.../ with spaces in outdir on Windows'}, async () => {
        const tools = [{ name: 'latexmk', command: 'latexmk', args: ['-e', '$pdflatex=q/pdflatex %O -synctex=1 -interaction=nonstopmode -file-line-error %S/', '-outdir=%OUTDIR%', '-pdf', '%DOC%'], env: {} }]
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', tools)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', '%DIR%/out space')
        await writeMainTeX()
        await assertBuild({fixture, texFileName: 'main.tex', pdfFileName: 'out space/main.pdf', extension})
    })

    runTest({win32only: true, suiteName, fixtureName, testName: 'test q/.../ with spaces in outdir on Windows'}, async () => {
        const tools = [{ name: 'latexmk', command: 'latexmk', args: ['-e', '$pdflatex=q/pdflatex %O -synctex=1 -interaction=nonstopmode -file-line-error %S/', '-outdir=%OUTDIR%', '-pdf', '%DOC%'], env: {} }, {name: 'copyPDF', command: 'copy', args: ['%OUTDIR_W32%\\%DOCFILE%.pdf', '%OUTDIR_W32%\\copy.pdf'], env: {}}]
        const recipes = [{name: 'latexmk_copy', tools: ['latexmk', 'copyPDF']}]
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', tools)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.recipes', recipes)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.outDir', '%DIR%/out space')
        await writeMainTeX()
        await assertBuild({fixture, texFileName: 'main.tex', pdfFileName: 'out space/copy.pdf', extension})
    })

})
