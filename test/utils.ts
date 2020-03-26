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
    command: () => Thenable<any>,
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

export async function waitUntil<T>(
    command: () => Thenable<T | false | undefined | null>,
    errMessage?: string
): Promise<T> {
    for (let i = 0; i < 70; i++) {
        const result = await command()
        if (result) {
            return result
        }
        await sleep(300)
    }
    await printLogMessages()
    assert.fail(errMessage || 'Timeout Error at waitUntil')
}

export async function waitLatexWorkshopActivated() {
    await waitUntil( () => {
        return Promise.resolve(vscode.extensions.getExtension('James-Yu.latex-workshop'))
    })
}

export async function waitBuildFinish() {
    await waitUntil(
        () => vscode.commands.executeCommand('latex-workshop-dev.isBuildFinished') as Thenable<boolean>
    )
}

export async function waitRootFileFound() {
    return await waitUntil(
        () => executeVscodeCommandAfterActivation('latex-workshop-dev.currentRootFile') as Thenable<string | undefined>
    )
}

export async function executeVscodeCommandAfterActivation(command: string) {
    await waitLatexWorkshopActivated()
    return await vscode.commands.executeCommand(command)
}
