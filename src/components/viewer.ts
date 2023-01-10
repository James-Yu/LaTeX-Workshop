import * as vscode from 'vscode'
import type ws from 'ws'
import * as path from 'path'
import * as os from 'os'
import * as cs from 'cross-spawn'
import * as lw from '../lw'
import type { SyncTeXRecordForward } from './locator'
import { getCurrentThemeLightness } from '../utils/theme'
import type { ClientRequest, PdfViewerParams, PdfViewerState } from '../../types/latex-workshop-protocol-types/index'
import { Client } from './viewerlib/client'
import { PdfViewerPanelSerializer, PdfViewerPanelService } from './viewerlib/pdfviewerpanel'
import { PdfViewerManagerService } from './viewerlib/pdfviewermanager'
import { ViewerPageLoaded } from './eventbus'
import { getLogger } from './logger'
import { PdfFilePathEncoder } from './serverlib/encodepath'
import { moveActiveEditor } from '../utils/webview'

const logger = getLogger('Viewer')

export { PdfViewerHookProvider } from './viewerlib/pdfviewerhook'

export class Viewer {
    readonly pdfViewerPanelSerializer: PdfViewerPanelSerializer = new PdfViewerPanelSerializer()

    /**
     * Refreshes PDF viewers of `sourceFile`.
     *
     * @param sourceFile The path of a LaTeX file. If `sourceFile` is `undefined`,
     * refreshes all the PDF viewers.
     */
    refreshExistingViewer(sourceFile?: string, pdfFile?: string): void {
        logger.log(`Call refreshExistingViewer: ${JSON.stringify({sourceFile})}`)
        const pdfUri = pdfFile ? vscode.Uri.file(pdfFile) : (sourceFile ? this.tex2pdf(sourceFile, true) : undefined)
        if (pdfUri === undefined) {
            PdfViewerManagerService.clientMap.forEach(clientSet => {
                clientSet.forEach(client => {
                    client.send({type: 'refresh'})
                })
            })
            return
        }
        const clientSet = PdfViewerManagerService.getClientSet(pdfUri)
        if (!clientSet) {
            logger.log(`Not found PDF viewers to refresh: ${pdfFile}`)
            return
        }
        logger.log(`Refresh PDF viewer: ${pdfFile}`)
        clientSet.forEach(client => {
            client.send({type: 'refresh'})
        })
    }

    private async checkViewer(sourceFile: string, respectOutDir: boolean = true): Promise<string | undefined> {
        const pdfFile = this.tex2pdf(sourceFile, respectOutDir)
        if (!await lw.lwfs.exists(pdfFile)) {
            logger.log(`Cannot find PDF file ${pdfFile}`)
            logger.refreshStatus('check', 'statusBar.foreground', `Cannot view file PDF file. File not found: ${pdfFile}`, 'warning')
            return
        }
        const baseUri = await vscode.env.asExternalUri(vscode.Uri.parse(`http://127.0.0.1:${lw.server.port}`, true))
        const url = `${baseUri}/viewer.html?file=${PdfFilePathEncoder.encodePathWithPrefix(pdfFile)}`
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
        PdfViewerManagerService.createClientSet(pdfFileUri)
        lw.cacher.watchPdfFile(pdfFileUri)
        try {
            logger.log(`Serving PDF file at ${url}`)
            await vscode.env.openExternal(vscode.Uri.parse(url, true))
            logger.log(`Open PDF viewer for ${pdfFileUri.toString(true)}`)
        } catch (e: unknown) {
            void vscode.window.showInputBox({
                prompt: 'Unable to open browser. Please copy and visit this link.',
                value: url
            })
            logger.logError(`Failed opening PDF viewer for ${pdfFileUri.toString(true)}`, e)
        }
    }

    private tex2pdf(sourceFile: string, respectOutDir?: boolean): vscode.Uri {
        const pdfFilePath = lw.manager.tex2pdf(sourceFile, respectOutDir)
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
        if (tabEditorGroup === 'right') {
            await vscode.commands.executeCommand('vscode.openWith', pdfFileUri, 'latex-workshop-pdf-hook', vscode.ViewColumn.Beside)
            if (preserveFocus) {
                await vscode.commands.executeCommand('workbench.action.focusLeftGroup')
            }
        } else {
            await vscode.commands.executeCommand('vscode.openWith', pdfFileUri, 'latex-workshop-pdf-hook', vscode.window.tabGroups.activeTabGroup.viewColumn)
            await moveActiveEditor(tabEditorGroup, preserveFocus)
        }
        logger.log(`Open PDF tab for ${pdfFileUri.toString(true)}`)
    }

    async openPdfInPanel(pdfFileUri: vscode.Uri, webviewPanel: vscode.WebviewPanel) {
        const panel = await PdfViewerPanelService.populatePdfViewerPanel(pdfFileUri, webviewPanel)
        PdfViewerManagerService.initiatePdfViewerPanel(panel)
        logger.log(`Open PDF tab for ${pdfFileUri.toString(true)} in panel`)
    }

    /**
     * Opens the PDF file of `sourceFile` in the external PDF viewer.
     *
     * @param sourceFile The path of a LaTeX file.
     */
    openExternal(sourceFile: string): void {
        const pdfFile = lw.manager.tex2pdf(sourceFile)
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
    handler(websocket: ws, msg: string): void {
        const data = JSON.parse(msg) as ClientRequest
        if (data.type !== 'ping') {
            logger.log(`Handle data type: ${data.type}`)
        }
        switch (data.type) {
            case 'open': {
                const pdfFileUri = vscode.Uri.parse(data.pdfFileUri, true)
                const clientSet = PdfViewerManagerService.getClientSet(pdfFileUri)
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
                lw.eventBus.fire(ViewerPageLoaded)
                const configuration = vscode.workspace.getConfiguration('latex-workshop')
                if (configuration.get('synctex.afterBuild.enabled') as boolean) {
                    logger.log('SyncTex after build invoked.')
                    const uri = vscode.Uri.parse(data.pdfFileUri, true)
                    lw.locator.syncTeX(undefined, undefined, uri.fsPath)
                }
                break
            }
            case 'reverse_synctex': {
                const uri = vscode.Uri.parse(data.pdfFileUri, true)
                void lw.locator.locate(data, uri.fsPath)
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

    viewerParams(): PdfViewerParams {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const invertType = configuration.get('view.pdf.invertMode.enabled') as string
        const invertEnabled = (invertType === 'auto' && (getCurrentThemeLightness() === 'dark')) ||
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
            codeColorTheme: getCurrentThemeLightness(),
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
    syncTeX(pdfFile: string, record: SyncTeXRecordForward): void {
        const pdfFileUri = vscode.Uri.file(pdfFile)
        const clientSet = PdfViewerManagerService.getClientSet(pdfFileUri)
        if (clientSet === undefined) {
            logger.log(`PDF is not viewed: ${pdfFile}`)
            return
        }
        const needDelay = this.revealWebviewPanel(pdfFileUri)
        for (const client of clientSet) {
            setTimeout(() => {
                client.send({type: 'synctex', data: record})
            }, needDelay ? 200 : 0)
            logger.log(`Try to synctex ${pdfFile}`)
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
        const panelSet = PdfViewerManagerService.getPanelSet(pdfFileUri)
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
        const panelSet = PdfViewerManagerService.getPanelSet(pdfFileUri)
        if (!panelSet) {
            return []
        }
        return Array.from(panelSet).map( e => e.state )
    }

}
