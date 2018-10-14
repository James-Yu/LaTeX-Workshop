import * as vscode from 'vscode'
import * as fs from 'fs'
import * as ws from 'ws'
import * as path from 'path'
import * as cp from 'child_process'

import {Extension} from '../main'
import {SyncTeXRecord} from './locator'

interface Position {}

interface Client {
    type: 'viewer' | 'tab'
    prevType?: 'viewer' | 'tab'
    websocket?: ws
    position?: Position
}

export class Viewer {
    extension: Extension
    clients: {[key: string]: Client | undefined} = {}
    positions = {}

    constructor(extension: Extension) {
        this.extension = extension
    }

    refreshExistingViewer(sourceFile: string, type?: string) : boolean {
        const pdfFile = this.extension.manager.tex2pdf(sourceFile)
        const client = this.clients[pdfFile.toLocaleUpperCase()]
        if (client !== undefined &&
            (type === undefined || client.type === type) &&
            client.websocket !== undefined) {
            this.extension.logger.addLogMessage(`Refresh PDF viewer for ${pdfFile}`)
            client.websocket.send(JSON.stringify({type: 'refresh'}))
            return true
        }
        this.extension.logger.addLogMessage(`No PDF viewer connected for ${pdfFile}`)
        return false
    }

    checkViewer(sourceFile: string, type: string, respectOutDir: boolean = true) : string | undefined {
        if (this.refreshExistingViewer(sourceFile, type)) {
            return
        }
        const pdfFile = this.extension.manager.tex2pdf(sourceFile, respectOutDir)
        if (!fs.existsSync(pdfFile)) {
            this.extension.logger.addLogMessage(`Cannot find PDF file ${pdfFile}`)
            return
        }
        if (this.extension.server.address === undefined) {
            this.extension.logger.addLogMessage(`Cannot establish server connection.`)
            return
        }
        const url = `http://${this.extension.server.address}/viewer.html?file=/pdf:${encodeURIComponent(encodeURIComponent(pdfFile))}`
        this.extension.logger.addLogMessage(`Serving PDF file at ${url}`)
        return url
    }

    openViewer(sourceFile: string) {
        const url = this.checkViewer(sourceFile, 'viewer')
        if (!url) {
            return
        }
        const pdfFile = this.extension.manager.tex2pdf(sourceFile)
        const client = this.clients[pdfFile.toLocaleUpperCase()]
        if (client !== undefined && client.websocket !== undefined) {
            client.websocket.close()
        }
        this.clients[pdfFile.toLocaleUpperCase()] = {type: 'viewer'}
        try {
            vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url))
            this.extension.logger.addLogMessage(`Open PDF viewer for ${pdfFile}`)
        } catch (e) {
            vscode.window.showInputBox({
                prompt: 'Unable to open browser. Please copy and visit this link.',
                value: url
            })
            this.extension.logger.addLogMessage(`Something bad happened when opening PDF viewer for ${pdfFile}: ${e}`)
        }
    }

    openTab(sourceFile: string, respectOutDir: boolean = true, sideColumn: boolean = true) {
        const url = this.checkViewer(sourceFile, 'tab', respectOutDir)
        if (!url) {
            return
        }
        const pdfFile = this.extension.manager.tex2pdf(sourceFile, respectOutDir)
        const client = this.clients[pdfFile.toLocaleUpperCase()]
        const uri = vscode.Uri.file(pdfFile).with({scheme: 'latex-workshop-pdf'})
        if (client !== undefined && client.websocket !== undefined) {
            client.websocket.close()
        }
        this.clients[pdfFile.toLocaleUpperCase()] = {type: 'tab'}
        const editor = vscode.window.activeTextEditor
        const panel = vscode.window.createWebviewPanel('latex-workshop-pdf', path.basename(pdfFile), sideColumn ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active, {
            enableScripts: true,
            retainContextWhenHidden: true
        })
        this.extension.panels.push(panel)
        panel.onDidDispose(() => this.extension.panels.splice(this.extension.panels.indexOf(panel), 1))
        panel.webview.html = this.getPDFViewerContent(uri)
        if (editor) {
            vscode.window.showTextDocument(editor.document, editor.viewColumn)
        }
        this.extension.logger.addLogMessage(`Open PDF tab for ${pdfFile}`)
    }

    getPDFViewerContent(uri: vscode.Uri) : string {
        const url = `http://${this.extension.server.address}/viewer.html?incode=1&file=/pdf:${uri.authority ? `\\\\${uri.authority}` : ''}${encodeURIComponent(uri.fsPath)}`
        const mathjaxurl = `http://${this.extension.server.address}/mathjax/MathJax.js?config=TeX-AMS_SVG`
        const mjurl = `http://${this.extension.server.address}/mj.js`

        return `
            <!DOCTYPE html><html>
            <head>
            <meta http-equiv="Content-Security-Policy" content="default-src http://${this.extension.server.address} ; script-src http://${this.extension.server.address} 'unsafe-eval' 'unsafe-inline'; style-src 'unsafe-inline';">
            <script src='${mathjaxurl}'>
             var script = document.createElement('script')
             script.src = '${mjurl}'
             document.body.appendChild(script)
            </script>
            <script type="text/x-mathjax-config">
            MathJax.Hub.Config({
                jax: ["input/TeX", "output/SVG"],
                extensions: ["tex2jax.js", "MathMenu.js", "MathZoom.js"],
                showMathMenu: false,
                showProcessingMessages: false,
                skipStartupTypeset: true,
                messageStyle: "none",
                SVG: {
                    useGlobalCache: false
                },
                TeX: {
                    extensions: ["AMSmath.js", "AMSsymbols.js", "autoload-all.js"]
                },
                tex2jax: {
                    inlineMath: [ ['\$','\$'], ['\\\\(', '\\\\)'] ]
                }
            })
            </script>
            </head>
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
            </script>
            <div id="tmp00" style="visibility: hidden; width: 1px; overflow: scroll;"></div>
            <span id="colorpick" style="color: var(--color); background: var(--vscode-editorHoverWidget-background)"></span>
            </body></html>
        `
    }

    openExternal(sourceFile: string) {
        const pdfFile = this.extension.manager.tex2pdf(sourceFile)
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const command = JSON.parse(JSON.stringify(configuration.get('view.pdf.external.command'))) as ExternalCommand
        if (command.args) {
            command.args = command.args.map(arg => arg.replace('%PDF%', pdfFile))
        }
        cp.spawn(command.command, command.args, {cwd: path.dirname(sourceFile), detached: true})
        this.extension.logger.addLogMessage(`Open external viewer for ${pdfFile}`)
    }

    handler(websocket: ws, msg: string) {
        const data = JSON.parse(msg)
        let client: Client | undefined
        switch (data.type) {
            case 'open':
                client = this.clients[decodeURIComponent(data.path).toLocaleUpperCase()]
                if (client !== undefined) {
                    client.websocket = websocket
                    if (client.type === undefined && client.prevType !== undefined) {
                        client.type = client.prevType
                    }
                }
                break
            case 'close':
                for (const key in this.clients) {
                    client = this.clients[key]
                    if (client !== undefined && client.websocket === websocket) {
                        client.prevType = client.type
                        delete client.websocket
                        delete client.type
                    }
                }
                break
            case 'position':
                for (const key in this.clients) {
                    client = this.clients[key]
                    if (client !== undefined && client.websocket === websocket) {
                        client.position = data
                    }
                }
                break
            case 'loaded':
                client = this.clients[decodeURIComponent(data.path).toLocaleUpperCase()]
                if (client !== undefined && client.websocket !== undefined) {
                    const configuration = vscode.workspace.getConfiguration('latex-workshop')
                    if (client.position !== undefined) {
                        client.websocket.send(JSON.stringify(client.position))
                    } else {
                        client.websocket.send(JSON.stringify({
                            type: 'params',
                            scale: configuration.get('view.pdf.zoom'),
                            hand: configuration.get('view.pdf.hand'),
                            invert: configuration.get('view.pdf.invert'),
                        }))
                    }
                    if (configuration.get('synctex.afterBuild.enabled') as boolean) {
                        this.extension.locator.syncTeX()
                    }
                }
                break
            case 'click':
                this.extension.locator.locate(data, decodeURIComponent(data.path))
                break
            case 'external_link':
                vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(data.url))
                break
            default:
                this.extension.logger.addLogMessage(`Unknown websocket message: ${msg}`)
                break
        }
    }

    syncTeX(pdfFile: string, record: SyncTeXRecord | {[key: string]: string | number}) {
        const client = this.clients[pdfFile.toLocaleUpperCase()]
        if (client === undefined) {
            this.extension.logger.addLogMessage(`PDF is not viewed: ${pdfFile}`)
            return
        }
        if (client.websocket !== undefined) {
            client.websocket.send(JSON.stringify({type: 'synctex', data: record}))
            this.extension.logger.addLogMessage(`Try to synctex ${pdfFile}`)
        }
    }
}

interface ExternalCommand {
    command: string,
    args?: string[]
}
