import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as glob from 'glob'
import * as os from 'os'
import * as assert from 'assert'
import * as lw from '../../src/lw'
import { BuildDone, FileParsed, FileWatched, RootFileSearched, ViewerPageLoaded, ViewerStatusChanged } from '../../src/components/eventbus'
import type { EventName } from '../../src/components/eventbus'

let testCounter = 0

export function runTestOnly(suiteName: string, fixtureName: string, testName: string, cb: () => unknown, platforms?: NodeJS.Platform[], timeout?: number) {
    return runTest(suiteName, fixtureName, testName, cb, platforms, timeout, true)
}

export function runTest(suiteName: string, fixtureName: string, testName: string, cb: () => unknown, platforms?: NodeJS.Platform[], timeout?: number, only?: boolean) {
    let fixture: string | undefined
    if (vscode.workspace.workspaceFile) {
        fixture = path.dirname(vscode.workspace.workspaceFile.fsPath)
    } else {
        fixture = vscode.workspace.workspaceFolders?.[0].uri.fsPath
    }

    if (fixture === undefined) {
        return
    }
    if (path.basename(fixture) !== fixtureName) {
        return
    }
    if (process.env['LATEXWORKSHOP_SUITE'] && !process.env['LATEXWORKSHOP_SUITE'].split(',').includes(suiteName)) {
        return
    }
    if (platforms && !platforms.includes(os.platform())) {
        return
    }

    testCounter++
    const testFunction = (process.env['LATEXWORKSHOP_CLI'] || !only) ? test : test.only
    const counterString = testCounter.toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping: false})

    testFunction(`[${counterString}] ${suiteName}: ${testName}`, async () => {
        try {
            await cb()
        } catch (error) {
            await log(counterString)
            throw error
        }
    }).timeout(timeout || 15000)
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

export function writeTestFile(fixture: string, fileName: string, ...contents: string[]) {
    fs.mkdirSync(path.resolve(fixture, path.dirname(fileName)), {recursive: true})
    fs.writeFileSync(path.resolve(fixture, fileName), contents.join('\n'))
}

export async function loadTestFile(fixture: string, files: {src: string, dst: string}[]) {
    let unlinked = false
    for (const file of files) {
        if (fs.existsSync(path.resolve(fixture, file.dst))) {
            fs.unlinkSync(path.resolve(fixture, file.dst))
            unlinked = true
        }
    }
    if (unlinked) {
        await sleep(500)
    }
    for (const file of files) {
        fs.mkdirSync(path.resolve(fixture, path.dirname(file.dst)), {recursive: true})
        fs.copyFileSync(path.resolve(fixture, '../armory', file.src), path.resolve(fixture, file.dst))
    }
    await sleep(250)
}

export async function openActive(fixture: string, fileName: string) {
    const texFilePath = vscode.Uri.file(path.join(fixture, fileName))
    let wait = waitEvent(FileParsed, path.resolve(fixture, fileName))
    const doc = await vscode.workspace.openTextDocument(texFilePath)
    await vscode.window.showTextDocument(doc)
    await lw.cacher.refreshContext(path.resolve(fixture, fileName))
    await wait
    wait = waitEvent(RootFileSearched)
    const root = await lw.manager.findRoot()
    await wait
    return {root, doc}
}

export async function assertBuild(fixture: string, texName: string, pdfName: string, build?: () => unknown) {
    await openActive(fixture, texName)
    if (build) {
        await build()
    } else {
        await lw.commander.build()
    }

    const files = glob.sync('**/**.pdf', { cwd: fixture })
    const pdfPath = path.join(fixture, pdfName)
    assert.strictEqual(files.map(file => path.resolve(fixture, file)).join(','), pdfName === '' ? pdfName : pdfPath)
}

export async function assertAutoBuild(fixture: string, texName: string, pdfName: string, mode?: ('skipFirstBuild' | 'noAutoBuild' | 'onSave')[], build?: () => unknown) {
    if (!mode?.includes('skipFirstBuild')) {
        await assertBuild(fixture, texName, pdfName, build)
    }
    fs.rmSync(path.resolve(fixture, pdfName))

    let files = glob.sync('**/**.pdf', { cwd: fixture })
    assert.strictEqual(files.map(file => path.resolve(fixture, file)).join(','), '')
    await sleep(250)

    let wait = waitEvent(FileWatched, path.resolve(fixture, texName))
    if (!mode?.includes('noAutoBuild') && texName.endsWith('.tex') && !lw.cacher.watched(path.resolve(fixture, texName))) {
        await wait
    }

    wait = waitEvent(BuildDone)
    if (mode?.includes('onSave')) {
        await vscode.commands.executeCommand('workbench.action.files.save')
    } else {
        fs.appendFileSync(path.resolve(fixture, texName), ' % edit')
    }

    if (mode?.includes('noAutoBuild')) {
        await sleep(3000)
        files = glob.sync('**/**.pdf', { cwd: fixture })
        assert.strictEqual(files.map(file => path.resolve(fixture, file)).join(','), '')
    } else {
        await wait
        files = glob.sync('**/**.pdf', { cwd: fixture })
        assert.strictEqual(files.map(file => path.resolve(fixture, file)).join(','), path.resolve(fixture, pdfName))
    }
}

export async function waitEvent(event: EventName, arg?: any) {
    return new Promise<void>((resolve, _) => {
        const disposable = lw.eventBus.on(event, (eventArg) => {
            if (arg && arg !== eventArg) {
                return
            }
            resolve()
            disposable?.dispose()
        })
    })
}

export async function assertRoot(fixture: string, openName: string, rootName: string) {
    await vscode.commands.executeCommand('latex-workshop.activate')
    const result = await openActive(fixture, openName)
    assert.strictEqual(result.root, path.join(fixture, rootName))
}

export async function assertViewer(fixture: string, pdfName: string, action?: () => unknown) {
    await sleep(250)
    const wait = Promise.all([
        waitEvent(ViewerPageLoaded),
        waitEvent(ViewerStatusChanged)
    ])
    void vscode.commands.executeCommand('latex-workshop.view')
    if (action) {
        await action()
    }
    await wait
    const pdfFilePath = path.resolve(fixture, pdfName)
    const status = lw.viewer.getViewerState(vscode.Uri.file(pdfFilePath))[0]
    assert.ok(status)
    assert.strictEqual(status.pdfFileUri, vscode.Uri.file(path.resolve(fixture, pdfName)).toString(true))
}

export function getIntellisense(doc: vscode.TextDocument, pos: vscode.Position, atSuggestion = false) {
    const completer = atSuggestion ? lw.atSuggestionCompleter : lw.completer
    return completer?.provideCompletionItems(
        doc, pos, new vscode.CancellationTokenSource().token, {
            triggerKind: vscode.CompletionTriggerKind.Invoke,
            triggerCharacter: undefined
        }
    )
}
