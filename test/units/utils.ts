import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import * as nodeAssert from 'assert'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { log } from '../../src/utils/logger'

type ExtendedAssert = typeof nodeAssert & {
    listStrictEqual: (actual: unknown[], expected: unknown[], message?: string | Error) => void,
    pathStrictEqual: (actual: string | undefined, expected: string | undefined, message?: string | Error) => void
}
export const assert: ExtendedAssert = nodeAssert as ExtendedAssert
assert.listStrictEqual = (actual: unknown[], expected: unknown[], message?: string | Error) => {
    nodeAssert.deepStrictEqual(actual.sort(), expected.sort(), message)
}
assert.pathStrictEqual = (actual: string | undefined, expected: string | undefined, message?: string | Error) => {
    actual = path.normalize(actual ?? '.')
    expected = path.normalize(expected ?? '.')
    if (os.platform() === 'win32') {
        actual = actual.toLowerCase()
        expected = expected.toLowerCase()
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

    constructor(filePath: string, content: string, { languageId = 'latex', isDirty = false, isClosed = false }: { languageId?: string, isDirty?: boolean, isClosed?: boolean }) {
        this.content = content
        this.lines = content.split('\n')
        this.uri = vscode.Uri.file(filePath)
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

export const mock = {
    object: (obj: any, ...ignore: string[]) => {
        Object.getOwnPropertyNames(obj).forEach(item => {
            // Don't stub the unit to be tested or the logging/external functions.
            if (ignore.includes(item) || ['log', 'external'].includes(item)) {
                return
            }
            if (typeof obj[item] === 'object') {
                mock.object(obj[item])
            } else if (typeof obj[item] === 'function') {
                sinon.stub(obj, item)
            }
        })
    },
    textDocument: (filePath: string, content: string, params: { languageId?: string, isDirty?: boolean, isClosed?: boolean } = {}) => {
        return sinon.stub(vscode.workspace, 'textDocuments').value([new TextDocument(filePath, content, params)])
    }
}

export const hooks = {
    beforeEach: () => {
        log.resetCachedLog()
    },
    afterEach: async () => {
        reset.cache()
        reset.root()
        await reset.config()
    }
}
