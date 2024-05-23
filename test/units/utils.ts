import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import * as assert from 'assert'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'

export function stubObject(obj: any, ignore?: string) {
    Object.getOwnPropertyNames(obj).forEach(item => {
        // Don't stub the unit to be tested or the logging/external functions.
        if (item === ignore ||
            (ignore !== undefined && ['log', 'external'].includes(item))) {
            return
        }
        if (typeof obj[item] === 'object') {
            stubObject(obj[item])
        } else if (typeof obj[item] === 'function') {
            sinon.stub(obj, item)
        }
    })
}

export function getPath(...paths: string[ ]) {
    return path.resolve(
        vscode.workspace.workspaceFile?.fsPath ?? vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? '',
        ...paths
    )
}

export function setRoot(testLabel: string, fixture: string, root: string) {
    let rootDir = getPath(testLabel, fixture)
    if (os.platform() === 'win32') {
        rootDir = rootDir.charAt(0).toUpperCase() + rootDir.slice(1)
    }
    sinon.stub(lw.root.file, 'path').value(path.resolve(rootDir, root))
    sinon.stub(lw.root.dir, 'path').value(rootDir)
}

export function resetRoot() {
    sinon.stub(lw.root.file, 'path').value(undefined)
    sinon.stub(lw.root.dir, 'path').value(undefined)
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
    if (path1 === undefined || path2 === undefined) {
        assert.strictEqual(path1, path2)
    } else {
        assert.strictEqual(path1.replaceAll(path.sep, '/'), path2.replaceAll(path.sep, '/'))
    }
}
