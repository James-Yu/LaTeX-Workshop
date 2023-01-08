import * as vscode from 'vscode'
import type ws from 'ws'
import * as lw from '../../lw'
import type {Client} from './client'
import type {PdfViewerPanel} from './pdfviewerpanel'


export class PdfViewerManagerService {
    private static readonly webviewPanelMap = new Map<string, Set<PdfViewerPanel>>()
    static readonly clientMap = new Map<string, Set<Client>>()

    private static toKey(pdfFileUri: vscode.Uri): string {
        return pdfFileUri.toString(true).toLocaleUpperCase()
    }

    static createClientSet(pdfFileUri: vscode.Uri): void {
        const key = PdfViewerManagerService.toKey(pdfFileUri)
        if (!PdfViewerManagerService.clientMap.has(key)) {
            PdfViewerManagerService.clientMap.set(key, new Set())
        }
        if (!PdfViewerManagerService.webviewPanelMap.has(key)) {
            PdfViewerManagerService.webviewPanelMap.set(key, new Set())
        }
    }

    /**
     * Returns the set of client instances of a PDF file.
     * Returns `undefined` if the viewer have not recieved any request for the PDF file.
     *
     * @param pdfFileUri The path of a PDF file.
     */
    static getClientSet(pdfFileUri: vscode.Uri): Set<Client> | undefined {
        return PdfViewerManagerService.clientMap.get(PdfViewerManagerService.toKey(pdfFileUri))
    }

    static getPanelSet(pdfFileUri: vscode.Uri): Set<PdfViewerPanel> | undefined {
        return PdfViewerManagerService.webviewPanelMap.get(PdfViewerManagerService.toKey(pdfFileUri))
    }

    static findClient(pdfFileUri: vscode.Uri, websocket: ws): Client | undefined {
        const clientSet = PdfViewerManagerService.getClientSet(pdfFileUri)
        if (clientSet === undefined) {
            return
        }
        for (const client of clientSet) {
            if (client.websocket === websocket) {
                return client
            }
        }
        return
    }

    static initiatePdfViewerPanel(pdfPanel: PdfViewerPanel): PdfViewerPanel | undefined {
        const pdfFileUri = pdfPanel.pdfFileUri
        lw.cacher.watchPdfFile(pdfFileUri)
        PdfViewerManagerService.createClientSet(pdfFileUri)
        const panelSet = PdfViewerManagerService.getPanelSet(pdfFileUri)
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
