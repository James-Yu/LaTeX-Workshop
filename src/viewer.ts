import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as open from 'open'

import {Extension} from './main'

export class Viewer {
    extension: Extension
    clients = {}
    positions = {}

    constructor(extension: Extension) {
        this.extension = extension
    }

    refreshExistingViewer(sourceFile: string, type: string | undefined = undefined) : boolean {
        const pdfFile = this.extension.manager.tex2pdf(sourceFile)
        if (pdfFile in this.clients &&
            (type === undefined || this.clients[pdfFile].type === type) &&
            'ws' in this.clients[pdfFile]) {
            this.extension.logger.addLogMessage(`Refresh PDF viewer for ${pdfFile}`)
            this.clients[pdfFile].ws.send(JSON.stringify({type: "refresh"}))
            return true
        }
        this.extension.logger.addLogMessage(`No PDF viewer connected for ${pdfFile}`)
        return false
    }

    checkViewer(sourceFile: string, type: string) : string |undefined {
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
        const url = `http://${this.extension.server.address}/viewer.html?file=\\pdf:${encodeURIComponent(pdfFile)}`
        this.extension.logger.addLogMessage(`Serving PDF file at ${url}`)
        return url
    }

    openViewer(sourceFile: string) {
        const url = this.checkViewer(sourceFile, 'viewer')
        if (!url) {
            return
        }
        const pdfFile = this.extension.manager.tex2pdf(sourceFile)
        if (pdfFile in this.clients && 'ws' in this.clients[pdfFile]) {
            this.clients[pdfFile].ws.close()
        }
        this.clients[pdfFile] = {type: 'viewer'}
        open(url)
        this.extension.logger.addLogMessage(`Open PDF viewer for ${pdfFile}`)
        this.extension.logger.displayStatus('repo', 'white', `Open PDF viewer for ${path.basename(pdfFile)}.`)
    }

    openTab(sourceFile: string) {
        const url = this.checkViewer(sourceFile, 'tab')
        if (!url) {
            return
        }
        const pdfFile = this.extension.manager.tex2pdf(sourceFile)
        const uri = vscode.Uri.file(pdfFile).with({scheme: 'latex-workshop-pdf'})
        let column = vscode.ViewColumn.Two
        if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.viewColumn === vscode.ViewColumn.Two) {
            column = vscode.ViewColumn.Three
        }
        if (pdfFile in this.clients && 'ws' in this.clients[pdfFile]) {
            this.clients[pdfFile].ws.close()
        }
        this.clients[pdfFile] = {type: 'tab'}
        vscode.commands.executeCommand("vscode.previewHtml", uri, column, path.basename(pdfFile))
        this.extension.logger.addLogMessage(`Open PDF tab for ${pdfFile}`)
        this.extension.logger.displayStatus('repo', 'white', `Open PDF tab for ${path.basename(pdfFile)}.`)
    }

    handler(ws: object, msg: string) {
        const data = JSON.parse(msg)
        switch (data.type) {
            case 'open':
                this.clients[decodeURIComponent(data.path)]['ws'] = ws
                break
            case 'close':
                for (const key in this.clients) {
                    if (this.clients[key].ws === ws) {
                        delete this.clients[key].ws
                        delete this.clients[key].type
                    }
                }
                break
            case 'position':
                for (const key in this.clients) {
                    if (this.clients[key].ws === ws) {
                        this.clients[key].position = data
                    }
                }
                break
            case 'loaded':
                const pdfFile = decodeURIComponent(data.path)
                if (pdfFile in this.clients && 'position' in this.clients[pdfFile]) {
                    this.clients[pdfFile].ws.send(JSON.stringify(this.clients[pdfFile].position))
                }
                break
            case 'click':
                this.extension.locator.locate(data, decodeURIComponent(data.path))
                break
            default:
                this.extension.logger.addLogMessage(`Unknown websocket message: ${msg}`)
                break
        }
    }

    syncTeX(pdfFile: string, record: object) {
        if (!(pdfFile in this.clients)) {
            this.extension.logger.addLogMessage(`PDF is not viewed: ${pdfFile}`)
            return
        }
        this.clients[pdfFile].ws.send(JSON.stringify({type: "synctex", data: record}))
        this.extension.logger.addLogMessage(`Try to synctex ${pdfFile}`)
    }
}

export class PDFProvider implements vscode.TextDocumentContentProvider {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    public provideTextDocumentContent(uri: vscode.Uri): string {
        const url = `http://${this.extension.server.address}/viewer.html?file=\\pdf:${encodeURIComponent(uri.fsPath)}`
        return `
            <!DOCTYPE html style="position:absolute; left: 0; top: 0; width: 100%; height: 100%;"><html><head></head>
            <body style="position:absolute; left: 0; top: 0; width: 100%; height: 100%;">
            <iframe class="preview-panel" src="${url}" style="position:absolute; border: none; left: 0; top: 0; width: 100%; height: 100%;">
            </iframe></body></html>
        `
    }
}
