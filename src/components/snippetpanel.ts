import * as vscode from 'vscode'
import * as path from 'path'
import { readFileSync } from 'fs'
import * as fs from 'fs'

import { Extension } from '../main'

interface IMathSymbol {
    name: string
    keywords?: string
    source: string
    snippet: string
    category: string
    svg?: string
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

        import('mathjax-node')
            .then(mj => {
                this.mathJax = mj
                mj.config({
                    MathJax: {
                        jax: ['input/TeX', 'output/SVG'],
                        extensions: ['tex2jax.js', 'MathZoom.js'],
                        showMathMenu: false,
                        showProcessingMessages: false,
                        messageStyle: 'none',
                        SVG: {
                            useGlobalCache: false
                        },
                        TeX: {
                            extensions: ['AMSmath.js', 'AMSsymbols.js', 'autoload-all.js', 'color.js', 'noUndefined.js']
                        }
                    }
                })
                mj.start()
            })
            .then(() => {
                this.loadSnippets().then(() => {
                    this.mathSymbols.forEach(async mathSymbol => {
                        const data = await this.mathJax.typeset({
                            math: mathSymbol.source,
                            format: 'TeX',
                            svgNode: true
                        })
                        mathSymbol.svg = data.svgNode.outerHTML
                    })
                })
            })
    }

    public async showPanel() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside)
            return
        }

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
                enableFindWidget: true
            }
        )
        this.panel.onDidDispose(() => {
            this.panel = undefined
        })

        const webviewSourcePath = path.join(this.extension.extensionRoot, 'src', 'components', 'snippetpanel.html')
        this.panel.webview.html = readFileSync(webviewSourcePath, { encoding: 'utf8' })

        this.initialisePanel()

        this.panel.webview.onDidReceiveMessage(this.messageRecieve.bind(this))

        fs.watchFile(webviewSourcePath, () => {
            {
                if (this.panel) {
                    this.panel.webview.html = readFileSync(webviewSourcePath, { encoding: 'utf8' })
                    this.initialisePanel()
                }
            }
        })
    }

    private mathSymbols: IMathSymbol[] = []

    private async loadSnippets() {
        const snippets: {
            mathSymbols: {
                [category: string]: {
                    name: string;
                    keywords?: string;
                    source: string;
                    snippet: string;
                }[];
            };
        } = JSON.parse(
            readFileSync(path.join(this.extension.extensionRoot, 'snippets', 'snippetPanel.json'), { encoding: 'utf8' })
        )

        for (const category in snippets.mathSymbols) {
            snippets.mathSymbols[category].forEach(symbol => {
                if (symbol.keywords === undefined) {
                    symbol.keywords = ''
                }
                this.mathSymbols.push({
                    ...symbol,
                    category
                })
            })
        }
    }

    private async initialisePanel() {
        if (this.panel === undefined) {
            return
        }

        this.mathSymbols.forEach(async mathSymbol => {
            // @ts-ignore
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
