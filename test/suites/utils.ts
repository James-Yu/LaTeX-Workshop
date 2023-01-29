import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as glob from 'glob'
import * as os from 'os'
import {ok, strictEqual} from 'assert'
import * as lw from '../../src/lw'
import { BuildDone, FileParsed, FileWatched, ViewerPageLoaded, ViewerStatusChanged } from '../../src/components/eventbus'
import type { EventName } from '../../src/components/eventbus'
import { getCachedLog, getLogger, resetCachedLog } from '../../src/components/logger'

let testCounter = 0
const logger = getLogger('Test')

export function only(suiteName: string, fixtureName: string, testName: string, cb: () => unknown, platforms?: NodeJS.Platform[], timeout?: number) {
    return run(suiteName, fixtureName, testName, cb, platforms, timeout, true)
}

export function run(suiteName: string, fixtureName: string, testName: string, cb: () => unknown, platforms?: NodeJS.Platform[], timeout?: number, runonly?: boolean) {
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
    }).timeout(timeout || 15000)
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
    lw.cacher.allPaths.forEach(filePath => lw.cacher.remove(filePath))
    await lw.cacher.resetWatcher()
    glob.sync('**/{**.tex,**.pdf}', { cwd: fixture }).forEach(file => fs.unlinkSync(path.resolve(fixture, file)))
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

export function write(fixture: string, fileName: string, ...contents: string[]) {
    logger.log(`Writing fixture file: ${fileName} .`)
    fs.mkdirSync(path.resolve(fixture, path.dirname(fileName)), {recursive: true})
    fs.writeFileSync(path.resolve(fixture, fileName), contents.join('\n'))
}

export async function load(fixture: string, files: {src: string, dst: string}[]) {
    let unlinked = false
    for (const file of files) {
        if (fs.existsSync(path.resolve(fixture, file.dst))) {
            logger.log(`Unlinking previous fixture file ${file.dst} .`)
            fs.unlinkSync(path.resolve(fixture, file.dst))
            unlinked = true
        }
    }
    if (unlinked) {
        await sleep(500)
    }
    for (const file of files) {
        logger.log(`Loading fixture file ${file.src} to ${file.dst} .`)
        fs.mkdirSync(path.resolve(fixture, path.dirname(file.dst)), {recursive: true})
        fs.copyFileSync(path.resolve(fixture, '../armory', file.src), path.resolve(fixture, file.dst))
    }
    await sleep(250)
    return {cached: Promise.all(files.map(file => wait(FileParsed, path.resolve(fixture, file.dst))))}
}

export async function open(fixture: string, fileName: string, doCache = true) {
    logger.log(`Opening fixture file ${fileName} .`)
    const texFilePath = vscode.Uri.file(path.join(fixture, fileName))
    logger.log('Try to open a text document.')
    const doc = await vscode.workspace.openTextDocument(texFilePath)
    await vscode.window.showTextDocument(doc)
    logger.log('Searching for root file.')
    const root = await lw.manager.findRoot()
    if (doCache) {
        logger.log(`Caching ${fileName} .`)
        await lw.cacher.refreshCache(path.resolve(fixture, fileName))
    }
    return {root, doc}
}

export async function wait(event: EventName, arg?: any) {
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

export async function loadAndCache(fixture: string, files: {src: string, dst: string}[], config: {root?: number, local?: number, skipCache?: boolean} = {}) {
    config.root = config.root ?? 0
    config.local = config.root ?? -1
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
    if (config.skipCache) {
        return
    }
    logger.log('Cache tex and bib.')
    const texPromise = files.filter(file => file.dst.endsWith('.tex')).map(file => lw.cacher.refreshCache(path.resolve(fixture, file.dst), lw.manager.rootFile))
    const bibPromise = files.filter(file => file.dst.endsWith('.bib')).map(file => lw.completer.citation.parseBibFile(path.resolve(fixture, file.dst)))
    await Promise.all([...texPromise, ...bibPromise])
}

export async function openAndRoot(fixture: string, openFile: string) {
    logger.log(`Open ${openFile} .`)
    const doc = await vscode.workspace.openTextDocument(path.join(fixture, openFile))
    await vscode.window.showTextDocument(doc)
    logger.log('Search for root file.')
    await lw.manager.findRoot()
    return {root: lw.manager.rootFile, local: lw.manager.localRootFile}
}

export async function openAndBuild(fixture: string, openFile: string, action?: () => Promise<void>) {
    logger.log(`Open ${openFile} .`)
    const doc = await vscode.workspace.openTextDocument(path.join(fixture, openFile))
    await vscode.window.showTextDocument(doc)
    logger.log('Initiate a build.')
    await (action ?? lw.commander.build)()
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

export const assert = {
    build: assertBuild,
    auto: assertAutoBuild,
    viewer: assertViewer
}

async function assertBuild(fixture: string, texName: string, pdfName: string, build?: () => unknown) {
    await open(fixture, texName, false)
    logger.log(`Building fixture file ${texName} .`)
    if (build) {
        await build()
    } else {
        await lw.commander.build()
    }

    const files = glob.sync('**/**.pdf', { cwd: fixture })
    const pdfPath = path.join(fixture, pdfName)
    logger.log(`PDF produced: ${files.join(' , ') || 'nothing'} .`)
    strictEqual(files.map(file => path.resolve(fixture, file)).join(','), pdfName === '' ? pdfName : pdfPath)
}

async function assertAutoBuild(fixture: string, texName: string, pdfName: string, mode?: ('skipFirstBuild' | 'noAutoBuild' | 'onSave')[], build?: () => unknown) {
    logger.log(`Auto-building fixture file ${texName} .`)
    if (!mode?.includes('skipFirstBuild')) {
        await assertBuild(fixture, texName, pdfName, build)
    }
    fs.rmSync(path.resolve(fixture, pdfName))

    let files = glob.sync('**/**.pdf', { cwd: fixture })
    strictEqual(files.map(file => path.resolve(fixture, file)).join(','), '')
    logger.log('First manual build PDF has been unlinked.')
    await sleep(250)

    let event = wait(FileWatched, path.resolve(fixture, texName))
    if (!mode?.includes('noAutoBuild') && texName.endsWith('.tex') && !lw.cacher.watched(path.resolve(fixture, texName))) {
        logger.log(`Waiting for watching ${texName} .`)
        await event
    }

    event = wait(BuildDone)
    if (mode?.includes('onSave')) {
        logger.log('Saving.')
        await vscode.commands.executeCommand('workbench.action.files.save')
    } else {
        logger.log('Editing.')
        fs.appendFileSync(path.resolve(fixture, texName), ' % edit')
    }

    logger.log('Waiting.')
    if (mode?.includes('noAutoBuild')) {
        await sleep(3000)
        files = glob.sync('**/**.pdf', { cwd: fixture })
        logger.log(`PDF produced: ${files.join(' , ') || 'nothing'} .`)
        strictEqual(files.map(file => path.resolve(fixture, file)).join(','), '')
    } else {
        await event
        files = glob.sync('**/**.pdf', { cwd: fixture })
        logger.log(`PDF produced: ${files.join(' , ') || 'nothing'} .`)
        strictEqual(files.map(file => path.resolve(fixture, file)).join(','), path.resolve(fixture, pdfName))
    }
}

async function assertViewer(fixture: string, pdfName: string, action?: () => unknown) {
    logger.log(`Asserting viewer for ${pdfName} .`)
    await sleep(250)
    const promise = Promise.all([
        wait(ViewerPageLoaded),
        wait(ViewerStatusChanged)
    ])
    void vscode.commands.executeCommand('latex-workshop.view')
    if (action) {
        await action()
    }
    await promise
    const pdfFilePath = path.resolve(fixture, pdfName)
    const status = lw.viewer.getViewerState(vscode.Uri.file(pdfFilePath))[0]
    ok(status)
    strictEqual(status.pdfFileUri, vscode.Uri.file(path.resolve(fixture, pdfName)).toString(true))
}
