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
        this.timeout(5000)
        const document = await vscode.workspace.openTextDocument(texPath)
        await vscode.window.showTextDocument(document)
        await extension.commander.build()
        await sleep(2000)
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
        this.timeout(5000)
        const document = await vscode.workspace.openTextDocument(texPath)
        await vscode.window.showTextDocument(document)
        await extension.commander.build()
        await sleep(2000)
        if (!fs.existsSync(pdfPath)) {
            assert.fail("build fail.")
        }
    })
})
