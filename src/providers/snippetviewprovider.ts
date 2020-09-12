import * as vscode from 'vscode'
import * as path from 'path'
import {readFileSync} from 'fs'

import type {Extension} from '../main'
import {replaceWebviewPlaceholders} from '../utils/webview'

type IMathSymbol = {
    name: string,
    keywords?: string,
    source: string,
    snippet: string,
    category?: string,
    svg?: string,
    shrink?: boolean
}

export class SnippetViewProvider implements vscode.WebviewViewProvider {
    private readonly extension: Extension
    private readonly mathSymbols: IMathSymbol[] = []
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
        this.loadSnippets()
    }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        const resourcesFolder = path.join(this.extension.extensionRoot, 'resources', 'snippetview')
        this.view = webviewView

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(resourcesFolder)]
        }

        webviewView.onDidDispose(() => {
            this.view = undefined
        })

        const webviewSourcePath = path.join(resourcesFolder, 'snippetview.html')
        let webviewHtml = readFileSync(webviewSourcePath, { encoding: 'utf8' })
        webviewHtml = replaceWebviewPlaceholders(webviewHtml, this.extension, this.view.webview)
        webviewView.webview.html = webviewHtml

        this.initialisePanel()
        webviewView.webview.onDidReceiveMessage(this.messageReceive.bind(this))
    }

    private loadSnippets() {
        const snipetsFile = path.join(this.extension.extensionRoot, 'resources', 'snippetpanel', 'snippetpanel.json')
        const snippets: {
            mathSymbols: {
                [category: string]: IMathSymbol[]
            }
        } = JSON.parse(readFileSync(snipetsFile, { encoding: 'utf8' }))

        for (const category in snippets.mathSymbols) {
            for (let i = 0; i < snippets.mathSymbols[category].length; i++) {
                const symbol = snippets.mathSymbols[category][i]
                symbol.category = category
                if (symbol.keywords === undefined) {
                    symbol.keywords = ''
                }
                this.mathSymbols.push(symbol)
            }
        }
    }

    private initialisePanel() {
        if (this.view === undefined) {
            return
        }
        this.view.webview.postMessage({
            type: 'mathSymbols',
            mathSymbols: this.mathSymbols
        })
        this.view.webview.postMessage({ type: 'initialise' })
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
