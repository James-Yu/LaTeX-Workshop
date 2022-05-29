import * as vscode from 'vscode'
import type ws from 'ws'
import * as path from 'path'
import * as cs from 'cross-spawn'

import type {Extension} from '../main'
import type {SyncTeXRecordForward} from './locator'
import {openWebviewPanel} from '../utils/webview'
import {getCurrentThemeLightness} from '../utils/theme'

import type {ClientRequest, ServerResponse, PdfViewerState} from '../../types/latex-workshop-protocol-types/index'

import {Client} from './viewerlib/client'
import {PdfViewerPanel, PdfViewerPanelSerializer, PdfViewerPanelService} from './viewerlib/pdfviewerpanel'
import {PdfViewerManagerService} from './viewerlib/pdfviewermanager'
import {PdfViewerPagesLoaded} from './eventbus'
export {PdfViewerHookProvider} from './viewerlib/pdfviewerhook'


export class Viewer {
    private readonly extension: Extension
    readonly pdfViewerPanelSerializer: PdfViewerPanelSerializer
    private readonly panelService: PdfViewerPanelService
    private readonly managerService: PdfViewerManagerService

    constructor(extension: Extension) {
        this.extension = extension
        this.panelService = new PdfViewerPanelService(extension)
        this.managerService = new PdfViewerManagerService(extension)
        this.pdfViewerPanelSerializer = new PdfViewerPanelSerializer(extension, this.panelService, this.managerService)
    }

    private createClientSet(pdfFileUri: vscode.Uri): void {
        this.managerService.createClientSet(pdfFileUri)
    }

    /**
     * Returns the set of client instances of a PDF file.
     * Returns `undefined` if the viewer have not recieved any request for the PDF file.
     *
     * @param pdfFileUri The path of a PDF file.
     */
    getClientSet(pdfFileUri: vscode.Uri): Set<Client> | undefined {
        return this.managerService.getClientSet(pdfFileUri)
    }

    private getPanelSet(pdfFileUri: vscode.Uri): Set<PdfViewerPanel> | undefined {
        return this.managerService.getPanelSet(pdfFileUri)
    }

    private get clientMap(): Map<string, Set<Client>> {
        return this.managerService.clientMap
    }

    private initiatePdfViewerPanel(pdfPanel: PdfViewerPanel) {
        return this.managerService.initiatePdfViewerPanel(pdfPanel)
    }

    private findClient(pdfFileUri: vscode.Uri, websocket: ws): Client | undefined {
        return this.managerService.findClient(pdfFileUri, websocket)
    }

    private encodePathWithPrefix(pdfFileUri: vscode.Uri): string {
        return this.extension.server.pdfFilePathEncoder.encodePathWithPrefix(pdfFileUri)
    }

    /**
     * Refreshes PDF viewers of `sourceFile`.
     *
     * @param sourceFile The path of a LaTeX file. If `sourceFile` is `undefined`,
     * refreshes all the PDF viewers.
     */
    refreshExistingViewer(sourceFile?: string): void {
        this.extension.logger.addLogMessage(`Call refreshExistingViewer: ${JSON.stringify({sourceFile})}`)
        if (sourceFile === undefined) {
            this.clientMap.forEach(clientSet => {
                clientSet.forEach(client => {
                    client.send({type: 'refresh'})
                })
            })
            return
        }
        const pdfFile = this.tex2pdf(sourceFile, true)
        const clientSet = this.getClientSet(pdfFile)
        if (!clientSet) {
            this.extension.logger.addLogMessage(`Not found PDF viewers to refresh: ${pdfFile}`)
            return
        }
        this.extension.logger.addLogMessage(`Refresh PDF viewer: ${pdfFile}`)
        clientSet.forEach(client => {
            client.send({type: 'refresh'})
        })
    }

    private async checkViewer(sourceFile: string, respectOutDir: boolean = true): Promise<string | undefined> {
        const pdfFile = this.tex2pdf(sourceFile, respectOutDir)
        if (!await this.extension.lwfs.exists(pdfFile)) {
            this.extension.logger.addLogMessage(`Cannot find PDF file ${pdfFile}`)
            this.extension.logger.displayStatus('check', 'statusBar.foreground', `Cannot view file PDF file. File not found: ${pdfFile}`, 'warning')
            return
        }
        const url = `http://127.0.0.1:${this.extension.server.port}/viewer.html?file=${this.encodePathWithPrefix(pdfFile)}`
        return url
    }

    /**
     * Opens the PDF file of `sourceFile` in the browser.
     *
     * @param sourceFile The path of a LaTeX file.
     */
    async openBrowser(sourceFile: string): Promise<void> {
        const url = await this.checkViewer(sourceFile, true)
        if (!url) {
            return
        }
        const pdfFileUri = this.tex2pdf(sourceFile)
        this.createClientSet(pdfFileUri)
        this.extension.manager.watchPdfFile(pdfFileUri)
        try {
            this.extension.logger.addLogMessage(`Serving PDF file at ${url}`)
            await vscode.env.openExternal(vscode.Uri.parse(url, true))
            this.extension.logger.addLogMessage(`Open PDF viewer for ${pdfFileUri.toString(true)}`)
        } catch (e: unknown) {
            void vscode.window.showInputBox({
                prompt: 'Unable to open browser. Please copy and visit this link.',
                value: url
            })
            this.extension.logger.addLogMessage(`Something bad happened when opening PDF viewer for ${pdfFileUri.toString(true)}`)
            if (e instanceof Error) {
                this.extension.logger.logError(e)
            }
        }
    }

    private tex2pdf(sourceFile: string, respectOutDir?: boolean): vscode.Uri {
        const pdfFilePath = this.extension.manager.tex2pdf(sourceFile, respectOutDir)
        return vscode.Uri.file(pdfFilePath)
    }

    /**
     * Opens the PDF file of `sourceFile` in the internal PDF viewer.
     *
     * @param sourceFile The path of a LaTeX file.
     * @param respectOutDir
     * @param tabEditorGroup
     * @param preserveFocus
     */
    async openTab(sourceFile: string, respectOutDir: boolean, tabEditorGroup: string, preserveFocus = true): Promise<void> {
        const url = await this.checkViewer(sourceFile, respectOutDir)
        if (!url) {
            return
        }
        const pdfFile = this.tex2pdf(sourceFile, respectOutDir)
        return this.openPdfInTab(pdfFile, tabEditorGroup, preserveFocus)
    }

    async openPdfInTab(pdfFileUri: vscode.Uri, tabEditorGroup: string, preserveFocus = true): Promise<void> {
        const activeDocument = vscode.window.activeTextEditor?.document
        const panel = await this.createPdfViewerPanel(pdfFileUri, vscode.ViewColumn.Active)
        if (!panel) {
            return
        }
        if (activeDocument) {
            await openWebviewPanel(panel.webviewPanel, tabEditorGroup, activeDocument, preserveFocus)
        }
        this.extension.logger.addLogMessage(`Open PDF tab for ${pdfFileUri.toString(true)}`)
    }

    private async createPdfViewerPanel(pdfFileUri: vscode.Uri, viewColumn: vscode.ViewColumn): Promise<PdfViewerPanel> {
        const panel = await this.panelService.createPdfViewerPanel(pdfFileUri, viewColumn)
        this.initiatePdfViewerPanel(panel)
        return panel
    }

    /**
     * Opens the PDF file of `sourceFile` in the external PDF viewer.
     *
     * @param sourceFile The path of a LaTeX file.
     */
    openExternal(sourceFile: string): void {
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
        this.extension.logger.addLogMessage(`Open external viewer for ${pdfFile}`)
        this.extension.logger.logCommand('Execute the external PDF viewer command', command, args)
        const proc = cs.spawn(command, args, {cwd: path.dirname(sourceFile), detached: true})
        let stdout = ''
        proc.stdout.on('data', newStdout => {
            stdout += newStdout
        })
        let stderr = ''
        proc.stderr.on('data', newStderr => {
            stderr += newStderr
        })
        const cb = () => {
            void this.extension.logger.addLogMessage(`The external PDF viewer stdout: ${stdout}`)
            void this.extension.logger.addLogMessage(`The external PDF viewer stderr: ${stderr}`)
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
    handler(websocket: ws, msg: string): void {
        const data = JSON.parse(msg) as ClientRequest
        if (data.type !== 'ping') {
            this.extension.logger.addLogMessage(`Handle data type: ${data.type}`)
        }
        switch (data.type) {
            case 'open': {
                const pdfFileUri = vscode.Uri.parse(data.pdfFileUri, true)
                const clientSet = this.managerService.getClientSet(pdfFileUri)
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
            case 'request_params': {
                const pdfFileUri = vscode.Uri.parse(data.pdfFileUri, true)
                const client = this.findClient(pdfFileUri, websocket)
                if (client === undefined) {
                    break
                }
                const configuration = vscode.workspace.getConfiguration('latex-workshop')
                const invertType = configuration.get('view.pdf.invertMode.enabled') as string
                const invertEnabled = (invertType === 'auto' && (getCurrentThemeLightness() === 'dark')) ||
                invertType === 'always' ||
                (invertType === 'compat' && ((configuration.get('view.pdf.invert') as number) > 0))
                const pack: ServerResponse = {
                    type: 'params',
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
                            backgroundColor: configuration.get('view.pdf.color.light.backgroundColor', '#ffffff')
                        },
                        dark: {
                            pageColorsForeground: configuration.get('view.pdf.color.dark.pageColorsForeground') || 'CanvasText',
                            pageColorsBackground: configuration.get('view.pdf.color.dark.pageColorsBackground') || 'Canvas',
                            backgroundColor: configuration.get('view.pdf.color.dark.backgroundColor', '#ffffff')
                        }
                    },
                    keybindings: {
                        synctex: configuration.get('view.pdf.internal.synctex.keybinding') as 'ctrl-click' | 'double-click'
                    }
                }
                this.extension.logger.addLogMessage(`Sending the settings of the PDF viewer for initialization: ${JSON.stringify(pack)}`)
                client.send(pack)
                break
            }
            case 'loaded': {
                this.extension.eventBus.fire(PdfViewerPagesLoaded)
                const configuration = vscode.workspace.getConfiguration('latex-workshop')
                if (configuration.get('synctex.afterBuild.enabled') as boolean) {
                    this.extension.logger.addLogMessage('SyncTex after build invoked.')
                    const uri = vscode.Uri.parse(data.pdfFileUri, true)
                    this.extension.locator.syncTeX(undefined, undefined, uri.fsPath)
                }
                break
            }
            case 'reverse_synctex': {
                const uri = vscode.Uri.parse(data.pdfFileUri, true)
                void this.extension.locator.locate(data, uri.fsPath)
                break
            }
            case 'ping': {
                // nothing to do
                break
            }
            case 'add_log': {
                this.extension.logger.addLogMessage(`[PDF Viewer] ${data.message}`)
                break
            }
            default: {
                this.extension.logger.addLogMessage(`Unknown websocket message: ${msg}`)
                break
            }
        }
    }

    /**
     * Reveals the position of `record` on the internal PDF viewers.
     *
     * @param pdfFile The path of a PDF file.
     * @param record The position to be revealed.
     */
    syncTeX(pdfFile: string, record: SyncTeXRecordForward): void {
        const pdfFileUri = vscode.Uri.file(pdfFile)
        const clientSet = this.getClientSet(pdfFileUri)
        if (clientSet === undefined) {
            this.extension.logger.addLogMessage(`PDF is not viewed: ${pdfFile}`)
            return
        }
        const needDelay = this.revealWebviewPanel(pdfFileUri)
        for (const client of clientSet) {
            setTimeout(() => {
                client.send({type: 'synctex', data: record})
            }, needDelay ? 200 : 0)
            this.extension.logger.addLogMessage(`Try to synctex ${pdfFile}`)
        }
    }

    /**
     * Reveals the internal PDF viewer of `pdfFileUri`.
     * The first one is revealed.
     *
     * @param pdfFileUri The path of a PDF file.
     * @returns Returns `true` if `WebviewPanel.reveal` called.
     */
    private revealWebviewPanel(pdfFileUri: vscode.Uri): true | undefined {
        const panelSet = this.getPanelSet(pdfFileUri)
        if (!panelSet) {
            return
        }
        for (const panel of panelSet) {
            const isSyntexOn = !panel.state || panel.state.synctexEnabled
            if (panel.webviewPanel.visible && isSyntexOn) {
                return
            }
        }
        const activeViewColumn = vscode.window.activeTextEditor?.viewColumn
        for (const panel of panelSet) {
            if (panel.webviewPanel.viewColumn !== activeViewColumn) {
                const isSyntexOn = !panel.state || panel.state.synctexEnabled
                if (!panel.webviewPanel.visible && isSyntexOn) {
                    panel.webviewPanel.reveal(undefined, true)
                    return true
                }
                return
            }
        }
        return
    }

    /**
     * Returns the state of the internal PDF viewer of `pdfFilePath`.
     *
     * @param pdfFileUri The path of a PDF file.
     */
    getViewerState(pdfFileUri: vscode.Uri): (PdfViewerState | undefined)[] {
        const panelSet = this.getPanelSet(pdfFileUri)
        if (!panelSet) {
            return []
        }
        return Array.from(panelSet).map( e => e.state )
    }

}
