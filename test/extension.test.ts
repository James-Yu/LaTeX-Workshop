//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'
import {Extension} from '../src/main'
import {HoverProvider} from '../src/providers/hover'


const extension = new Extension()
const workspaceRoot = process.env.CODE_WORKSPACE_ROOT || process.env.PWD || ''
if (workspaceRoot === '') {
    assert.fail("workspaceRoot path must be set.")
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Defines a Mocha test suite to group tests of similar kind together
suite("Extension Tests", function () {


    test("build a tex file.", async function() {
        const pdfPath = path.join(workspaceRoot, 'test/texfiles/latex/t.pdf')
        const texPath = path.join(workspaceRoot, 'test/texfiles/latex/t.tex')
        if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath)
        }
        this.timeout(30000)
        const document = await vscode.workspace.openTextDocument(texPath)
        await vscode.window.showTextDocument(document)
        await extension.commander.build()
        await sleep(5000)
        if (!fs.existsSync(pdfPath)) {
            assert.fail("build fail.")
        }
    })

    test("build a tex file whose root is self.", async function() {
        const pdfPath = path.join(workspaceRoot, 'test/texfiles/rootToSelf/t.pdf')
        const texPath = path.join(workspaceRoot, 'test/texfiles/rootToSelf/t.tex')
        if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath)
        }
        this.timeout(30000)
        const document = await vscode.workspace.openTextDocument(texPath)
        await vscode.window.showTextDocument(document)
        await extension.commander.build()
        await sleep(5000)
        if (!fs.existsSync(pdfPath)) {
            assert.fail("build fail.")
        }
    })

    test("test hover preview.", async function() {
        const pdfPath = path.join(workspaceRoot, 'test/texfiles/hoverPreview/t.pdf')
        const texPath = path.join(workspaceRoot, 'test/texfiles/hoverPreview/t.tex')
        if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath)
        }
        this.timeout(30000)
        const document = await vscode.workspace.openTextDocument(texPath)
        await vscode.window.showTextDocument(document)
        const editor = vscode.window.activeTextEditor
        if (editor) {
            const selection = new vscode.Selection(3,1,3,1)
            editor.selection = selection
            vscode.commands.executeCommand("editor.action.showHover")
        } else {
            assert.fail("activeTextEditor not found.")
        }

        const hoveProvider = new HoverProvider(extension)
        await sleep(5000)
        const pos = new vscode.Position(3,1)
        const s = new vscode.CancellationTokenSource()
        await hoveProvider.provideHover(document, pos, s.token)

        const configuration = vscode.workspace.getConfiguration('workbench')
        const originalTheme = configuration.get<string>('colorTheme')
        configuration.update('workbench.colorTheme', "Better Solarized Dark")
        await hoveProvider.provideHover(document, pos, s.token)
        configuration.update('workbench.colorTheme', originalTheme)
    })

})
