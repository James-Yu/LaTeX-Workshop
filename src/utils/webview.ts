import * as vscode from 'vscode'
import * as path from 'path'
import {Extension} from '../main'


export function replaceWebviewPlaceholders(content: string, extension: Extension, webview: vscode.Webview): string {
    const resourcesFolder = path.join(extension.extensionRoot, 'resources')
    const filePath = vscode.Uri.file(resourcesFolder)
    const link = webview.asWebviewUri(filePath).toString()
    return content.replace(/%VSCODE_RES%/g, link)
                  .replace(/%VSCODE_CSP%/g, webview.cspSource)
}

export async function openWebviewPanel(panel: vscode.WebviewPanel, tabEditorGroup: string) {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
        return
    }
    // We need to turn the viewer into the active editor to move it to an other editor group
    panel.reveal(undefined, false)
    let focusAction: string | undefined
    switch (tabEditorGroup) {
        case 'left': {
            await vscode.commands.executeCommand('workbench.action.moveEditorToLeftGroup')
            focusAction = 'workbench.action.focusRightGroup'
            break
        }
        case 'right': {
            await vscode.commands.executeCommand('workbench.action.moveEditorToRightGroup')
            focusAction = 'workbench.action.focusLeftGroup'
            break
        }
        case 'above': {
            await vscode.commands.executeCommand('workbench.action.moveEditorToAboveGroup')
            focusAction = 'workbench.action.focusBelowGroup'
            break
        }
        case 'below': {
            await vscode.commands.executeCommand('workbench.action.moveEditorToBelowGroup')
            focusAction = 'workbench.action.focusAboveGroup'
            break
        }
        default: {
            break
        }
    }
    // Then, we set the focus back to the .tex file
    setTimeout(async () => {
        if (focusAction ) {
            await vscode.commands.executeCommand(focusAction)
        }
        await vscode.window.showTextDocument(editor.document, vscode.ViewColumn.Active)
    }, 500)
}
