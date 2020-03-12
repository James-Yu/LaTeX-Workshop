import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'
import * as vscode from 'vscode'
import {sleep} from '../src/utils/utils'

export function getFixtureDir() {
    const fixtureDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath
    if (fixtureDir) {
        return fixtureDir
    } else {
        assert.fail('fixtureDir is undefined.')
    }
}

export function runTestWithFixture(
    fixtureName: string,
    label: string,
    cb: () => Promise<void>,
    skip?: () => boolean
) {
    const rootPath = vscode.workspace.workspaceFolders?.[0]
    const shouldSkip = skip && skip()
    if (rootPath && path.basename(rootPath.uri.fsPath) === fixtureName && !shouldSkip) {
        test( fixtureName + ': ' + label, cb )
    }
}

export async function waitReleaseOf(filePath: string) {
    for (let i = 0; i < 300; i++) {
        await sleep(100)
        try {
            if (!fs.existsSync(filePath)) {
                return
            }
            const fd = fs.openSync(filePath, 'r+')
            fs.closeSync(fd)
            return
        } catch (e) {

        }
    }
}

export async function printLogMessages() {
    await vscode.commands.executeCommand('latex-workshop.log')
    await sleep(1000)
    await vscode.commands.executeCommand('workbench.action.output.toggleOutput')
    await sleep(1000)
    const logMessage = vscode.window.activeTextEditor?.document.getText()
    console.log(logMessage)
    await vscode.commands.executeCommand('latex-workshop.log', true)
    await sleep(1000)
    const compilerLogMessage = vscode.window.activeTextEditor?.document.getText()
    console.log(compilerLogMessage)
}

export async function execCommandThenPick(
    command: () => Thenable<void | undefined>,
    pick: () => Thenable<void | undefined>
) {
    let done = false
    setTimeout(async () => {
        while (!done) {
            await pick()
            await sleep(300)
        }
    }, 1000)
    await command()
    done = true
}

export async function busyWait<T>(
    command: () => Thenable<T | false | undefined | null>,
    errMessage?: string
): Promise<T> {
    for (let i = 0; i < 30; i++) {
        const result = await command()
        if (result) {
            return result
        }
        await sleep(300)
    }
    assert.fail(errMessage || 'Timeout Error at busyWait')
}

export async function assertPdfIsGenerated(pdfFilePath: string, cb: () => Promise<void>) {
    if (fs.existsSync(pdfFilePath)) {
        fs.unlinkSync(pdfFilePath)
    }
    await cb()
    for (let i = 0; i < 150; i++) {
        if (fs.existsSync(pdfFilePath)) {
            assert.ok(true, 'PDF file generated.')
            return
        }
        await sleep(100)
    }
    await printLogMessages()
    assert.fail('Timeout Error: PDF file not generated.')
}

export function isDockerEnabled() {
    return process.env['LATEXWORKSHOP_CI_ENABLE_DOCKER'] ? true : false
}

export async function waitlLatexWorkshopActivated() {
    await busyWait( () => {
        return Promise.resolve(vscode.extensions.getExtension('James-Yu.latex-workshop'))
    })
}
