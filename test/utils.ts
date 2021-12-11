import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'
import * as vscode from 'vscode'
import {sleep} from '../src/utils/utils'
import {activate} from '../src/main'

export function getFixtureDir() {
    const fixtureDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath
    if (fixtureDir) {
        return fixtureDir
    } else {
        assert.fail('fixtureDir is undefined.')
    }
}

/**
 * Runs `cb` as a test if the basename of the working directory is euqual to `fixtureName`.
 *
 * @param fixtureName The name of a fixture directory of the current test.
 * @param label Used as the title of test.
 * @param cb Callback executing tests.
 * @param skip `cb` is skipped if `true` returned.
 */
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
    command: () => Thenable<unknown>,
    pick: () => Thenable<undefined>
) {
    let done = false
    setTimeout(async () => {
        while (!done) {
            await pick()
            await sleep(1000)
        }
    }, 3000)
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
            await waitBuildFinish()
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

type PickTruthy<T> = T | false | undefined | null

/**
 * Executes `command` repeatedly until a certain result obtained.
 * Since `command` is executed repeatedly until timeout, it must not have any side effects.
 *
 * @param command Callback to be executed.
 * @param errMessage A string to be displayed as an error message.
 */
export async function waitUntil<T>(
    command: () => PickTruthy<T> | Thenable<PickTruthy<T>>,
    limit = 70
): Promise<T> {
    for (let i = 0; i < limit; i++) {
        const result = await command()
        if (result) {
            return result
        }
        await sleep(300)
    }
    await printLogMessages()
    assert.fail('Timeout Error at waitUntil')
}

export function waitLatexWorkshopActivated() {
    return waitUntil( () => {
        const extension = vscode.extensions.getExtension<ReturnType<typeof activate>>('James-Yu.latex-workshop')
        return Promise.resolve(extension?.isActive && extension)
    })
}

export async function waitBuildFinish() {
    const extension = await waitLatexWorkshopActivated()
    await waitUntil(
        () => Promise.resolve(extension.exports.realExtension?.builder.isBuildFinished?.())
    )
}

export function waitRootFileFound() {
    return waitUntil(
        async () => {
            const extension = await waitLatexWorkshopActivated()
            return extension.exports.manager.rootFile()
        }
    )
}

export async function executeVscodeCommandAfterActivation(command: string) {
    await waitLatexWorkshopActivated()
    return vscode.commands.executeCommand(command)
}

export async function viewPdf() {
    await sleep(1000)
    await executeVscodeCommandAfterActivation('latex-workshop.view')
    await sleep(3000)
}

export async function getViewerStatus(pdfFilePath: string) {
    const extension = await waitLatexWorkshopActivated()
    return waitUntil(() => {
        try {
            const rs = extension.exports.realExtension?.viewer.getViewerState(pdfFilePath)
            const ret = rs && rs.find(st => st)
            if (ret && ret.path !== undefined && ret.scrollTop !== undefined) {
                return [{ path: ret.path, scrollTop: ret.scrollTop }]
            } else {
                return undefined
            }
        } catch (e) {
            return
        }
    }, process.platform === 'win32' ? 600 : undefined)
}
