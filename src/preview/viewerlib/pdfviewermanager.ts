import * as vscode from 'vscode'
import type { Client } from './client'
import type { PdfViewerPanel } from './pdfviewerpanel'
import { extension } from '../../extension'

class PdfViewerManager {
    private readonly webviewPanelMap = new Map<string, Set<PdfViewerPanel>>()
    readonly clientMap = new Map<string, Set<Client>>()

    private toKey(pdfFileUri: vscode.Uri): string {
        return pdfFileUri.toString(true).toLocaleUpperCase()
    }

    createClientSet(pdfFileUri: vscode.Uri): void {
        const key = this.toKey(pdfFileUri)
        if (!this.clientMap.has(key)) {
            this.clientMap.set(key, new Set())
        }
        if (!this.webviewPanelMap.has(key)) {
            this.webviewPanelMap.set(key, new Set())
        }
    }

    /**
     * Returns the set of client instances of a PDF file.
     * Returns `undefined` if the viewer have not recieved any request for the PDF file.
     *
     * @param pdfFileUri The path of a PDF file.
     */
    getClientSet(pdfFileUri: vscode.Uri): Set<Client> | undefined {
        return this.clientMap.get(this.toKey(pdfFileUri))
    }

    getPanelSet(pdfFileUri: vscode.Uri): Set<PdfViewerPanel> | undefined {
        return this.webviewPanelMap.get(this.toKey(pdfFileUri))
    }

    // findClient(pdfFileUri: vscode.Uri, websocket: ws): Client | undefined {
    //     const clientSet = this.getClientSet(pdfFileUri)
    //     if (clientSet === undefined) {
    //         return
    //     }
    //     for (const client of clientSet) {
    //         if (client.websocket === websocket) {
    //             return client
    //         }
    //     }
    //     return
    // }

    initiatePdfViewerPanel(pdfPanel: PdfViewerPanel): PdfViewerPanel | undefined {
        const pdfFileUri = pdfPanel.pdfFileUri
        extension.watcher.pdf.add(pdfFileUri.fsPath)
        this.createClientSet(pdfFileUri)
        const panelSet = this.getPanelSet(pdfFileUri)
        if (!panelSet) {
            return
        }
        panelSet.add(pdfPanel)
        pdfPanel.webviewPanel.onDidDispose(() => {
            panelSet.delete(pdfPanel)
        })
        return pdfPanel
    }
}

export const viewerManager = new PdfViewerManager()
