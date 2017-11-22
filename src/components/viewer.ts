import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as opn from 'opn'
import * as WebSocket from 'ws'

import {Extension} from '../main'
import {SyncTeXRecord} from './locator'

interface Position {}

interface Client {
    type: 'viewer' | 'tab'
    prevType?: 'viewer' | 'tab'
    ws?: WebSocket
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
            client.ws !== undefined) {
            this.extension.logger.addLogMessage(`Refresh PDF viewer for ${pdfFile}`)
            client.ws.send(JSON.stringify({type: 'refresh'}))
            return true
        }
        this.extension.logger.addLogMessage(`No PDF viewer connected for ${pdfFile}`)
        return false
    }

    checkViewer(sourceFile: string, type: string) : string | undefined {
        if (this.refreshExistingViewer(sourceFile, type)) {
            return
        }
        const pdfFile = this.extension.manager.tex2pdf(sourceFile)
        if (!fs.existsSync(pdfFile)) {
            this.extension.logger.addLogMessage(`Cannot find PDF file ${pdfFile}`)
            return
        }
        if (this.extension.server.address === undefined) {
            this.extension.logger.addLogMessage(`Cannot establish server connection.`)
            return
        }
        const url = `http://${this.extension.server.address}/viewer.html?file=/pdf:${encodeURIComponent(pdfFile)}`
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
        if (client !== undefined && client.ws !== undefined) {
            client.ws.close()
        }
        this.clients[pdfFile.toLocaleUpperCase()] = {type: 'viewer'}
        try {
            opn(url)
            this.extension.logger.addLogMessage(`Open PDF viewer for ${pdfFile}`)
        } catch (e) {
            vscode.window.showInputBox({
                prompt: 'Unable to open browser. Please copy and visit this link.',
                value: url
            })
            this.extension.logger.addLogMessage(`Something bad happened when opening PDF viewer for ${pdfFile}: ${e}`)
        }
        this.extension.logger.displayStatus('repo', 'statusBar.foreground', `Open PDF viewer for ${path.basename(pdfFile)}.`)
    }

    openTab(sourceFile: string) {
        const url = this.checkViewer(sourceFile, 'tab')
        if (!url) {
            return
        }
        const pdfFile = this.extension.manager.tex2pdf(sourceFile)
        const client = this.clients[pdfFile.toLocaleUpperCase()]
        const uri = vscode.Uri.file(pdfFile).with({scheme: 'latex-workshop-pdf'})
        let column = vscode.ViewColumn.Two
        if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.viewColumn === vscode.ViewColumn.Two) {
            column = vscode.ViewColumn.Three
        }
        if (client !== undefined && client.ws !== undefined) {
            client.ws.close()
        }
        this.clients[pdfFile.toLocaleUpperCase()] = {type: 'tab'}
        vscode.commands.executeCommand('vscode.previewHtml', uri, column, path.basename(pdfFile))
        this.extension.logger.addLogMessage(`Open PDF tab for ${pdfFile}`)
        this.extension.logger.displayStatus('repo', 'statusBar.foreground', `Open PDF tab for ${path.basename(pdfFile)}.`)
    }

    handler(ws: WebSocket, msg: string) {
        const data = JSON.parse(msg)
        let client: Client | undefined
        switch (data.type) {
            case 'open':
                client = this.clients[decodeURIComponent(data.path).toLocaleUpperCase()]
                if (client !== undefined) {
                    client.ws = ws
                    if (client.type === undefined && client.prevType !== undefined) {
                        client.type = client.prevType
                    }
                }
                this.extension.locator.syncTeX()
                break
            case 'close':
                for (const key in this.clients) {
                    client = this.clients[key]
                    if (client !== undefined && client.ws === ws) {
                        client.prevType = client.type
                        delete client.ws
                        delete client.type
                    }
                }
                break
            case 'position':
                for (const key in this.clients) {
                    client = this.clients[key]
                    if (client !== undefined && client.ws === ws) {
                        client.position = data
                    }
                }
                this.extension.locator.syncTeX()
                break
            case 'loaded':
                client = this.clients[decodeURIComponent(data.path).toLocaleUpperCase()]
                if (client !== undefined && client.ws !== undefined) {
                    if (client.position !== undefined) {
                        client.ws.send(JSON.stringify(client.position))
                    } else {
                        const configuration = vscode.workspace.getConfiguration('latex-workshop')
                        client.ws.send(JSON.stringify({
                            type: 'params',
                            scale: configuration.get('view.pdf.zoom'),
                            hand: configuration.get('view.pdf.hand')
                        }))
                    }
                }
                this.extension.locator.syncTeX()
                break
            case 'click':
                this.extension.locator.locate(data, decodeURIComponent(data.path))
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
        if (client.ws !== undefined) {
            client.ws.send(JSON.stringify({type: 'synctex', data: record}))
            this.extension.logger.addLogMessage(`Try to synctex ${pdfFile}`)
        }
    }
}

export class PDFProvider implements vscode.TextDocumentContentProvider {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    public provideTextDocumentContent(uri: vscode.Uri) : string {
        const url = `http://${this.extension.server.address}/viewer.html?file=/pdf:${uri.authority ? `\\\\${uri.authority}` : ''}${encodeURIComponent(uri.fsPath)}`
        return `
            <!DOCTYPE html><html><head></head>
            <body><iframe class="preview-panel" src="${url}" style="position:absolute; border: none; left: 0; top: 0; width: 100%; height: 100%;">
            </iframe></body></html>
        `
    }
}
