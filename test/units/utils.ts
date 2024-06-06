import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import * as assert from 'assert'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'

export function stubObject(obj: any, ...ignore: string[]) {
    Object.getOwnPropertyNames(obj).forEach(item => {
        // Don't stub the unit to be tested or the logging/external functions.
        if (ignore.includes(item) || ['log', 'external'].includes(item)) {
            return
        }
        if (typeof obj[item] === 'object') {
            stubObject(obj[item])
        } else if (typeof obj[item] === 'function') {
            sinon.stub(obj, item)
        }
    })
}

export function getPath(...paths: string[]) {
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

export function setRoot(...paths: string[]) {
    const rootFile = getPath(...paths)
    sinon.stub(lw.root.file, 'path').value(rootFile)
    sinon.stub(lw.root.dir, 'path').value(path.dirname(rootFile))
}

export function resetRoot() {
    sinon.stub(lw.root.file, 'path').value(undefined)
    sinon.stub(lw.root.dir, 'path').value(undefined)
}

export function resetCache() {
    lw.cache.reset()
}

const changedConfigs: Set<string> = new Set()
export async function setConfig(section: string, value: any) {
    await vscode.workspace.getConfiguration('latex-workshop').update(section, value)
    changedConfigs.add(section)
}

export async function resetConfig() {
    for (const section of changedConfigs.values()) {
        await setConfig(section, undefined)
    }
    changedConfigs.clear()
}

export function pathEqual(path1?: string, path2?: string) {
    path1 = path.normalize(path1 ?? '.')
    path2 = path.normalize(path2 ?? '.')
    if (os.platform() === 'win32') {
        path1 = path1.toLowerCase()
        path2 = path2.toLowerCase()
    }
    assert.strictEqual(path.relative(path1, path2), '')
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

export function stubTextDocument(filePath: string, content: string, params: { languageId?: string, isDirty?: boolean, isClosed?: boolean } = {}) {
    return sinon.stub(vscode.workspace, 'textDocuments').value([new TextDocument(filePath, content, params)])
}
