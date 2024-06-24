import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { glob } from 'glob'
import * as os from 'os'
import { ok, strictEqual } from 'assert'
import { lw } from '../../src/lw'
import { log as logModule } from '../../src/utils/logger'
import type { EventArgs, Events } from '../../src/core/event'

let testIndex = 0
const logger = logModule.getLogger('Test')

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

export function skip(_testName: string, _cb: (fixturePath: string) => unknown, _platforms?: NodeJS.Platform[]) {
    return
}

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
    const testFunction = (process.env['LATEXWORKSHOP_CITEST'] || !runonly) ? test : test.only

    const label = testLabel()
    testFunction(`[${label}] ${suite.name}: ${testName}`, async () => {
        try {
            logModule.resetCachedLog()
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
    await Promise.all(Object.values(lw.cache.promises))
    lw.compile.lastSteps = []
    lw.compile.lastAutoBuildTime = 0
    lw.compile.compiledPDFPath = ''
    lw.compile.compiledPDFWriting = 0
    lw.root.file.path = undefined
    lw.root.subfiles.path = undefined
    lw.completion.input.reset()
    lw.lint.label.reset()
    lw.cache.reset()
    glob.sync('**/{**.tex,**.pdf,**.bib}', { cwd: getFixture() }).forEach(file => { try {fs.unlinkSync(path.resolve(getFixture(), file))} catch {} })
}

function log(fixtureName: string, testName: string, counter: string) {
    logger.log('Recording cached log messages.')
    const cachedLog = logModule.getCachedLog()
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

export async function wait<T extends keyof EventArgs>(event: T | Events, arg?: EventArgs[T]) {
    return new Promise<EventArgs[T] | undefined>((resolve, _) => {
        const disposable = lw.event.on(event, (eventArg: EventArgs[T] | undefined) => {
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
        lw.root.file.path = path.resolve(wsFixture, files[config.root].dst)
        lw.root.file.langId = 'latex'
        lw.root.dir.path = path.dirname(lw.root.file.path)
    }
    if (config.local > -1) {
        wsFixture = getWsFixture(fixture, files[config.local].ws)
        logger.log(`Set local root to ${path.resolve(wsFixture, files[config.local].dst)} .`)
        lw.root.subfiles.path = path.resolve(wsFixture, files[config.local].dst)
        lw.root.subfiles.langId = 'latex'
    }
    if (!config.skipCache) {
        logger.log('Cache tex and bib.')
        files.filter(file => file.dst.endsWith('.tex')).forEach(file => lw.cache.add(path.resolve(getWsFixture(fixture, file.ws), file.dst)))
        const texPromise = files.filter(file => file.dst.endsWith('.tex')).map(file => lw.cache.refreshCache(path.resolve(getWsFixture(fixture, file.ws), file.dst), lw.root.file.path))
        const bibPromise = files.filter(file => file.dst.endsWith('.bib')).map(file => lw.completion.citation.parseBibFile(path.resolve(getWsFixture(fixture, file.ws), file.dst)))
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
    await lw.root.find()
    return {root: lw.root.file.path, local: lw.root.subfiles.path}
}

export async function build(fixture: string, openFile: string, ws?: string, action?: () => Promise<void>) {
    logger.log(`Open ${openFile} .`)
    await open(path.resolve(getWsFixture(fixture, ws), openFile))
    logger.log('Initiate a build.')
    await (action ?? lw.commands.build)()
}

export async function auto(fixture: string, editFile: string, noBuild = false, save = false, ws?: string): Promise<{type: 'onFileChange' | 'onSave', file: string}> {
    const done = wait(lw.event.AutoBuildInitiated)
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
        strictEqual(logModule.getCachedLog().CACHED_EXTLOG.filter(line => line.includes('[Builder]')).filter(line => line.includes(editFile)).length, 0)
        return {type: 'onFileChange', file: ''}
    }
    logger.log('Wait for auto-build.')
    const result = await Promise.any([done, sleep(3000)]) as EventArgs[Events.AutoBuildInitiated]
    ok(result)
    ok(result.type)
    ok(result.file)
    return result
}

export function suggest(row: number, col: number, isAtSuggestion = false, openFile?: string): {items: vscode.CompletionItem[], labels: string[]} {
    ok(lw.root.file.path)
    const lines = lw.cache.get(openFile ?? lw.root.file.path)?.content?.split('\n')
    ok(lines)
    logger.log('Get suggestion.')
    const items = (isAtSuggestion ? lw.completion.atProvider : lw.completion.provider).provide({
        uri: vscode.Uri.file(openFile ?? lw.root.file.path),
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
        wait(lw.event.ViewerPageLoaded),
        wait(lw.event.ViewerStatusChanged)
    ])
    void lw.commands.view()
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
    const promise = wait(lw.event.DocumentChanged)
    await vscode.commands.executeCommand('editor.action.formatDocument')
    await promise
    const formatted = vscode.window.activeTextEditor?.document.getText()
    ok(formatted)
    return formatted
}
