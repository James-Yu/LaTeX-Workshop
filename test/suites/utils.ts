import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as glob from 'glob'
import * as os from 'os'
import * as assert from 'assert'
import { Extension } from '../../src/main'

type RunTestOption = {
    suiteName: string,
    fixtureName: string,
    testName: string,
    timeout?: number,
    only?: boolean,
    win32only?: boolean
}

export function runTest(option: RunTestOption, cb: (fixture: string) => unknown) {
    let fixture: string | undefined
    if (vscode.workspace.workspaceFile) {
        fixture = path.dirname(vscode.workspace.workspaceFile.fsPath)
    } else {
        fixture = vscode.workspace.workspaceFolders?.[0].uri.fsPath
    }

    if (fixture === undefined) {
        return
    }
    if (path.basename(fixture) !== option.fixtureName) {
        return
    }
    if (process.env['LATEXWORKSHOP_CISUITE'] && !process.env['LATEXWORKSHOP_CISUITE'].split(',').includes(option.suiteName)) {
        return
    }
    if (option.win32only && os.platform() !== 'win32') {
        return
    }

    const testFunction = option.only ? test.only : test

    testFunction(`${option.suiteName}: ${option.testName}`, async () => {
        try {
            await cb(fixture || '.')
        } catch (error) {
            await log()
            throw error
        }
        // await cb(fixture || '.')
    }).timeout(option.timeout || 30000)
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function log() {
    await vscode.commands.executeCommand('workbench.action.output.toggleOutput')
    await sleep(250)
    await vscode.commands.executeCommand('latex-workshop.log')
    await sleep(250)
    const logMessage = vscode.window.activeTextEditor?.document.getText()
    console.log(logMessage)
    await vscode.commands.executeCommand('latex-workshop.compilerlog')
    await sleep(250)
    const compilerLogMessage = vscode.window.activeTextEditor?.document.getText()
    console.log(compilerLogMessage)
}

type WriteTestOption = {
    fixture: string,
    fileName: string
}

export function writeTest(option: WriteTestOption, ...contents: string[]) {
    fs.mkdirSync(path.resolve(option.fixture, path.dirname(option.fileName)), {recursive: true})
    fs.writeFileSync(path.resolve(option.fixture, option.fileName), contents.join('\n'))
}

type AssertBuildOption = {
    fixture: string,
    texFileName: string,
    pdfFileName: string,
    extension?: Extension,
    build?: () => unknown,
    edits?: (cb: vscode.TextEditorEdit) => unknown,
    nobuild?: boolean
}

export async function assertBuild(option: AssertBuildOption) {
    const texFilePath = vscode.Uri.file(path.join(option.fixture, option.texFileName))
    const pdfFilePath = path.join(option.fixture, option.pdfFileName)
    const doc = await vscode.workspace.openTextDocument(texFilePath)
    const editor = await vscode.window.showTextDocument(doc)
    await option.extension?.manager.findRoot()
    await executeBuild(editor, doc, option)

    const files = glob.sync('**/**.pdf', { cwd: option.fixture })
    assert.strictEqual(files.map(file => path.resolve(option.fixture, file)).join(','), option.pdfFileName === '' ? option.pdfFileName : pdfFilePath)
}

async function executeBuild(editor: vscode.TextEditor, doc: vscode.TextDocument, option: AssertBuildOption) {
    if (option.edits) {
        await sleep(500)
        await editor.edit(option.edits)
        await sleep(500)
        await doc.save()
        if (option.nobuild) {
            await sleep(3000)
        } else {
            await waitBuild(option.extension)
        }
        return
    }
    if (option.build) {
        await option.build()
        return
    }
    await vscode.commands.executeCommand('latex-workshop.build')
}

export async function waitBuild(extension?: Extension) {
    return new Promise<void>((resolve, _) => {
        const disposable = extension?.eventBus.on('buildfinished', () => {
            resolve()
            disposable?.dispose()
        })
    })
}
