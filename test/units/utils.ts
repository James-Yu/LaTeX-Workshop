import * as vscode from 'vscode'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import * as nodeAssert from 'assert'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { log } from '../../src/utils/logger'

type ExtendedAssert = typeof nodeAssert & {
    listStrictEqual: <T>(actual: T[] | undefined, expected: T[] | undefined, message?: string | Error) => void,
    pathStrictEqual: (actual: string | undefined, expected: string | undefined, message?: string | Error) => void
}
export const assert: ExtendedAssert = nodeAssert as ExtendedAssert
assert.listStrictEqual = <T>(actual: T[] | undefined, expected: T[] | undefined, message?: string | Error) => {
    if (actual === undefined || expected === undefined) {
        nodeAssert.strictEqual(actual, expected)
    } else {
        nodeAssert.deepStrictEqual(actual.sort(), expected.sort(), message)
    }
}
assert.pathStrictEqual = (actual: string | undefined, expected: string | undefined, message?: string | Error) => {
    actual = path.normalize(actual ?? '.')
    expected = path.normalize(expected ?? '.')
    if (os.platform() === 'win32') {
        actual = actual.replace(/^([a-zA-Z]):/, (_, p1: string) => p1.toLowerCase() + ':')
        expected = expected.replace(/^([a-zA-Z]):/, (_, p1: string) => p1.toLowerCase() + ':')
    }
    nodeAssert.strictEqual(path.relative(actual, expected), '', message)
}

export const get = {
    path: (...paths: string[]) => {
        const result = path.resolve(
            vscode.workspace.workspaceFile?.fsPath ?? vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? '',
            ...paths
        )
        if (os.platform() === 'win32') {
            return result.charAt(0).toLowerCase() + result.slice(1)
        } else {
            return result
        }
    }
}

const changedConfigs: Set<string> = new Set()
export const set = {
    root: (...paths: string[]) => {
        const rootFile = get.path(...paths)
        sinon.stub(lw.root.file, 'path').value(rootFile)
        sinon.stub(lw.root.dir, 'path').value(path.dirname(rootFile))
    },
    config: async (section: string, value: any) => {
        await vscode.workspace.getConfiguration('latex-workshop').update(section, value)
        changedConfigs.add(section)
    }
}

export const reset = {
    root: () => {
        sinon.stub(lw.root.file, 'path').value(undefined)
        sinon.stub(lw.root.dir, 'path').value(undefined)
    },
    cache: () => {
        lw.cache.reset()
    },
    config: async () => {
        for (const section of changedConfigs.values()) {
            await set.config(section, undefined)
        }
        changedConfigs.clear()
    },
    log: () => {
        log.resetCachedLog()
    }
}

export const has = {
    log: (message: string | RegExp): boolean => {
        const logs = log.getCachedLog().CACHED_EXTLOG
        if (typeof message === 'string') {
            return logs.some(logMessage => logMessage.includes(message))
        } else {
            return logs.some(logMessage => message.exec(logMessage))
        }
    }
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export const mock = {
    object: (obj: any, ...ignore: string[]) => {
        const items = Object.getPrototypeOf(obj) === Object.prototype
            ? Object.getOwnPropertyNames(obj)
            : Object.getOwnPropertyNames(Object.getPrototypeOf(obj))
        items.forEach(item => {
            // Don't stub the unit to be tested or the logging/external functions.
            if (ignore.includes(item) || ['log', 'external', 'constant'].includes(item)) {
                return
            }
            if (typeof obj[item] === 'object') {
                mock.object(obj[item])
            } else if (typeof obj[item] === 'function' && obj[item].callCount === undefined) {
                sinon.stub(obj, item)
            }
        })
    },
    textDocument: (filePath: string, content: string, params: { languageId?: string, isDirty?: boolean, isClosed?: boolean, scheme?: string } = {}) => {
        return sinon.stub(vscode.workspace, 'textDocuments').value([ new TextDocument(filePath, content, params) ])
    },
    activeTextEditor: (filePath: string, content: string, params: { languageId?: string, isDirty?: boolean, isClosed?: boolean, scheme?: string } = {}) => {
        return sinon.stub(vscode.window, 'activeTextEditor').value(new TextEditor(filePath, content, params))
    }
}

export const hooks = {
    beforeEach: () => {
        log.resetCachedLog()
    },
    async afterEach(this: Mocha.Context) {
        cacheLog(this)
        reset.cache()
        reset.root()
        await reset.config()
    }
}

function cacheLog(context: Mocha.Context) {
    function sanitize(name: string): string {
        return name.replace(/[^a-z0-9_]/gi, '_').replace(/_{2,}/gi, '_').toLowerCase()
    }
    const name = sanitize(context.currentTest?.title ?? '')

    const cachedLog = log.getCachedLog()
    const folders = []
    let parent = context.currentTest?.parent
    while(parent && parent.title !== '') {
        folders.unshift(sanitize(parent.title.replaceAll(':', '')))
        parent = parent.parent
    }
    const logFolder = path.resolve(__dirname, '../../../test/log', 'unittest', ...folders)
    fs.mkdirSync(logFolder, {recursive: true})
    fs.writeFileSync(path.resolve(logFolder, `${name}.log`), cachedLog.CACHED_EXTLOG.join('\n'))
}

class TextDocument implements vscode.TextDocument {
    content: string
    lines: string[]
    uri: vscode.Uri
    fileName: string
    isUntitled: boolean = false
    languageId: string
    version: number = 0
    isDirty: boolean
    isClosed: boolean
    eol: vscode.EndOfLine = vscode.EndOfLine.LF
    lineCount: number

    constructor(filePath: string, content: string, { languageId = 'latex', isDirty = false, isClosed = false, scheme = 'file' }: { languageId?: string, isDirty?: boolean, isClosed?: boolean, scheme?: string }) {
        this.content = content
        this.lines = content.split('\n')
        this.uri = scheme === 'file' ? vscode.Uri.file(filePath) : vscode.Uri.from({ scheme, path: filePath })
        this.fileName = filePath
        this.languageId = languageId
        this.isDirty = isDirty
        this.isClosed = isClosed
        this.lineCount = this.lines.length
    }
    save(): Thenable<boolean> { throw new Error('Not implemented.') }
    lineAt(_: number | vscode.Position): vscode.TextLine { throw new Error('Not implemented.') }
    offsetAt(_: vscode.Position): number { throw new Error('Not implemented.') }
    positionAt(_: number): vscode.Position { throw new Error('Not implemented.') }
    getText(_?: vscode.Range): string { return this.content }
    getWordRangeAtPosition(_p: vscode.Position, _r?: RegExp): vscode.Range | undefined { throw new Error('Not implemented.') }
    validateRange(_: vscode.Range): vscode.Range { throw new Error('Not implemented.') }
    validatePosition(_: vscode.Position): vscode.Position { throw new Error('Not implemented.') }
}

class TextEditor implements vscode.TextEditor {
    document: TextDocument
    selection: vscode.Selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0))
    selections: vscode.Selection[] = [ this.selection ]
    visibleRanges: vscode.Range[] = [ new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)) ]
    options: vscode.TextEditorOptions = {}
    viewColumn: vscode.ViewColumn | undefined = vscode.ViewColumn.Active

    constructor(filePath: string, content: string, { languageId = 'latex', isDirty = false, isClosed = false, scheme = 'file' }: { languageId?: string, isDirty?: boolean, isClosed?: boolean, scheme?: string }) {
        this.document = new TextDocument(filePath, content, { languageId, isDirty, isClosed, scheme })
    }

    edit(_: (_: vscode.TextEditorEdit) => void): Thenable<boolean> { throw new Error('Not implemented.') }
    insertSnippet(_: vscode.SnippetString): Thenable<boolean> { throw new Error('Not implemented.') }
    setDecorations(_d: vscode.TextEditorDecorationType, _r: vscode.Range[] | vscode.DecorationOptions[]): void { throw new Error('Not implemented.') }
    revealRange(_: vscode.Range): void { throw new Error('Not implemented.') }
    show(): void { throw new Error('Not implemented.') }
    hide(): void { throw new Error('Not implemented.') }
}
