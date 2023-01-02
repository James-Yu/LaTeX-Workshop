import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as glob from 'glob'
import * as os from 'os'
import * as assert from 'assert'

import { Extension, activate } from '../../src/main'
import { BuildDone, FileParsed, ViewerPageLoaded, ViewerStatusChanged } from '../../src/components/eventbus'
import type { EventName } from '../../src/components/eventbus'

export async function getExtension() {
    await vscode.commands.executeCommand('latex-workshop.activate')
    const extension = vscode.extensions.getExtension<ReturnType<typeof activate>>('James-Yu.latex-workshop')?.exports.extension
    assert.ok(extension)
    return extension
}

type RunTestOption = {
    suiteName: string,
    fixtureName: string,
    testName: string,
    timeout?: number,
    only?: boolean,
    win32only?: boolean
}

let testCounter = 0

export function runTest(option: RunTestOption, cb: () => unknown) {
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
    if (process.env['LATEXWORKSHOP_SUITE'] && !process.env['LATEXWORKSHOP_SUITE'].split(',').includes(option.suiteName)) {
        return
    }
    if (option.win32only && os.platform() !== 'win32') {
        return
    }

    testCounter++
    const testFunction = (process.env['LATEXWORKSHOP_CLI'] || !option.only) ? test : test.only
    const counterString = testCounter.toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping: false})

    testFunction(`[${counterString}] ${option.suiteName}: ${option.testName}`, async () => {
        try {
            await cb()
        } catch (error) {
            await log(counterString)
            throw error
        }
    }).timeout(option.timeout || 15000)
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function log(counter: string) {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors')
    await sleep(500)
    await vscode.commands.executeCommand('workbench.action.output.toggleOutput')
    await sleep(500)
    await vscode.commands.executeCommand('latex-workshop.log')
    await sleep(500)
    const extensionMessage = vscode.window.activeTextEditor?.document.getText()
    await vscode.commands.executeCommand('latex-workshop.compilerlog')
    await sleep(500)
    const compilerMessage = vscode.window.activeTextEditor?.document.getText()

    const logFolder = path.resolve(__dirname, '../../../test/log')
    fs.mkdirSync(logFolder, {recursive: true})
    fs.writeFileSync(path.resolve(logFolder, `${counter}.extension.log`), extensionMessage || '')
    fs.writeFileSync(path.resolve(logFolder, `${counter}.compiler.log`), compilerMessage || '')
}

type WriteTestOption = {
    fixture: string,
    fileName: string
}

export function writeTestFile(option: WriteTestOption, ...contents: string[]) {
    fs.mkdirSync(path.resolve(option.fixture, path.dirname(option.fileName)), {recursive: true})
    fs.writeFileSync(path.resolve(option.fixture, option.fileName), contents.join('\n'))
}

export async function loadTestFile(fixture: string, files: {src: string, dst: string}[]) {
    for (const file of files) {
        fs.mkdirSync(path.resolve(fixture, path.dirname(file.dst)), {recursive: true})
        fs.copyFileSync(path.resolve(fixture, '../armory', file.src), path.resolve(fixture, file.dst))
    }
    await sleep(250)
}

export async function openActive(extension: Extension, fixture: string, fileName: string, skipSleep: boolean = false) {
    const texFilePath = vscode.Uri.file(path.join(fixture, fileName))
    const doc = await vscode.workspace.openTextDocument(texFilePath)
    await vscode.window.showTextDocument(doc)
    if (!skipSleep) {
        await sleep(250)
    }
    const root = await extension.manager.findRoot()
    return {root, doc}
}

type AssertBuildOption = {
    fixture: string,
    texName: string,
    pdfName: string,
    extension: Extension,
    build?: () => unknown
}

export async function assertBuild(option: AssertBuildOption) {
    await openActive(option.extension, option.fixture, option.texName, true)
    if (option.build) {
        await option.build()
    } else {
        await option.extension.commander.build()
    }

    const files = glob.sync('**/**.pdf', { cwd: option.fixture })
    const pdfPath = path.join(option.fixture, option.pdfName)
    assert.strictEqual(files.map(file => path.resolve(option.fixture, file)).join(','), option.pdfName === '' ? option.pdfName : pdfPath)
}

export async function assertAutoBuild(option: AssertBuildOption, mode?: ('skipFirstBuild' | 'noAutoBuild' | 'onSave')[]) {
    if (!mode?.includes('skipFirstBuild')) {
        await assertBuild(option)
    }
    fs.rmSync(path.resolve(option.fixture, option.pdfName))

    let files = glob.sync('**/**.pdf', { cwd: option.fixture })
    assert.strictEqual(files.map(file => path.resolve(option.fixture, file)).join(','), '')
    await sleep(250)

    const wait = waitBuild(option.extension)
    if (mode?.includes('onSave')) {
        await vscode.commands.executeCommand('workbench.action.files.save')
    } else {
        fs.appendFileSync(path.resolve(option.fixture, option.texName), ' % edit')
    }

    if (mode?.includes('noAutoBuild')) {
        await sleep(3000)
        files = glob.sync('**/**.pdf', { cwd: option.fixture })
        assert.strictEqual(files.map(file => path.resolve(option.fixture, file)).join(','), '')
    } else {
        await wait
        files = glob.sync('**/**.pdf', { cwd: option.fixture })
        assert.strictEqual(files.map(file => path.resolve(option.fixture, file)).join(','), path.resolve(option.fixture, option.pdfName))
    }
}

async function waitEvent(extension: Extension, event: EventName, arg?: any) {
    return new Promise<void>((resolve, _) => {
        const disposable = extension.eventBus.on(event, (eventArg) => {
            if (arg && arg !== eventArg) {
                return
            }
            resolve()
            disposable?.dispose()
        })
    })
}

export async function waitBuild(extension: Extension) {
    return waitEvent(extension, BuildDone)
}

type AssertRootOption = {
    fixture: string,
    openName: string,
    rootName: string,
    extension: Extension
}

export async function assertRoot(option: AssertRootOption) {
    await vscode.commands.executeCommand('latex-workshop.activate')
    const result = await openActive(option.extension, option.fixture, option.openName)
    assert.strictEqual(result.root, path.join(option.fixture, option.rootName))
}

type AssertViewerOption = {
    fixture: string,
    pdfName: string,
    extension: Extension,
    action?: () => unknown
}

export async function assertViewer(option: AssertViewerOption) {
    await sleep(250)
    const wait = waitViewer(option.extension)
    void vscode.commands.executeCommand('latex-workshop.view')
    if (option.action) {
        await option.action()
    }
    await wait
    const status = getViewerStatus(option.extension, path.resolve(option.fixture, option.pdfName))
    assert.strictEqual(status.pdfFileUri, vscode.Uri.file(path.resolve(option.fixture, option.pdfName)).toString(true))
}

async function waitViewer(extension: Extension) {
    return Promise.all([
        waitEvent(extension, ViewerPageLoaded),
        waitViewerChange(extension)
    ])
}

async function waitViewerChange(extension: Extension) {
    return waitEvent(extension, ViewerStatusChanged)
}

function getViewerStatus(extension: Extension, pdfFilePath: string) {
    const status = extension.viewer.getViewerState(vscode.Uri.file(pdfFilePath))[0]
    assert.ok(status)
    return status
}

export async function waitFileParsed(extension: Extension, fileName: string) {
    return waitEvent(extension, FileParsed, fileName)
}

export function getIntellisense(doc: vscode.TextDocument, pos: vscode.Position, extension: Extension, atSuggestion = false) {
    const completer = atSuggestion ? extension.atSuggestionCompleter : extension.completer
    return completer?.provideCompletionItems(
        doc, pos, new vscode.CancellationTokenSource().token, {
            triggerKind: vscode.CompletionTriggerKind.Invoke,
            triggerCharacter: undefined
        }
    )
}
