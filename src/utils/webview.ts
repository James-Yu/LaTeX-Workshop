import * as vscode from 'vscode'
import { lw } from '../lw'

export function replaceWebviewPlaceholders(content: string, webview: vscode.Webview): string {
    const extensionRootUri = vscode.Uri.file(lw.extensionRoot)
    const resourcesFolderUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionRootUri, 'resources'))
    const resourcesFolderLink = resourcesFolderUri.toString()
    const pdfjsDistUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionRootUri, 'node_modules', 'pdfjs-dist'))
    const pdfjsDistLink = pdfjsDistUri.toString()
    return content.replace(/%VSCODE_RES%/g, resourcesFolderLink)
                  .replace(/%VSCODE_PDFJS_DIST%/g, pdfjsDistLink)
                  .replace(/%VSCODE_CSP%/g, webview.cspSource)
}

function getMoveCommands(tabEditorGroup: string) {
    if (tabEditorGroup === 'left') {
        return {
            moveAction: 'workbench.action.moveEditorToLeftGroup',
            focusAction: 'workbench.action.focusRightGroup'
        }
    }
    if (tabEditorGroup === 'right') {
        return {
            moveAction: 'workbench.action.moveEditorToRightGroup',
            focusAction: 'workbench.action.focusLeftGroup'
        }
    }
    if (tabEditorGroup === 'above') {
        return {
            moveAction: 'workbench.action.moveEditorToAboveGroup',
            focusAction: 'workbench.action.focusBelowGroup'
        }
    }
    if (tabEditorGroup === 'below') {
        return {
            moveAction: 'workbench.action.moveEditorToBelowGroup',
            focusAction: 'workbench.action.focusAboveGroup'
        }
    }
    return
}

export async function moveWebviewPanel(panel: vscode.WebviewPanel, tabEditorGroup: string) {
    panel.reveal(undefined, false)
    await moveActiveEditor(tabEditorGroup, true)
}

export async function moveActiveEditor(tabEditorGroup: string, preserveFocus: boolean) {
    const actions = getMoveCommands(tabEditorGroup)
    if (!actions) {
        return
    }
    await vscode.commands.executeCommand(actions.moveAction)
    if (preserveFocus){
        await vscode.commands.executeCommand(actions.focusAction)
    }
}
