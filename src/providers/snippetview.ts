import * as vscode from 'vscode'
import * as path from 'path'
import {readFileSync} from 'fs'

import type {Extension} from '../main'
import {replaceWebviewPlaceholders} from '../utils/webview'


export class SnippetViewProvider implements vscode.WebviewViewProvider {
    private readonly extension: Extension
    private view: vscode.WebviewView | undefined
    private lastActiveTextEditor: vscode.TextEditor | undefined

    constructor(extension: Extension) {
        this.extension = extension
        const editor = vscode.window.activeTextEditor
        if (editor && this.extension.manager.hasTexId(editor.document.languageId)) {
            this.lastActiveTextEditor = editor
        }
        vscode.window.onDidChangeActiveTextEditor(textEditor => {
            if (textEditor && this.extension.manager.hasTexId(textEditor.document.languageId)) {
                this.lastActiveTextEditor = textEditor
            }
        })
    }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        const resourcesFolder = path.join(this.extension.extensionRoot, 'resources', 'snippetview')
        const jsonFolder = path.join(this.extension.extensionRoot, 'resources', 'snippetpanel')
        this.view = webviewView

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(resourcesFolder), vscode.Uri.file(jsonFolder)]
        }

        webviewView.onDidDispose(() => {
            this.view = undefined
        })

        const webviewSourcePath = path.join(resourcesFolder, 'snippetview.html')
        let webviewHtml = readFileSync(webviewSourcePath, { encoding: 'utf8' })
        webviewHtml = replaceWebviewPlaceholders(webviewHtml, this.extension, this.view.webview)
        webviewView.webview.html = webviewHtml

        webviewView.webview.onDidReceiveMessage(this.messageReceive.bind(this))
    }

    private messageReceive(message: { type: string, snippet: string }) {
        if (message.type === 'insertSnippet') {
            const editor = this.lastActiveTextEditor
            if (editor) {
                editor.insertSnippet(new vscode.SnippetString(message.snippet.replace(/\\\n/g, '\\n'))).then(
                    () => {},
                    err => {
                        vscode.window.showWarningMessage(`Unable to insert symbol, ${err}`)
                    }
                )
            } else {
                vscode.window.showWarningMessage('Unable get document to insert symbol into')
            }
        }
    }
}
