import * as vscode from 'vscode'
import * as path from 'path'
import { readFileSync, writeFileSync } from 'fs'
import * as fs from 'fs'

import { Extension } from '../main'

type IMathSymbol = {
    name: string;
    keywords?: string;
    source: string;
    snippet: string;
    category?: string;
    svg?: string;
    shrink?: boolean;
}

export class SnippetPanel {
    extension: Extension
    panel: vscode.WebviewPanel | undefined
    configuration: vscode.WorkspaceConfiguration
    mathJax: any
    lastActiveTextEditor: vscode.TextEditor | undefined

    constructor(extension: Extension) {
        this.extension = extension

        vscode.window.onDidChangeActiveTextEditor(textEditor => {
            if (textEditor) {
                this.lastActiveTextEditor = textEditor
            }
        })
    }

    public async showPanel() {
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

        this.panel.webview.onDidReceiveMessage(this.messageRecieve.bind(this))

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

    private async loadSnippets() {
        const snipetsFile = path.join(this.extension.extensionRoot, 'resources', 'snippetpanel', 'snippetpanel.json')
        const snippets: {
            mathSymbols: {
                [category: string]: IMathSymbol[];
            };
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

    private async initialisePanel() {
        if (this.panel === undefined) {
            return
        }

        this.mathSymbols.forEach(async mathSymbol => {
            if (this.panel === undefined) {
                return
            }
            this.panel.webview.postMessage({
                type: 'mathSymbol',
                ...mathSymbol
            })
        })

        this.panel.webview.postMessage({ type: 'initialise' })
    }

    private async messageRecieve(message: { type: string; [param: string]: any }) {
        if (message.type === 'insertSnippet') {
            const editor = this.lastActiveTextEditor
            if (editor) {
                editor.insertSnippet(new vscode.SnippetString(message.snippet)).then(
                    msg => {
                        console.log(msg)
                    },
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
