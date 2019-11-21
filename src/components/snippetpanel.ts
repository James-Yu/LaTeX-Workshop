import * as vscode from 'vscode'
import * as path from 'path'
import { readFileSync } from 'fs'
import * as fs from 'fs'

import { Extension } from '../main'

type IMathSymbol = {
    name: string,
    keywords?: string,
    source: string,
    snippet: string,
    category?: string,
    svg?: string,
    shrink?: boolean
}

export class SnippetPanel {
    extension: Extension
    panel: vscode.WebviewPanel | undefined
    lastActiveTextEditor: vscode.TextEditor | undefined

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

    public showPanel() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside)
            return
        }

        const resourcesFolder = path.join(this.extension.extensionRoot, 'resources', 'snippetpanel')

        this.panel = vscode.window.createWebviewPanel(
            'latex.snippetPanel',
            'LaTeX Snippet Panel',
            {
                preserveFocus: true,
                viewColumn: vscode.ViewColumn.Beside
            },
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                enableFindWidget: true,
                localResourceRoots: [vscode.Uri.file(resourcesFolder)]
            }
        )
        this.panel.onDidDispose(() => {
            this.panel = undefined
        })

        const webviewSourcePath = path.join(resourcesFolder, 'snippetpanel.html')
        let webviewHtml = readFileSync(webviewSourcePath, { encoding: 'utf8' })
        webviewHtml = webviewHtml.replace(
            /vscode-resource:\.\//g,
            'vscode-resource:' +
                vscode.Uri.file(resourcesFolder).with({
                    scheme: 'vscode-resource'
                }).path +
                '/'
        )
        this.panel.webview.html = webviewHtml

        this.initialisePanel()

        this.panel.webview.onDidReceiveMessage(this.messageReceive.bind(this))

        fs.watchFile(webviewSourcePath, () => {
            {
                if (this.panel) {
                    this.panel.webview.html = readFileSync(webviewSourcePath, { encoding: 'utf8' }).replace(
                        /vscode-resource:\.\//g,
                        'vscode-resource:' +
                            vscode.Uri.file(resourcesFolder).with({
                                scheme: 'vscode-resource'
                            }).path +
                            '/'
                    )
                    this.initialisePanel()
                }
            }
        })
    }

    private mathSymbols: IMathSymbol[] = []

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
        if (this.panel === undefined) {
            return
        }

        this.panel.webview.postMessage({
            type: 'mathSymbols',
            mathSymbols: this.mathSymbols
        })

        this.panel.webview.postMessage({ type: 'initialise' })
    }

    private messageReceive(message: { type: string, [param: string]: any }) {
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
