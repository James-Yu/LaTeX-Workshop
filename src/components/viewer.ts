import * as vscode from 'vscode'
import * as fs from 'fs'
import * as ws from 'ws'
import * as path from 'path'
import * as cp from 'child_process'

import {Extension} from '../main'
import {SyncTeXRecordForward} from './locator'

interface Position {}

interface Client {
    type: 'viewer' | 'tab'
    prevType?: 'viewer' | 'tab'
    websocket?: ws
    position?: Position
}

export class Viewer {
    extension: Extension
    positions = {}
    private clients: {[key: string]: Client[] | undefined} = {}

    constructor(extension: Extension) {
        this.extension = extension
    }

    getClientByWebsocket(websocket: ws) : Client | null {
        for (const key in this.clients) {
            const clients = this.clients[key]
            if (clients) {
                for (const client of clients) {
                    if (client.websocket === websocket) {
                        return client
                    }
                }
            }
        }
        return null
    }

    getClients(url: string) : Client[] {
        const clients = this.clients[url.toLocaleUpperCase()]
        return clients ? [...clients] : []
    }

    addClient(url: string, client: Client) {
        const clients = this.clients[url.toLocaleUpperCase()]
        if (clients) {
            clients.push(client)
        } else {
            this.clients[url.toLocaleUpperCase()] = [client]
        }
    }

    removeClient(client: Client) {
        for (const key in this.clients) {
            const clients = this.clients[key]
            if (clients && clients.indexOf(client) > -1) {
                clients.splice(clients.indexOf(client), 1)
                return
            }
        }
    }

    refreshExistingViewer(sourceFile: string, type?: string) : boolean {
        const pdfFile = this.extension.manager.tex2pdf(sourceFile)
        const clients = this.getClients(pdfFile)

        let clientsRefreshed = false
        clients.forEach(client => {
            if ((type === undefined || client.type === type) && client.websocket !== undefined) {
                client.websocket.send(JSON.stringify({type: 'refresh'}))
                clientsRefreshed = true
            }
        })

        if (clientsRefreshed) {
            this.extension.logger.addLogMessage(`Refresh PDF viewer for ${pdfFile}`)
            return true
        }

        this.extension.logger.addLogMessage(`No PDF viewer connected for ${pdfFile}`)
        return false
    }

    checkViewer(sourceFile: string, type: string, respectOutDir: boolean = true) : string | undefined {
        this.refreshExistingViewer(sourceFile, type)

        const pdfFile = this.extension.manager.tex2pdf(sourceFile, respectOutDir)
        if (!fs.existsSync(pdfFile)) {
            this.extension.logger.addLogMessage(`Cannot find PDF file ${pdfFile}`)
            return
        }
        if (this.extension.server.address === undefined) {
            this.extension.logger.addLogMessage(`Cannot establish server connection.`)
            return
        }
        // vscode.URI.parse and pdfjs viewer automatically call decodeURIComponent.
        // So, to pass the encoded path of a pdf file to the http server,
        // we have to call encodeURIComponent three times! 3 - 2 = 1 !
        const url = `http://${this.extension.server.address}/viewer.html?file=/pdf:${encodeURIComponent(encodeURIComponent(encodeURIComponent(pdfFile)))}`
        this.extension.logger.addLogMessage(`Serving PDF file at ${url}`)
        return url
    }

    openViewer(sourceFile: string) {
        const url = this.checkViewer(sourceFile, 'viewer')
        if (!url) {
            return
        }
        const pdfFile = this.extension.manager.tex2pdf(sourceFile)

        this.addClient(pdfFile, {type: 'viewer'})
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

        this.addClient(pdfFile, {type: 'tab'})
        const editor = vscode.window.activeTextEditor
        const panel = vscode.window.createWebviewPanel('latex-workshop-pdf', path.basename(pdfFile), sideColumn ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active, {
            enableScripts: true,
            retainContextWhenHidden: true
        })
        const uri = vscode.Uri.file(pdfFile).with({scheme: 'latex-workshop-pdf'})
        panel.webview.html = this.getPDFViewerContent(uri)
        if (editor) {
            vscode.window.showTextDocument(editor.document, editor.viewColumn)
        }
        this.extension.logger.addLogMessage(`Open PDF tab for ${pdfFile}`)
    }

    getPDFViewerContent(uri: vscode.Uri) : string {
        // pdfjs viewer automatically call decodeURIComponent.
        // So, to pass the encoded path of a pdf file to the http server,
        // we have to call encodeURIComponent two times! 2 - 1 = 1 !
        const url = `http://${this.extension.server.address}/viewer.html?incode=1&file=/pdf:${uri.authority ? `\\\\${uri.authority}` : ''}${encodeURIComponent(encodeURIComponent(uri.fsPath))}`
        return `
            <!DOCTYPE html><html><head></head>
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
        this.extension.manager.setEnvVar()
        cp.spawn(command.command, command.args, {cwd: path.dirname(sourceFile), detached: true})
        this.extension.logger.addLogMessage(`Open external viewer for ${pdfFile}`)
    }

    handler(websocket: ws, msg: string) {
        const data = JSON.parse(msg)
        switch (data.type) {
            case 'open': {
                const clients = this.getClients(decodeURIComponent(decodeURIComponent(data.path)))
                clients.filter(client => client.websocket === undefined).forEach(client => {
                    client.websocket = websocket
                    if (client.type === undefined && client.prevType !== undefined) {
                        client.type = client.prevType
                    }
                })
                break
            }
            case 'close': {
                const client = this.getClientByWebsocket(websocket)
                if (client !== null) {
                    this.removeClient(client)
                }
                break
            }
            case 'position': {
                const client = this.getClientByWebsocket(websocket)
                if (client !== null) {
                    client.position = data
                }
                break
            }
            case 'loaded': {
                const client = this.getClientByWebsocket(websocket)
                if (client !== null && client.websocket !== undefined) {
                    const configuration = vscode.workspace.getConfiguration('latex-workshop')
                    if (client.position !== undefined) {
                        client.websocket.send(JSON.stringify(client.position))
                    } else {
                        client.websocket.send(JSON.stringify({
                            type: 'params',
                            scale: configuration.get('view.pdf.zoom'),
                            scrollMode: configuration.get('view.pdf.scrollMode'),
                            spreadMode: configuration.get('view.pdf.spreadMode'),
                            hand: configuration.get('view.pdf.hand'),
                            invert: configuration.get('view.pdf.invert'),
                        }))
                    }
                    if (configuration.get('synctex.afterBuild.enabled') as boolean) {
                        this.extension.locator.syncTeX()
                    }
                }
                break
            }
            case 'click': {
                this.extension.locator.locate(data, decodeURIComponent(data.path))
                break
            }
            case 'external_link': {
                vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(data.url))
                break
            }
            default: {
                this.extension.logger.addLogMessage(`Unknown websocket message: ${msg}`)
                break
            }
        }
    }

    syncTeX(pdfFile: string, record: SyncTeXRecordForward) {
        const clients = this.getClients(pdfFile)
        if (clients.length === 0) {
            this.extension.logger.addLogMessage(`PDF is not viewed: ${pdfFile}`)
            return
        }
        clients.forEach(client => {
            if (client.websocket !== undefined) {
                client.websocket.send(JSON.stringify({type: 'synctex', data: record}))
                this.extension.logger.addLogMessage(`Try to synctex ${pdfFile}`)
            }
        })
    }
}

interface ExternalCommand {
    command: string,
    args?: string[]
}
