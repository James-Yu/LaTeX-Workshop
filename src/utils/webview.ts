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
