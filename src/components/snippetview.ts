import * as vscode from 'vscode'
import {readFileSync} from 'fs'
import * as path from 'path'

import type {Extension} from '../main'
import {replaceWebviewPlaceholders} from '../utils/webview'


type SnippetViewResult = RenderResult | {
    type: 'insertSnippet',
    snippet: string
}

type RenderResult = {
    type: 'png',
    uri: string,
    data: string | undefined
}

export class SnippetView {
    readonly extension: Extension
    readonly snippetViewProvider: SnippetViewProvider

    constructor(extension: Extension) {
        this.extension = extension
        this.snippetViewProvider = new SnippetViewProvider(extension)
    }

    async renderPdf(pdfFileUri: vscode.Uri, pageNumber: number = 1) {
        const webview = this.snippetViewProvider.webviewView?.webview
        if (!webview) {
            return
        }
        const uri = webview.asWebviewUri(pdfFileUri).toString()
        let disposable: { dispose: () => void } | undefined
        const promise = new Promise<RenderResult | undefined>((resolve) => {
            disposable = this.snippetViewProvider.onDidReceiveMessage((e: SnippetViewResult) => {
                if (e.type !== 'png') {
                    return
                }
                if (e.uri === uri) {
                    resolve(e)
                }
            })
            setTimeout(() => {
                disposable?.dispose()
                resolve(undefined)
            }, 3000)
            void webview.postMessage({
                type: 'pdf',
                uri,
                pageNumber
            })
        })
        try {
            const renderResult = await promise
            return renderResult?.data
        } finally {
            disposable?.dispose()
        }
    }
}

class SnippetViewProvider implements vscode.WebviewViewProvider {
    private readonly extension: Extension
    private view: vscode.WebviewView | undefined
    private lastActiveTextEditor: vscode.TextEditor | undefined
    private readonly cbSet = new Set<(e: SnippetViewResult) => void>()

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

    get webviewView() {
        return this.view
    }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this.view = webviewView

        webviewView.webview.options = {
            enableScripts: true
        }

        webviewView.onDidDispose(() => {
            this.view = undefined
        })

        const webviewSourcePath = path.join(this.extension.extensionRoot, 'resources', 'snippetview', 'snippetview.html')
        let webviewHtml = readFileSync(webviewSourcePath, { encoding: 'utf8' })
        webviewHtml = replaceWebviewPlaceholders(webviewHtml, this.extension, this.view.webview)
        webviewView.webview.html = webviewHtml

        webviewView.webview.onDidReceiveMessage((e: SnippetViewResult) => {
            this.cbSet.forEach((cb) => void cb(e))
            this.messageReceive(e)
        })
    }

    private messageReceive(message: SnippetViewResult) {
        if (message.type === 'insertSnippet') {
            const editor = this.lastActiveTextEditor
            if (editor) {
                editor.insertSnippet(new vscode.SnippetString(message.snippet.replace(/\\\n/g, '\\n'))).then(
                    () => {},
                    err => {
                        void vscode.window.showWarningMessage(`Unable to insert symbol, ${err}`)
                    }
                )
            } else {
                void vscode.window.showWarningMessage('Unable get document to insert symbol into')
            }
        }
    }

    onDidReceiveMessage(cb: (e: SnippetViewResult) => void) {
        this.cbSet.add(cb)
        return {
            dispose: () => this.cbSet.delete(cb)
        }
    }
}
