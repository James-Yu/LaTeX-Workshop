import * as vscode from 'vscode'
import * as path from 'path'

type RunTestOption = {
    suiteName: string,
    fixtureName: string,
    testName: string,
    timeout?: number,
    only?: boolean
}

export function runTest(option: RunTestOption, cb: (fixture: string) => unknown) {
    let fixture: string | undefined
    if (vscode.workspace.workspaceFile) {
        fixture = path.dirname(vscode.workspace.workspaceFile.fsPath)
    } else {
        fixture = vscode.workspace.workspaceFolders?.[0].uri.fsPath
    }

    if (fixture === undefined) {
        return
    }
    if (path.basename(fixture) !== option.fixtureName) {
        return
    }
    if (process.env['LATEXWORKSHOP_CISUITE'] && !process.env['LATEXWORKSHOP_CISUITE'].split(',').includes(option.suiteName)) {
        return
    }

    const testFunction = option.only ? test.only : test

    testFunction(`${option.suiteName}: ${option.testName}`, async () => {
        try {
            await cb(fixture || '.')
        } catch (error) {
            await log()
            throw error
        }
    }).timeout(option.timeout || 30000)
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function log() {
    await vscode.commands.executeCommand('workbench.action.output.toggleOutput')
    await sleep(500)
    await vscode.commands.executeCommand('latex-workshop.log')
    await sleep(500)
    const logMessage = vscode.window.activeTextEditor?.document.getText()
    console.log(logMessage)
    await vscode.commands.executeCommand('latex-workshop.compilerlog')
    await sleep(500)
    const compilerLogMessage = vscode.window.activeTextEditor?.document.getText()
    console.log(compilerLogMessage)
}
