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

let testIndex = 0
const logger = getLogger('Test')

function getFixture() {
    if (vscode.workspace.workspaceFile) {
        return path.dirname(vscode.workspace.workspaceFile.fsPath)
    } else {
        return vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? ''
    }
}

function getWsFixture(fixture: string, ws?: string) {
    return path.resolve(path.dirname(fixture), ws ?? '', path.basename(fixture))
}

function testLabel() {
    return testIndex.toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping: false})
}

const suite = {
    name: '',
    fixture: ''
}
export { suite }

export function only(testName: string, cb: (fixturePath: string) => unknown, platforms?: NodeJS.Platform[]) {
    return run(testName, cb, platforms, true)
}

export function run(testName: string, cb: (fixturePath: string) => unknown, platforms?: NodeJS.Platform[], runonly?: boolean) {
    const fixture = getFixture()

    if (fixture === undefined) {
        return
    }
    if (path.basename(fixture) !== suite.fixture) {
        return
    }
    if (process.env['LATEXWORKSHOP_SUITE'] && !process.env['LATEXWORKSHOP_SUITE'].split(',').find(candidate => suite.name.includes(candidate))) {
        return
    }
    if (platforms && !platforms.includes(os.platform())) {
        return
    }

    testIndex++
    const testFunction = (process.env['LATEXWORKSHOP_CLI'] || !runonly) ? test : test.only

    const label = testLabel()
    testFunction(`[${label}] ${suite.name}: ${testName}`, async () => {
        try {
            resetCachedLog()
            logger.log(`${testName}`)
            await cb(path.resolve(fixture ?? '', label))
        } finally {
            log(path.basename(fixture), testName, label)
        }
    })
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export async function reset() {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors')
    lw.manager.rootFile = undefined
    lw.manager.localRootFile = undefined
    lw.completer.input.reset()
    lw.duplicateLabels.reset()
    lw.cacher.reset()
    glob.sync('**/{**.tex,**.pdf,**.bib}', { cwd: getFixture() }).forEach(file => { try {fs.unlinkSync(path.resolve(getFixture(), file))} catch {} })
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

export async function wait<T extends keyof EventArgs>(event: T | EventName, arg?: EventArgs[T]) {
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

export async function load(fixture: string, files: {src: string, dst: string, ws?: string}[], config: {root?: number, local?: number, open?: number, skipCache?: boolean} = {}) {
    config.root = config.root ?? 0
    config.local = config.root ?? -1
    config.open = config.open ?? -1
    config.skipCache = config.skipCache ?? false
    let wsFixture = ''
    files.forEach(file => {
        wsFixture = getWsFixture(fixture, file.ws)
        logger.log(`Copy ${path.resolve(wsFixture, file.dst)} .`)
        fs.mkdirSync(path.resolve(wsFixture, path.dirname(file.dst)), {recursive: true})
        fs.copyFileSync(path.resolve(fixture, '../../armory', file.src), path.resolve(wsFixture, file.dst))
    })
    if (config.root > -1) {
        wsFixture = getWsFixture(fixture, files[config.root].ws)
        logger.log(`Set root to ${path.resolve(wsFixture, files[config.root].dst)} .`)
        lw.manager.rootFile = path.resolve(wsFixture, files[config.root].dst)
        lw.manager.rootFileLanguageId = 'latex'
    }
    if (config.local > -1) {
        wsFixture = getWsFixture(fixture, files[config.local].ws)
        logger.log(`Set local root to ${path.resolve(wsFixture, files[config.local].dst)} .`)
        lw.manager.localRootFile = path.resolve(wsFixture, files[config.local].dst)
    }
    if (!config.skipCache) {
        logger.log('Cache tex and bib.')
        files.filter(file => file.dst.endsWith('.tex')).forEach(file => lw.cacher.add(path.resolve(getWsFixture(fixture, file.ws), file.dst)))
        const texPromise = files.filter(file => file.dst.endsWith('.tex')).map(file => lw.cacher.refreshCache(path.resolve(getWsFixture(fixture, file.ws), file.dst), lw.manager.rootFile))
        const bibPromise = files.filter(file => file.dst.endsWith('.bib')).map(file => lw.completer.citation.parseBibFile(path.resolve(getWsFixture(fixture, file.ws), file.dst)))
        await Promise.all([...texPromise, ...bibPromise])
    }
    if (config.open > -1) {
        wsFixture = getWsFixture(fixture, files[config.open].ws)
        logger.log(`Open ${path.resolve(wsFixture, files[config.open].dst)} .`)
        await open(path.resolve(wsFixture, files[config.open].dst))
    }
}

export async function open(filePath: string) {
    const doc = await vscode.workspace.openTextDocument(filePath)
    await vscode.window.showTextDocument(doc)
}

export async function find(fixture: string, openFile: string, ws?: string) {
    logger.log(`Open ${openFile} .`)
    await open(path.resolve(getWsFixture(fixture, ws), openFile))
    logger.log('Search for root file.')
    await lw.manager.findRoot()
    return {root: lw.manager.rootFile, local: lw.manager.localRootFile}
}

export async function build(fixture: string, openFile: string, ws?: string, action?: () => Promise<void>) {
    logger.log(`Open ${openFile} .`)
    await open(path.resolve(getWsFixture(fixture, ws), openFile))
    logger.log('Initiate a build.')
    await (action ?? lw.commander.build)()
}

export async function auto(fixture: string, editFile: string, noBuild = false, save = false, ws?: string): Promise<{type: 'onChange' | 'onSave', file: string}> {
    const done = wait(AutoBuildInitiated)
    if (save) {
        logger.log(`Save ${editFile}.`)
        await open(path.resolve(getWsFixture(fixture, ws), editFile))
        await sleep(250) // wait for document refresh to prevent saving to dirty doc
        await vscode.commands.executeCommand('workbench.action.files.save')
    } else {
        logger.log(`Edit ${editFile} .`)
        fs.appendFileSync(path.resolve(getWsFixture(fixture, ws), editFile), ' % edit')
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
