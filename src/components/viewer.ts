import * as vscode from 'vscode'
import * as fs from 'fs'
import * as ws from 'ws'
import * as path from 'path'
import * as cp from 'child_process'

import {Extension} from '../main'
import {SyncTeXRecordForward} from './locator'
import {encodePathWithPrefix} from '../utils/utils'

import {ClientRequest, ServerResponse} from '../../viewer/components/protocol'

class Client {
    readonly viewer: 'browser' | 'tab'
    readonly websocket: ws

    constructor(viewer: 'browser' | 'tab', websocket: ws) {
        this.viewer = viewer
        this.websocket = websocket
    }

    send(message: ServerResponse) {
        this.websocket.send(JSON.stringify(message))
    }
}

export class Viewer {
    extension: Extension
    clients: {[key: string]: Client[]} = {}

    constructor(extension: Extension) {
        this.extension = extension
    }

    refreshExistingViewer(sourceFile?: string, viewer?: string): boolean {
        if (!sourceFile) {
            Object.keys(this.clients).forEach(key => {
                this.clients[key].forEach(client => {
                    client.send({type: 'refresh'})
                })
            })
            return true
        }
        const pdfFile = this.extension.manager.tex2pdf(sourceFile, true)
        const clients = this.clients[pdfFile.toLocaleUpperCase()]
        if (clients !== undefined) {
            let refreshed = false
            // Check all viewer clients with the same path
            clients.forEach(client => {
                // Refresh only correct type
                if (viewer === undefined || client.viewer === viewer) {
                    this.extension.logger.addLogMessage(`Refresh PDF viewer for ${pdfFile}`)
                    client.send({type: 'refresh'})
                    refreshed = true
                }
            })
            // Return if refreshed anyone
            if (refreshed) {
                return true
            }
        }
        this.extension.logger.addLogMessage(`No PDF viewer connected for ${pdfFile}`)
        return false
    }

    checkViewer(sourceFile: string, respectOutDir: boolean = true): string | undefined {
        const pdfFile = this.extension.manager.tex2pdf(sourceFile, respectOutDir)
        if (!fs.existsSync(pdfFile)) {
            this.extension.logger.addLogMessage(`Cannot find PDF file ${pdfFile}`)
            return
        }
        if (this.extension.server.address === undefined) {
            this.extension.logger.addLogMessage('Cannot establish server connection.')
            return
        }
        const url = `http://localhost:${this.extension.server.port}/viewer.html?file=${encodePathWithPrefix(pdfFile)}`
        this.extension.logger.addLogMessage(`Serving PDF file at ${url}`)
        this.extension.logger.addLogMessage(`The encoded path is ${pdfFile}`)
        return url
    }

    openBrowser(sourceFile: string) {
        const url = this.checkViewer(sourceFile, true)
        if (!url) {
            return
        }
        const pdfFile = this.extension.manager.tex2pdf(sourceFile)
        this.clients[pdfFile.toLocaleUpperCase()] = this.clients[pdfFile.toLocaleUpperCase()] || []

        try {
            vscode.env.openExternal(vscode.Uri.parse(url))
            this.extension.logger.addLogMessage(`Open PDF viewer for ${pdfFile}`)
        } catch (e) {
            vscode.window.showInputBox({
                prompt: 'Unable to open browser. Please copy and visit this link.',
                value: url
            })
            this.extension.logger.addLogMessage(`Something bad happened when opening PDF viewer for ${pdfFile}: ${e}`)
        }
    }

    openTab(sourceFile: string, respectOutDir: boolean = true, tabEditorGroup: string) {
        const url = this.checkViewer(sourceFile, respectOutDir)
        if (!url) {
            return
        }
        if (this.extension.server.port === undefined) {
            this.extension.logger.addLogMessage('Server port is undefined')
            return
        }
        const pdfFile = this.extension.manager.tex2pdf(sourceFile, respectOutDir)
        this.clients[pdfFile.toLocaleUpperCase()] = this.clients[pdfFile.toLocaleUpperCase()] || []

        const editor = vscode.window.activeTextEditor
        let viewColumn: vscode.ViewColumn
        if (tabEditorGroup === 'current') {
            viewColumn = vscode.ViewColumn.Active
        } else {
            // If an editor already exists on the left, use it
            if (tabEditorGroup === 'left' && editor?.viewColumn === vscode.ViewColumn.Two) {
                viewColumn = vscode.ViewColumn.One
            } else {
                viewColumn = vscode.ViewColumn.Beside
            }
        }
        const panel = vscode.window.createWebviewPanel('latex-workshop-pdf', path.basename(pdfFile), viewColumn, {
            enableScripts: true,
            retainContextWhenHidden: true,
            portMapping : [{webviewPort: this.extension.server.port, extensionHostPort: this.extension.server.port}]
        })
        panel.webview.html = this.getPDFViewerContent(pdfFile)
        if (editor && viewColumn !== vscode.ViewColumn.Active) {
            setTimeout(() => { vscode.window.showTextDocument(editor.document, editor.viewColumn).then(() => {
                if (tabEditorGroup === 'left' && viewColumn !== vscode.ViewColumn.One) {
                vscode.commands.executeCommand('workbench.action.moveActiveEditorGroupRight')
            }}) }, 500)
        }
        this.extension.logger.addLogMessage(`Open PDF tab for ${pdfFile}`)
    }

    getPDFViewerContent(pdfFile: string): string {
        // viewer/viewer.js automatically requests the file to server.ts, and server.ts decodes the encoded path of PDF file.
        const url = `http://localhost:${this.extension.server.port}/viewer.html?incode=1&file=${encodePathWithPrefix(pdfFile)}`
        return `
            <!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="default-src http://localhost:* http://127.0.0.1:*; script-src 'unsafe-inline'; style-src 'unsafe-inline';"></head>
            <body><iframe id="preview-panel" class="preview-panel" src="${url}" style="position:absolute; border: none; left: 0; top: 0; width: 100%; height: 100%;">
            </iframe>
            <script>
            // when the iframe loads, or when the tab gets focus again later, move the
            // the focus to the iframe so that keyboard navigation works in the pdf.
            //
            // Note: this works on first load, or when navigating between groups, but not when
            //       navigating between tabs of the same group for some reason!

            let iframe = document.getElementById('preview-panel');
            window.onfocus = iframe.onload = function() {
                setTimeout(function() { // doesn't work immediately
                    iframe.contentWindow.focus();
                }, 100);
            }
            // To enable keyboard shortcuts of VS Code when the iframe is focused,
            // we have to dispatch keyboard events in the parent window.
            // See https://github.com/microsoft/vscode/issues/65452
            window.addEventListener('message', (e) => {
                window.dispatchEvent(new KeyboardEvent('keydown', e.data));
            }, false);
            </script>
            </body></html>
        `
    }

    openExternal(sourceFile: string) {
        const pdfFile = this.extension.manager.tex2pdf(sourceFile)
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        let command = configuration.get('view.pdf.external.viewer.command') as string
        let args = configuration.get('view.pdf.external.viewer.args') as string[]
        if (!command) {
            switch (process.platform) {
                case 'win32':
                    command = 'SumatraPDF.exe'
                    args = ['%PDF%']
                    break
                case 'linux':
                    command = 'xdg-open'
                    args = ['%PDF%']
                    break
                case 'darwin':
                    command = 'open'
                    args = ['%PDF%']
                    break
                default:
                    break
            }
        }
        if (args) {
            args = args.map(arg => arg.replace('%PDF%', pdfFile))
        }
        this.extension.manager.setEnvVar()
        cp.spawn(command, args, {cwd: path.dirname(sourceFile), detached: true})
        this.extension.logger.addLogMessage(`Open external viewer for ${pdfFile}`)
    }

    handler(websocket: ws, msg: string) {
        const data: ClientRequest = JSON.parse(msg)
        let clients: Client[] | undefined
        if (data.type !== 'ping') {
            this.extension.logger.addLogMessage(`Handle data type: ${data.type}`)
        }
        switch (data.type) {
            case 'open': {
                clients = this.clients[data.path.toLocaleUpperCase()]
                if (clients === undefined) {
                    return
                }
                clients.push( new Client(data.viewer, websocket) )
                break
            }
            case 'close': {
                for (const key in this.clients) {
                    clients = this.clients[key]
                    let index = -1
                    for (const client of clients) {
                        if (client.websocket === websocket) {
                            index = clients.indexOf(client)
                            break
                        }
                    }
                    if (index > -1) {
                        clients.splice(index, 1)
                    }
                }
                break
            }
            case 'request_params': {
                clients = this.clients[data.path.toLocaleUpperCase()]
                for (const client of clients) {
                    if (client.websocket !== websocket) {
                        continue
                    }
                    const configuration = vscode.workspace.getConfiguration('latex-workshop')
                    client.send({
                        type: 'params',
                        scale: configuration.get('view.pdf.zoom') as string,
                        trim: configuration.get('view.pdf.trim') as number,
                        scrollMode: configuration.get('view.pdf.scrollMode') as number,
                        spreadMode: configuration.get('view.pdf.spreadMode') as number,
                        hand: configuration.get('view.pdf.hand') as boolean,
                        invert: configuration.get('view.pdf.invert') as number,
                        bgColor: configuration.get('view.pdf.backgroundColor') as string,
                        keybindings: {
                            synctex: configuration.get('view.pdf.internal.synctex.keybinding') as 'ctrl-click' | 'double-click'
                        }
                    })
                }
                break
            }
            case 'loaded': {
                const configuration = vscode.workspace.getConfiguration('latex-workshop')
                if (configuration.get('synctex.afterBuild.enabled') as boolean) {
                    this.extension.logger.addLogMessage('SyncTex after build invoked.')
                    this.extension.locator.syncTeX(undefined, undefined, decodeURIComponent(data.path))
                }
                break
            }
            case 'reverse_synctex': {
                this.extension.locator.locate(data, data.path)
                break
            }
            case 'external_link': {
                vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(data.url))
                break
            }
            case 'ping': {
                // nothing to do
                break
            }
            default: {
                this.extension.logger.addLogMessage(`Unknown websocket message: ${msg}`)
                break
            }
        }
    }

    syncTeX(pdfFile: string, record: SyncTeXRecordForward) {
        const clients = this.clients[pdfFile.toLocaleUpperCase()]
        if (clients === undefined) {
            this.extension.logger.addLogMessage(`PDF is not viewed: ${pdfFile}`)
            return
        }
        for (const client of clients) {
            client.send({type: 'synctex', data: record})
            this.extension.logger.addLogMessage(`Try to synctex ${pdfFile}`)
        }
    }
}
