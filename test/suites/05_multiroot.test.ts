import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import rimraf from 'rimraf'
import * as assert from 'assert'

import { Extension, activate } from '../../src/main'
import { runTest, writeTeX, assertBuild } from './utils'
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

        if (path.basename(fixture) === 'multiroot') {
            await sleep(250)
            rimraf(fixture + '/A/*', (e) => {if (e) {console.error(e)}})
            rimraf(fixture + '/B/*', (e) => {if (e) {console.error(e)}})
            await sleep(250)
            fs.closeSync(fs.openSync(path.resolve(fixture, 'A', '.gitkeep'), 'a'))
            fs.closeSync(fs.openSync(path.resolve(fixture, 'B', '.gitkeep'), 'a'))
        }
    })

    runTest({suiteName, fixtureName, testName: 'basic completion'}, async () => {
        const tools = [
            {name: 'latexmk', command: 'latexmk', args: ['-synctex=1', '-interaction=nonstopmode', '-file-line-error', '-pdf', '-outdir=%OUTDIR%', '-jobname=wsA', '%DOC%'], env: {}},
            {name: 'fake', command: 'touch', args: ['%DIR%/fake.pdf']}
        ]
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.tools', tools)
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.recipe.default', 'latexmk')
        await writeTeX('main', fixture, {fileName: 'A/main.tex'})
        fs.closeSync(fs.openSync(path.resolve(fixture, 'B', 'empty'), 'a'))
        await assertBuild({fixture, texFileName: 'A/main.tex', pdfFileName: 'A/wsA.pdf', extension})
    })

})
