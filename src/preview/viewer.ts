import * as vscode from 'vscode'
import ws from 'ws'
import * as path from 'path'
import { lw } from '../lw'
import type { SyncTeXRecordToPDF, SyncTeXRecordToPDFAll } from '../types'
import * as manager from './viewer/pdfviewermanager'
import type { PdfViewerParams, PdfViewerState } from '../../types/latex-workshop-protocol-types/index'

const logger = lw.log('Viewer')

export {
    getParams,
    getViewerState,
    handler,
    isViewing,
    locate,
    viewInWebviewPanel,
    refresh,
    view
}
export { serializer } from './viewer/pdfviewerpanel'
export { hook } from './viewer/pdfviewerhook'

lw.watcher.pdf.onChange(pdfUri => {
    if (lw.compile.compiledPDFWriting === 0 || path.relative(lw.compile.compiledPDFPath, pdfUri.fsPath) !== '') {
        refresh(pdfUri)
    }
})
lw.onConfigChange(['view.pdf.toolbar.hide.timeout', 'view.pdf.invert', 'view.pdf.invertMode', 'view.pdf.color', 'view.pdf.internal', 'view.pdf.reload.transition'], () => {
    reload()
})

const isViewing = (fileUri: vscode.Uri) => manager.getClients(fileUri) !== undefined

function reload(): void {
    manager.getClients()?.forEach(client => {
        client.send({type: 'reload'})
    })
}

/**
 * Refreshes PDF viewers of `pdfFile`.
 *
 * @param pdfFile The path of a PDF file. If `pdfFile` is `undefined`,
 * refreshes all the PDF viewers.
 */
function refresh(pdfUri?: vscode.Uri): void {
    logger.log(`Ignoring PDF refresh request because preview is disabled: ${pdfUri ?? 'undefined'} .`)
}

function view(pdfUri: vscode.Uri, mode?: 'tab' | 'browser' | 'external'): Promise<void> {
    void pdfUri
    void mode
    void vscode.window.showWarningMessage('PDF preview is disabled in this secure build.')
    return Promise.resolve()
}

function viewInWebviewPanel(pdfUri: vscode.Uri, tabEditorGroup: string, preserveFocus: boolean): Promise<void> {
    void pdfUri
    void tabEditorGroup
    void preserveFocus
    void vscode.window.showWarningMessage('PDF preview is disabled in this secure build.')
    return Promise.resolve()
}

/**
 * Handles the request from the internal PDF viewer.
 *
 * @param websocket The WebSocket connecting with the viewer.
 * @param msg A message from the viewer in JSON fromat.
 */
function handler(websocket: ws, msg: string): void {
    void websocket
    void msg
    logger.log('Ignoring viewer websocket message because preview is disabled.')
}

function getParams(): PdfViewerParams {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const invertType = configuration.get('view.pdf.invertMode.enabled') as string
    const invertEnabled =
        (invertType === 'auto' && vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark) ||
        invertType === 'always' ||
        (invertType === 'compat' && (configuration.get('view.pdf.invert') as number) > 0)
    const pack: PdfViewerParams = {
        toolbar: configuration.get('view.pdf.toolbar.hide.timeout') as number,
        sidebar: {
            open: configuration.get('view.pdf.sidebar.open') as 'off' | 'on' | 'persist',
            view: configuration.get('view.pdf.sidebar.view') as 'thumbnails' | 'outline' | 'attachments' | 'layers' | 'persist',
        },
        scale: configuration.get('view.pdf.zoom') as string,
        trim: configuration.get('view.pdf.trim') as number,
        scrollMode: configuration.get('view.pdf.scrollMode') as number,
        spreadMode: configuration.get('view.pdf.spreadMode') as number,
        hand: configuration.get('view.pdf.hand') as boolean,
        invertMode: {
            enabled: invertEnabled,
            brightness: configuration.get('view.pdf.invertMode.brightness') as number,
            grayscale: configuration.get('view.pdf.invertMode.grayscale') as number,
            hueRotate: configuration.get('view.pdf.invertMode.hueRotate') as number,
            invert: configuration.get('view.pdf.invert') as number,
            sepia: configuration.get('view.pdf.invertMode.sepia') as number,
        },
        color: {
            light: {
                pageColorsForeground: configuration.get('view.pdf.color.light.pageColorsForeground') || '',
                pageColorsBackground: configuration.get('view.pdf.color.light.pageColorsBackground') || '',
                backgroundColor: configuration.get('view.pdf.color.light.backgroundColor', '#ffffff'),
                pageBorderColor: configuration.get('view.pdf.color.light.pageBorderColor', 'lightgrey'),
            },
            dark: {
                pageColorsForeground: configuration.get('view.pdf.color.dark.pageColorsForeground') || '',
                pageColorsBackground: configuration.get('view.pdf.color.dark.pageColorsBackground') || '',
                backgroundColor: configuration.get('view.pdf.color.dark.backgroundColor', '#ffffff'),
                pageBorderColor: configuration.get('view.pdf.color.dark.pageBorderColor', 'lightgrey'),
            },
        },
        codeColorTheme: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light ? 'light' : 'dark',
        keybindings: {
            synctex: configuration.get('view.pdf.internal.synctex.keybinding') as 'ctrl-click' | 'double-click',
        },
        reloadTransition: configuration.get('view.pdf.reload.transition') as 'none' | 'fade',
    }
    return pack
}

/**
 * Reveals the position of `record` on the internal PDF viewers.
 *
 * @param pdfUri The path of a PDF file.
 * @param record The position to be revealed.
 */
function locate(pdfUri: vscode.Uri, record: SyncTeXRecordToPDF | SyncTeXRecordToPDFAll[]): Promise<void> {
    void pdfUri
    void record
    logger.log('Ignoring SyncTeX locate request because preview is disabled.')
    return Promise.resolve()
}

/**
 * !! Test only
 * Returns the state of the internal PDF viewer of `pdfFilePath`.
 *
 * @param pdfUri The path of a PDF file.
 */
function getViewerState(pdfUri: vscode.Uri): (PdfViewerState | undefined)[] {
    const panelSet = manager.getPanels(pdfUri)
    if (!panelSet) {
        return []
    }
    return Array.from(panelSet).map( e => e.state )
}
