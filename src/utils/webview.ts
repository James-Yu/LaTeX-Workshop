import * as vscode from 'vscode'
import type {Extension} from '../main'


export function replaceWebviewPlaceholders(content: string, extension: Extension, webview: vscode.Webview): string {
    const extensionRootUri = vscode.Uri.file(extension.extensionRoot)
    const resourcesFolderUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionRootUri, 'resources'))
    const resourcesFolderLink = resourcesFolderUri.toString()
    const pdfjsDistUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionRootUri, 'node_modules', 'pdfjs-dist'))
    const pdfjsDistLink = pdfjsDistUri.toString()
    return content.replace(/%VSCODE_RES%/g, resourcesFolderLink)
                  .replace(/%VSCODE_PDFJS_DIST%/g, pdfjsDistLink)
                  .replace(/%VSCODE_CSP%/g, webview.cspSource)
}

/**
 *
 * @param panel
 * @param tabEditorGroup
 * @param activeDocument The document we set the focus back to. We should get the document before calling createWebviewPanel.
 * @param preserveFocus
 */
export async function openWebviewPanel(
    panel: vscode.WebviewPanel,
    tabEditorGroup: string,
    activeDocument: vscode.TextDocument,
    preserveFocus = true
) {
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
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const delay = configuration.get('view.pdf.tab.openDelay', 1000)
    setTimeout(async () => {
        if (!preserveFocus) {
            return
        }
        if (focusAction) {
            await vscode.commands.executeCommand(focusAction)
        }
        await vscode.window.showTextDocument(activeDocument, vscode.ViewColumn.Active)
    }, delay)
}
