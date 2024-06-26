import * as vscode from 'vscode'
import { readFileSync } from 'fs'
import * as path from 'path'
import { lw } from '../lw'

export {
    state,
    render,
    provider
}

type SnippetViewResult = RenderResult | {
    type: 'insertSnippet',
    snippet: string
}

type RenderResult = {
    type: 'png',
    uri: string,
    data: string | undefined
}

async function render(pdfFileUri: vscode.Uri, opts: { height: number, width: number, pageNumber: number }): Promise<string | undefined> {
    if (!state.view?.webview) {
        return
    }
    const uri = state.view.webview.asWebviewUri(pdfFileUri).toString()
    let disposable: { dispose: () => void } | undefined
    const promise = new Promise<RenderResult | undefined>((resolve) => {
        const rendered = (e: SnippetViewResult) => {
            if (e.type !== 'png') {
                return
            }
            if (e.uri === uri) {
                resolve(e)
            }
        }
        state.callbacks.add(rendered)
        setTimeout(() => {
            state.callbacks.delete(rendered)
            resolve(undefined)
        }, 3000)
        void state.view?.webview.postMessage({
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

function receive(message: SnippetViewResult) {
    if (message.type === 'insertSnippet') {
        vscode.window.activeTextEditor?.insertSnippet(
            new vscode.SnippetString(message.snippet.replace(/\\\n/g, '\\n')))
                .then(() => {}, err => {
                    void vscode.window.showWarningMessage(`Unable to insert symbol, ${err}`)
                }
        )
    }
}

class SnippetViewProvider implements vscode.WebviewViewProvider {
    private serverHandlerInserted = false

    public async resolveWebviewView(webviewView: vscode.WebviewView) {
        if (this.serverHandlerInserted === false) {
            lw.server.setHandler((url: string) => {
                if (url.startsWith('/snippetview/')) {
                    return path.resolve(lw.extensionRoot, 'resources')
                }
                return undefined
            })
            this.serverHandlerInserted = true
        }

        state.view = webviewView

        webviewView.webview.options = {
            enableScripts: true
        }

        webviewView.onDidDispose(() => {
            state.view = undefined
        })

        const webviewSourcePath = path.join(lw.extensionRoot, 'resources', 'snippetview', 'snippetview.html')

        const htmlContent = readFileSync(webviewSourcePath, { encoding: 'utf8' })
            .replaceAll('%SRC%', (await lw.server.getUrl()).url)
            .replaceAll('%CSP%', webviewView.webview.cspSource + ' http://127.0.0.1:*')
        const replacements = await Promise.all(Array.from(htmlContent.matchAll(/\{%(.*?)%\}/g), match => lw.language.getLocaleString(match[1])))
        let index = 0
        webviewView.webview.html = htmlContent.replace(/\{%(.*?)%\}/g, () => replacements[index++])

        webviewView.webview.onDidReceiveMessage((e: SnippetViewResult) => {
            state.callbacks.forEach((cb) => void cb(e))
            receive(e)
        })
    }
}

const provider = new SnippetViewProvider()
const state = {
    view: undefined as vscode.WebviewView | undefined,
    callbacks: new Set<(e: SnippetViewResult) => void>()
}
