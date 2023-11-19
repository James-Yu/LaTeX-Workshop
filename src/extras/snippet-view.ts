import * as vscode from 'vscode'
import {readFileSync} from 'fs'
import * as path from 'path'
import { lw } from '../lw'
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
    readonly snippetViewProvider: SnippetViewProvider

    constructor() {
        this.snippetViewProvider = new SnippetViewProvider()
    }

    async renderPdf(pdfFileUri: vscode.Uri, opts: { height: number, width: number, pageNumber: number }): Promise<string | undefined> {
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
                opts
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
    private view: vscode.WebviewView | undefined
    private lastActiveTextEditor: vscode.TextEditor | undefined
    private readonly cbSet = new Set<(e: SnippetViewResult) => void>()

    constructor() {
        const editor = vscode.window.activeTextEditor
        if (editor && lw.manager.hasTexId(editor.document.languageId)) {
            this.lastActiveTextEditor = editor
        }
        vscode.window.onDidChangeActiveTextEditor(textEditor => {
            if (textEditor && lw.manager.hasTexId(textEditor.document.languageId)) {
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

        const webviewSourcePath = path.join(lw.extensionRoot, 'resources', 'snippetview', 'snippetview.html')
        let webviewHtml = readFileSync(webviewSourcePath, { encoding: 'utf8' })
        webviewHtml = replaceWebviewPlaceholders(webviewHtml, this.view.webview)
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
