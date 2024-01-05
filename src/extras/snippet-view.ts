import * as vscode from 'vscode'
import { readFileSync } from 'fs'
import * as path from 'path'
import { lw } from '../lw'
import { replaceWebviewPlaceholders } from '../utils/webview'

export {
    state,
    render,
    provider
}

lw.onDispose(vscode.window.onDidChangeActiveTextEditor(e => {
    state.editor = lw.file.hasTexLangId(e?.document.languageId ?? '') ? e : undefined
}))

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
        disposable = on((e: SnippetViewResult) => {
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

function on(cb: (e: SnippetViewResult) => void) {
    state.callbacks.add(cb)
    return {
        dispose: () => state.callbacks.delete(cb)
    }
}

function receive(message: SnippetViewResult) {
    if (message.type === 'insertSnippet') {
        if (state.editor) {
            state.editor.insertSnippet(new vscode.SnippetString(message.snippet.replace(/\\\n/g, '\\n'))).then(
                () => {},
                err => {
                    void vscode.window.showWarningMessage(`Unable to insert symbol, ${err}`)
                }
            )
        } else {
            void vscode.window.showWarningMessage('Please select a LaTeX document to insert the symbol.')
        }
    }
}

class SnippetViewProvider implements vscode.WebviewViewProvider {
    public resolveWebviewView(webviewView: vscode.WebviewView) {
        state.view = webviewView

        webviewView.webview.options = {
            enableScripts: true
        }

        webviewView.onDidDispose(() => {
            state.view = undefined
        })

        const webviewSourcePath = path.join(lw.extensionRoot, 'resources', 'snippetview', 'snippetview.html')
        let webviewHtml = readFileSync(webviewSourcePath, { encoding: 'utf8' })
        webviewHtml = replaceWebviewPlaceholders(webviewHtml, state.view.webview)
        webviewView.webview.html = webviewHtml

        webviewView.webview.onDidReceiveMessage((e: SnippetViewResult) => {
            state.callbacks.forEach((cb) => void cb(e))
            receive(e)
        })
    }
}

const provider = new SnippetViewProvider()
const state = {
    view: undefined as vscode.WebviewView | undefined,
    editor: lw.file.hasTexLangId(vscode.window.activeTextEditor?.document.languageId ?? '') ? vscode.window.activeTextEditor : undefined,
    callbacks: new Set<(e: SnippetViewResult) => void>()
}
