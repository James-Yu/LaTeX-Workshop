import * as vscode from 'vscode'
import type ws from 'ws'
import * as path from 'path'
import * as os from 'os'
import * as cs from 'cross-spawn'
import { lw } from '../lw'
import type { SyncTeXRecordToPDF, SyncTeXRecordToPDFAll, ViewerMode } from '../types'
import * as manager from './viewer/pdfviewermanager'
import { populate } from './viewer/pdfviewerpanel'

import type { ClientRequest, PdfViewerParams, PdfViewerState } from '../../types/latex-workshop-protocol-types/index'
import { Client } from './viewer/client'

import { moveActiveEditor } from '../utils/webview'

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

lw.watcher.pdf.onChange(pdfPath => {
    if (lw.compile.compiledPDFWriting === 0 || path.relative(lw.compile.compiledPDFPath, pdfPath) !== '') {
        refresh(pdfPath)
    }
})
lw.onConfigChange(['view.pdf.invert', 'view.pdf.invertMode', 'view.pdf.color', 'view.pdf.internal'], () => {
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
function refresh(pdfFile?: string): void {
    logger.log(`Call refreshExistingViewer: ${JSON.stringify(pdfFile)} .`)
    const pdfUri = pdfFile ? vscode.Uri.file(pdfFile) : undefined
    if (pdfUri === undefined) {
        manager.getClients()?.forEach(client => {
            client.send({type: 'refresh'})
        })
        return
    }
    const clientSet = manager.getClients(pdfUri)
    if (!clientSet) {
        logger.log(`Not found PDF viewers to refresh: ${pdfFile}`)
        return
    }
    logger.log(`Refresh PDF viewer: ${pdfFile}`)
    clientSet.forEach(client => {
        client.send({type: 'refresh'})
    })
}

async function getUrl(pdfFile: string): Promise<string | undefined> {
    const pdfUri = vscode.Uri.file(pdfFile)
    if (!await lw.file.exists(pdfUri)) {
        logger.log(`Cannot find PDF file ${pdfUri}`)
        logger.refreshStatus('check', 'statusBar.foreground', `Cannot view file PDF file. File not found: ${pdfUri}`, 'warning')
        return
    }
    return (await lw.server.getUrl(pdfUri)).url
}

async function view(pdfFile: string, mode?: 'tab' | 'browser' | 'external'): Promise<void> {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const tabEditorGroup = configuration.get('view.pdf.tab.editorGroup') as string
    let viewerMode: ViewerMode = mode ?? configuration.get<ViewerMode>('view.pdf.viewer', 'tab')
    if (mode === 'tab' && configuration.get<ViewerMode>('view.pdf.viewer', 'tab') === 'legacy') {
        viewerMode = 'legacy'
    }
    if (viewerMode === 'browser') {
        return viewInBrowser(pdfFile)
    } else if (viewerMode === 'tab') {
        return viewInCustomEditor(pdfFile)
    } else if (viewerMode === 'legacy' || viewerMode === 'singleton') {
        return viewInTab(pdfFile, tabEditorGroup, true)
    } else if (viewerMode === 'external') {
        return viewInExternal(pdfFile)
    } else {
        return viewInCustomEditor(pdfFile)
    }
}

/**
 * Opens the PDF file in the browser.
 *
 * @param pdfFile The path of a PDF file.
 */
async function viewInBrowser(pdfFile: string): Promise<void> {
    const url = await getUrl(pdfFile)
    if (!url) {
        return
    }
    const pdfUri = vscode.Uri.file(pdfFile)
    manager.create(pdfUri)
    lw.watcher.pdf.add(pdfUri.fsPath)
    try {
        logger.log(`Serving PDF file at ${url}`)
        await vscode.env.openExternal(vscode.Uri.parse(url, true))
        logger.log(`Open PDF viewer for ${pdfUri.toString(true)}`)
    } catch (e: unknown) {
        void vscode.window.showInputBox({
            prompt: 'Unable to open browser. Please copy and visit this link.',
            value: url
        })
        logger.logError(`Failed opening PDF viewer for ${pdfUri.toString(true)}`, e)
    }
}

/**
 * Opens the PDF file in the internal PDF viewer.
 *
 * @param pdfFile The path of a PDF file.
 * @param tabEditorGroup
 * @param preserveFocus
 */
async function viewInTab(pdfFile: string, tabEditorGroup: string, preserveFocus: boolean): Promise<void> {
    const url = await getUrl(pdfFile)
    if (!url) {
        return
    }
    const pdfUri = vscode.Uri.file(pdfFile)
    return viewInWebviewPanel(pdfUri, tabEditorGroup, preserveFocus)
}

async function viewInCustomEditor(pdfFile: string): Promise<void> {
    const url = await getUrl(pdfFile)
    if (!url) {
        return
    }
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const editorGroup = configuration.get('view.pdf.tab.editorGroup') as string
    const pdfUri = vscode.Uri.file(pdfFile)
    const showOptions: vscode.TextDocumentShowOptions = {
        viewColumn: vscode.ViewColumn.Active,
        preserveFocus: true
    }
    if (editorGroup === 'left') {
        const currentColumn = vscode.window.activeTextEditor?.viewColumn
        if (currentColumn && currentColumn > 1) {
            showOptions.viewColumn = currentColumn - 1
            await vscode.commands.executeCommand('vscode.openWith', pdfUri, 'latex-workshop-pdf-hook', showOptions)
            await vscode.commands.executeCommand('workbench.action.focusRightGroup')
        } else {
            await vscode.commands.executeCommand('vscode.openWith', pdfUri, 'latex-workshop-pdf-hook', showOptions)
            if (currentColumn === vscode.ViewColumn.One) {
                await moveActiveEditor('left', true)
            } else {
                await vscode.commands.executeCommand('workbench.action.focusRightGroup')
            }
        }
    } else if (editorGroup === 'right') {
        const currentColumn = vscode.window.activeTextEditor?.viewColumn
        showOptions.viewColumn = (currentColumn ?? 0) + 1
        await vscode.commands.executeCommand('vscode.openWith', pdfUri, 'latex-workshop-pdf-hook', showOptions)
        await vscode.commands.executeCommand('workbench.action.focusLeftGroup')
    } else {
        await vscode.commands.executeCommand('vscode.openWith', pdfUri, 'latex-workshop-pdf-hook', showOptions)
        await moveActiveEditor(editorGroup, true)
    }
    logger.log(`Open PDF tab for ${pdfUri.toString(true)}`)
}

async function viewInWebviewPanel(pdfUri: vscode.Uri, tabEditorGroup: string, preserveFocus: boolean): Promise<void> {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const singleton = configuration.get<ViewerMode>('view.pdf.viewer', 'tab') === 'singleton'
    if (singleton) {
        const panels = manager.getPanels(pdfUri)
        if (panels && panels.size > 0) {
            panels.forEach(panel => panel.webviewPanel.reveal(undefined, true))
            logger.log(`Reveal the existing PDF tab for ${pdfUri.toString(true)}`)
            return
        }
    }
    const activeDocument = vscode.window.activeTextEditor?.document
    const webviewPanel = vscode.window.createWebviewPanel('latex-workshop-pdf', path.basename(pdfUri.path), {
        viewColumn: vscode.ViewColumn.Active,
        preserveFocus: tabEditorGroup === 'current'
    }, {
        enableScripts: true,
        retainContextWhenHidden: true
    })
    const viewerPanel = await populate(pdfUri, webviewPanel)
    manager.insert(viewerPanel)
    if (!viewerPanel) {
        return
    }
    if (tabEditorGroup !== 'current' && activeDocument) {
        await moveActiveEditor(tabEditorGroup, preserveFocus)
    }
    logger.log(`Open PDF tab for ${pdfUri.toString(true)}`)
}

/**
 * Opens the PDF file of in the external PDF viewer.
 *
 * @param pdfFile The path of a PDF file.
 */
function viewInExternal(pdfFile: string): void {
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
    logger.log(`Open external viewer for ${pdfFile}`)
    logger.logCommand('Execute the external PDF viewer command', command, args)
    const proc = cs.spawn(command, args, {cwd: path.dirname(pdfFile), detached: true})
    let stdout = ''
    proc.stdout.on('data', newStdout => {
        stdout += newStdout
    })
    let stderr = ''
    proc.stderr.on('data', newStderr => {
        stderr += newStderr
    })
    const cb = () => {
        void logger.log(`The external PDF viewer stdout: ${stdout}`)
        void logger.log(`The external PDF viewer stderr: ${stderr}`)
    }
    proc.on('error', cb)
    proc.on('exit', cb)
}

/**
 * Handles the request from the internal PDF viewer.
 *
 * @param websocket The WebSocket connecting with the viewer.
 * @param msg A message from the viewer in JSON fromat.
 */
function handler(websocket: ws, msg: string): void {
    const data = JSON.parse(msg) as ClientRequest
    if (data.type !== 'ping') {
        logger.log(`Handle data type: ${data.type}`)
    }
    switch (data.type) {
        case 'open': {
            const pdfUri = vscode.Uri.parse(data.pdfFileUri, true)
            const clientSet = manager.getClients(pdfUri)
            if (clientSet === undefined) {
                break
            }
            const client = new Client(data.viewer, websocket)
            clientSet.add(client)
            client.onDidDispose(() => {
                clientSet.delete(client)
            })
            break
        }
        case 'loaded': {
            lw.event.fire(lw.event.ViewerPageLoaded)
            const configuration = vscode.workspace.getConfiguration('latex-workshop')
            if (configuration.get('synctex.afterBuild.enabled') as boolean) {
                logger.log('SyncTex after build invoked.')
                const uri = vscode.Uri.parse(data.pdfFileUri, true)
                lw.locate.synctex.toPDF(undefined, undefined, uri.fsPath)
            }
            break
        }
        case 'reverse_synctex': {
            const uri = vscode.Uri.parse(data.pdfFileUri, true)
            void lw.locate.synctex.toTeX(data, uri.fsPath)
            break
        }
        case 'external_link': {
            void vscode.env.clipboard.writeText(data.url)
            const uri = vscode.Uri.parse(data.url)
            if (['http', 'https'].includes(uri.scheme)) {
                void vscode.env.openExternal(uri)
            } else {
                vscode.window.showInformationMessage(`The link ${data.url} has been copied to clipboard.`, 'Open link', 'Dismiss').then(
                    option => {
                        switch (option) {
                            case 'Open link':
                                void vscode.env.openExternal(uri)
                                break
                            default:
                                break
                        }
                    },
                    reason => {
                        logger.log(`Unknown error when opening URI. Error: ${JSON.stringify(reason)}, URI: ${data.url}`)
                    })
            }
            break
        }
        case 'ping': {
            // nothing to do
            break
        }
        case 'add_log': {
            logger.log(`${data.message}`)
            break
        }
        case 'copy': {
            if ((data.isMetaKey && os.platform() === 'darwin') ||
                (!data.isMetaKey && os.platform() !== 'darwin')) {
                void vscode.env.clipboard.writeText(data.content as string)
            }
            break
        }
        default: {
            logger.log(`Unknown websocket message: ${msg}`)
            break
        }
    }
}

function getParams(): PdfViewerParams {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const invertType = configuration.get('view.pdf.invertMode.enabled') as string
    const invertEnabled = (invertType === 'auto' && vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark) ||
    invertType === 'always' ||
    (invertType === 'compat' && ((configuration.get('view.pdf.invert') as number) > 0))
    const pack: PdfViewerParams = {
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
                pageColorsForeground: configuration.get('view.pdf.color.light.pageColorsForeground') || 'CanvasText',
                pageColorsBackground: configuration.get('view.pdf.color.light.pageColorsBackground') || 'Canvas',
                backgroundColor: configuration.get('view.pdf.color.light.backgroundColor', '#ffffff'),
                pageBorderColor: configuration.get('view.pdf.color.light.pageBorderColor', 'lightgrey')
            },
            dark: {
                pageColorsForeground: configuration.get('view.pdf.color.dark.pageColorsForeground') || 'CanvasText',
                pageColorsBackground: configuration.get('view.pdf.color.dark.pageColorsBackground') || 'Canvas',
                backgroundColor: configuration.get('view.pdf.color.dark.backgroundColor', '#ffffff'),
                pageBorderColor: configuration.get('view.pdf.color.dark.pageBorderColor', 'lightgrey')
            }
        },
        codeColorTheme: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light ? 'light' : 'dark',
        keybindings: {
            synctex: configuration.get('view.pdf.internal.synctex.keybinding') as 'ctrl-click' | 'double-click'
        }
    }
    return pack
}

/**
 * Reveals the position of `record` on the internal PDF viewers.
 *
 * @param pdfFile The path of a PDF file.
 * @param record The position to be revealed.
 */
async function locate(pdfFile: string, record: SyncTeXRecordToPDF | SyncTeXRecordToPDFAll[]): Promise<void> {
    const pdfUri = vscode.Uri.file(pdfFile)
    let clientSet = manager.getClients(pdfUri)
    if (clientSet === undefined || clientSet.size === 0) {
        logger.log(`PDF is not opened: ${pdfFile} , try opening.`)
        await view(pdfFile)
        clientSet = manager.getClients(pdfUri)
    }
    if (clientSet === undefined || clientSet.size === 0) {
        logger.log(`PDF cannot be opened: ${pdfFile} .`)
        return
    }
    const needDelay = showInvisibleWebviewPanel(pdfUri)
    for (const client of clientSet) {
        setTimeout(() => {
            client.send({type: 'synctex', data: record})
        }, needDelay ? 200 : 0)
        logger.log(`Try to synctex ${pdfFile}`)
    }
}

/**
 * Reveals the internal PDF viewer of `pdfUri`.
 * The first one is revealed.
 *
 * @param pdfUri The path of a PDF file.
 * @returns Returns `true` if `WebviewPanel.reveal` called.
 */
function showInvisibleWebviewPanel(pdfUri: vscode.Uri): boolean {
    const panelSet = manager.getPanels(pdfUri)
    if (!panelSet) {
        return false
    }
    const activeViewColumn = vscode.window.activeTextEditor?.viewColumn
    for (const panel of panelSet) {
        const isSyntexOn = !panel.state || panel.state.synctexEnabled
        if (panel.webviewPanel.viewColumn !== activeViewColumn
            && !panel.webviewPanel.visible
            && isSyntexOn) {
            panel.webviewPanel.reveal(panel.webviewPanel.viewColumn, true)
            return true
        }
        if (panel.webviewPanel.visible && isSyntexOn) {
            return false
        }
        if (panel.webviewPanel.viewColumn !== activeViewColumn) {
            return false
        }
    }
    return false
}

/**
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
