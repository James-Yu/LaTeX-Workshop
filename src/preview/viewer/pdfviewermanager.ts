import * as vscode from 'vscode'
import { lw } from '../../lw'
import { Client } from './client'
import type { PdfViewerPanel } from './pdfviewerpanel'

export {
    create,
    getClients,
    getPanels,
    insert
}

const webviewPanelMap = new Map<string, Set<PdfViewerPanel>>()
const clientMap = new Map<string, Set<Client>>()

function toKey(pdfUri: vscode.Uri): string {
    return pdfUri.toString(true).toLocaleUpperCase()
}

function create(pdfUri: vscode.Uri): void {
    const key = toKey(pdfUri)
    if (!clientMap.has(key)) {
        clientMap.set(key, new Set())
    }
    if (!webviewPanelMap.has(key)) {
        webviewPanelMap.set(key, new Set())
    }
}

/**
 * Returns the set of client instances of a PDF file.
 * Returns `undefined` if the viewer have not recieved any request for the PDF file.
 *
 * @param pdfUri The path of a PDF file.
 */
function getClients(pdfUri?: vscode.Uri): Set<Client> | undefined {
    if (pdfUri) {
        return clientMap.get(toKey(pdfUri))
    } else {
        const clients = new Set<Client>()
        clientMap.forEach(clientSet => clientSet.forEach(client => clients.add(client)))
        return clients
    }
}

function getPanels(pdfUri: vscode.Uri): Set<PdfViewerPanel> | undefined {
    return webviewPanelMap.get(toKey(pdfUri))
}

function insert(pdfPanel: PdfViewerPanel): PdfViewerPanel | undefined {
    const pdfUri = pdfPanel.pdfUri
    lw.watcher.pdf.add(pdfUri.fsPath)
    create(pdfUri)
    const panelSet = getPanels(pdfUri)
    if (!panelSet) {
        return
    }
    panelSet.add(pdfPanel)
    pdfPanel.webviewPanel.onDidDispose(() => {
        panelSet.delete(pdfPanel)
    })
    return pdfPanel
}
