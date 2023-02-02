import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as glob from 'glob'
import * as os from 'os'
import {ok, strictEqual} from 'assert'
import * as lw from '../../src/lw'
import { AutoBuildInitiated, DocumentChanged, EventArgs, ViewerPageLoaded, ViewerStatusChanged } from '../../src/components/eventbus'
import type { EventName } from '../../src/components/eventbus'
import { getCachedLog, getLogger, resetCachedLog } from '../../src/components/logger'

let testCounter = 0
const logger = getLogger('Test')

export function only(suiteName: string, fixtureName: string, testName: string, cb: () => unknown, platforms?: NodeJS.Platform[]) {
    return run(suiteName, fixtureName, testName, cb, platforms, true)
}

export function run(suiteName: string, fixtureName: string, testName: string, cb: () => unknown, platforms?: NodeJS.Platform[], runonly?: boolean) {
    let fixture: string | undefined
    if (vscode.workspace.workspaceFile) {
        fixture = path.dirname(vscode.workspace.workspaceFile.fsPath)
    } else {
        fixture = vscode.workspace.workspaceFolders?.[0].uri.fsPath
    }
    logger.log(`Test fixture path: ${fixture} .`)

    if (fixture === undefined) {
        return
    }
    if (path.basename(fixture) !== fixtureName) {
        return
    }
    if (process.env['LATEXWORKSHOP_SUITE'] && !process.env['LATEXWORKSHOP_SUITE'].split(',').find(suite => suiteName.includes(suite))) {
        return
    }
    if (platforms && !platforms.includes(os.platform())) {
        return
    }

    testCounter++
    const testFunction = (process.env['LATEXWORKSHOP_CLI'] || !runonly) ? test : test.only
    const counterString = testCounter.toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping: false})

    testFunction(`[${counterString}] ${suiteName}: ${testName}`, async () => {
        try {
            resetCachedLog()
            logger.log(`${testName}`)
            await cb()
        } finally {
            log(fixtureName, testName, counterString)
        }
    })
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export async function reset(fixture: string) {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors')
    await Promise.all(lw.cacher.allPromises)
    lw.manager.rootFile = undefined
    lw.manager.localRootFile = undefined
    lw.completer.input.reset()
    lw.duplicateLabels.reset()
    await lw.cacher.reset()
    glob.sync('**/{**.tex,**.pdf,**.bib}', { cwd: fixture }).forEach(file => { try {fs.unlinkSync(path.resolve(fixture, file))} catch {} })
}

function log(fixtureName: string, testName: string, counter: string) {
    logger.log('Recording cached log messages.')
    const cachedLog = getCachedLog()
    const logFolder = path.resolve(__dirname, '../../../test/log')
    fs.mkdirSync(logFolder, {recursive: true})
    fs.writeFileSync(path.resolve(logFolder, `${fixtureName}-${counter}.log`),
        testName +
        '\n\n' + new Array(80).fill('=').join('') + '\n\n' +
        cachedLog.CACHED_EXTLOG.join('\n') +
        '\n\n' + new Array(80).fill('=').join('') + '\n\n' +
        cachedLog.CACHED_COMPILER.join('\n') +
        '\n\n' + new Array(80).fill('=').join('') + '\n\n' +
        vscode.window.activeTextEditor?.document.uri.fsPath + '\n\n' +
        vscode.window.activeTextEditor?.document.getText())
}

export async function wait<T extends keyof EventArgs>(event: T | EventName | ((lines: string[]) => boolean), arg?: EventArgs[T]) {
    if (event instanceof Function) {
        while (true) {
            const lines = vscode.window.activeTextEditor?.document.getText().split('\n')
            if (lines && event(lines)) {
                return lines
            }
            await sleep(100)
        }
    } else {
        return new Promise<EventArgs[T] | undefined>((resolve, _) => {
            const disposable = lw.eventBus.on(event, (eventArg: EventArgs[T] | undefined) => {
                if (arg && (JSON.stringify(arg) !== JSON.stringify(eventArg))) {
                    return
                }
                disposable?.dispose()
                resolve(eventArg)
            })
        })
    }
}

export async function load(fixture: string, files: {src: string, dst: string}[], config: {root?: number, local?: number, open?: number, skipCache?: boolean} = {}) {
    config.root = config.root ?? 0
    config.local = config.root ?? -1
    config.open = config.open ?? -1
    config.skipCache = config.skipCache ?? false
    files.forEach(file => {
        logger.log(`Copy ${path.resolve(fixture, file.dst)} .`)
        fs.mkdirSync(path.resolve(fixture, path.dirname(file.dst)), {recursive: true})
        fs.copyFileSync(path.resolve(fixture, '../armory', file.src), path.resolve(fixture, file.dst))
    })
    if (config.root > -1) {
        logger.log(`Set root to ${path.resolve(fixture, files[config.root].dst)} .`)
        lw.manager.rootFile = path.resolve(fixture, files[config.root].dst)
        lw.manager.rootFileLanguageId = 'latex'
    }
    if (config.local > -1) {
        logger.log(`Set local root to ${path.resolve(fixture, files[config.local].dst)} .`)
        lw.manager.localRootFile = path.resolve(fixture, files[config.local].dst)
    }
    if (!config.skipCache) {
        logger.log('Cache tex and bib.')
        files.filter(file => file.dst.endsWith('.tex')).forEach(file => lw.cacher.add(path.resolve(fixture, file.dst)))
        const texPromise = files.filter(file => file.dst.endsWith('.tex')).map(file => lw.cacher.refreshCache(path.resolve(fixture, file.dst), lw.manager.rootFile))
        const bibPromise = files.filter(file => file.dst.endsWith('.bib')).map(file => lw.completer.citation.parseBibFile(path.resolve(fixture, file.dst)))
        await Promise.all([...texPromise, ...bibPromise])
    }
    if (config.open > -1) {
        logger.log(`Open ${path.resolve(fixture, files[config.open].dst)} .`)
        const doc = await vscode.workspace.openTextDocument(path.resolve(fixture, files[config.open].dst))
        await vscode.window.showTextDocument(doc)
    }
}

export async function find(fixture: string, openFile: string) {
    logger.log(`Open ${openFile} .`)
    const doc = await vscode.workspace.openTextDocument(path.join(fixture, openFile))
    await vscode.window.showTextDocument(doc)
    logger.log('Search for root file.')
    await lw.manager.findRoot()
    return {root: lw.manager.rootFile, local: lw.manager.localRootFile}
}

export async function build(fixture: string, openFile: string, action?: () => Promise<void>) {
    logger.log(`Open ${openFile} .`)
    const doc = await vscode.workspace.openTextDocument(path.join(fixture, openFile))
    await vscode.window.showTextDocument(doc)
    logger.log('Initiate a build.')
    await (action ?? lw.commander.build)()
}

export async function auto(fixture: string, editFile: string, noBuild = false, save = false): Promise<{type: 'onChange' | 'onSave', file: string}> {
    const done = wait(AutoBuildInitiated)
    if (save) {
        logger.log(`Save ${editFile}.`)
        const doc = await vscode.workspace.openTextDocument(path.join(fixture, editFile))
        await vscode.window.showTextDocument(doc)
        await sleep(500) // wait for document refresh to prevent saving to dirty doc
        await vscode.commands.executeCommand('workbench.action.files.save')
    } else {
        logger.log(`Edit ${editFile} .`)
        fs.appendFileSync(path.resolve(fixture, editFile), ' % edit')
    }
    if (noBuild) {
        await sleep(500)
        strictEqual(getCachedLog().CACHED_EXTLOG.filter(line => line.includes('[Builder]')).filter(line => line.includes(editFile)).length, 0)
        return {type: 'onChange', file: ''}
    }
    logger.log('Wait for auto-build.')
    const result = await Promise.any([done, sleep(3000)]) as EventArgs[typeof AutoBuildInitiated]
    ok(result)
    ok(result.type)
    ok(result.file)
    return result
}

export function suggest(row: number, col: number, isAtSuggestion = false, openFile?: string): {items: vscode.CompletionItem[], labels: string[]} {
    ok(lw.manager.rootFile)
    const lines = lw.cacher.get(openFile ?? lw.manager.rootFile)?.content?.split('\n')
    ok(lines)
    logger.log('Get suggestion.')
    const items = (isAtSuggestion ? lw.atSuggestionCompleter : lw.completer).provide({
        uri: vscode.Uri.file(openFile ?? lw.manager.rootFile),
        langId: 'latex',
        line: lines[row],
        position: new vscode.Position(row, col)
    })
    ok(items)
    return {items, labels: items.map(item => item.label.toString())}
}

export async function view(fixture: string, pdfName: string, postAction?: () => unknown) {
    logger.log(`Asserting viewer for ${pdfName} .`)
    await sleep(250)
    const promise = Promise.all([
        wait(ViewerPageLoaded),
        wait(ViewerStatusChanged)
    ])
    void lw.commander.view()
    if (postAction) {
        await postAction()
    }
    await promise
    const pdfFilePath = path.resolve(fixture, pdfName)
    const status = lw.viewer.getViewerState(vscode.Uri.file(pdfFilePath))[0]
    ok(status)
    strictEqual(status.pdfFileUri, vscode.Uri.file(path.resolve(fixture, pdfName)).toString(true))
}

export async function format() {
    const promise = wait(DocumentChanged)
    await vscode.commands.executeCommand('editor.action.formatDocument')
    await promise
    const formatted = vscode.window.activeTextEditor?.document.getText()
    ok(formatted)
    return formatted
}
