import * as vsls from 'vsls/vscode'
import * as vscode from 'vscode'
import * as url from 'url'
import http from 'http'
import ws from 'ws'
import { lw } from '../lw'
import type { ClientRequest, ServerResponse } from '../../types/latex-workshop-protocol-types'
import type { Client } from '../preview/viewer/client'
import { getClients } from '../preview/viewer/pdfviewermanager'

const logger = lw.log('LiveShare')

export {
    getApi,
    getHostServerPort,
    isGuest,
    isHost,
    handle,
    register,
    shareServer
}

/**
 * This module exports the Live Share API and handles the connection to the host server.
 * Since LiveShare allows sharing the server, in order to support features like PDF sync,
 * Synctex, and reverse Synctex, we provide LiveShare guests with the ability to connect
 * to the host Workshop server.
 * Unfortunately, the LiveShare extensions seems to be abandoned by Microsoft, with
 * long standing issues like the lack of binary file support:
 * https://github.com/microsoft/live-share/issues/1895
 *
 * The URIs must then be carefully handled to follow the `vsls` scheme, not `file` on guests.
 * Fot the server to be shared, the host must Allow for port sharing when prompted or execute
 * the HOSTPORT command. Already connected guests need to execute that command as well
 * to update the port.
 * Another limitation is that the host must already have the viewer and compiler running.
 */

const handle = {
    command: {
        syncTeX: handleCommandSyncTeX
    },
    viewer: {
        refresh: handleViewerRefresh,
        reverseSyncTeX: handleViewerReverseSyncTeX,
        syncTeX: handleViewerSyncTeX
    },
    server: {
        request: handleServerRequest
    }
}

const state: {
    initialized: Promise<void>,
    liveshare: vsls.LiveShare | undefined,
    role: vsls.Role,
    hostServerPort: number | undefined,
    shareServerDisposable: vscode.Disposable | undefined,
    connected: boolean,
    ws: ws.WebSocket | undefined
} = {
    initialized: new Promise<void>(resolve =>
        vsls.getApi().then(api => {
            if (api === null) {
                resolve()
                return
            }
            setRole(api.session.role)
            state.liveshare = api
            state.liveshare.onDidChangeSession(e => setRole(e.session.role))
            resolve()
        })
    ),
    liveshare: undefined,
    role: vsls.Role.None,
    hostServerPort: undefined,
    shareServerDisposable: undefined,
    connected: false,
    ws: undefined
}

function isGuest() {
    return state.role === vsls.Role.Guest
}

function isHost() {
    return state.role === vsls.Role.Host
}

function getApi() {
    return state.liveshare
}

/**
 * Runs init logic for the host or guest, depending on the assigned role.
 * @param role The role of the user in the Live Share session.
 */
function setRole(role: vsls.Role) {
    state.role = role
    state.hostServerPort = undefined
    state.shareServerDisposable?.dispose()
    resetConnection()
    if (role === vsls.Role.Guest) {
        void initGuest()
    } else if (role === vsls.Role.Host) {
        void initHost()
    }
}

async function initGuest() {
    await getHostServerPort()
    await connectHost()
}

async function initHost() {
    await shareServer()
}

/**
 * Returns the saved host server port or checks the shared servers for a new port.
 * @param reset If true, the host server port is reset and a new one is acquired.
 * @returns Promise that resolves to the host server port.
 */
async function getHostServerPort(reset: boolean = false): Promise<number> {
    if (!reset && state.hostServerPort !== undefined) {
        return state.hostServerPort
    }
    const savedClipboard = await vscode.env.clipboard.readText()
    void vscode.commands.executeCommand('liveshare.listServers')
    // delay here instead of doing await vscode.commands.executeCommand acquires the port more reliably because await vscode.commands.executeCommand does not return until the user closes the info box of the command or clicks copy again.
    await sleep(500)
    const hostUrl = await vscode.env.clipboard.readText()
    const hostServerPort = Number(url.parse(hostUrl).port)
    state.hostServerPort = hostServerPort
    await vscode.env.clipboard.writeText(savedClipboard)
    return hostServerPort
}

/**
 * Shares the server using the Live Share API.
 * @returns Promise that resolves when the server is shared.
 */
async function shareServer() {
    if (state.role !== vsls.Role.Host) {
        return
    }
    state.shareServerDisposable?.dispose()
    await state.initialized
    state.shareServerDisposable = await state.liveshare?.shareServer({ port: lw.server.getPort(), displayName: 'latex-workshop-server' })
}

/**
 * Connects to the WebSocket server of the host.
 */
async function connectHost() {
    logger.log('Connecting to host')
    if (state.role !== vsls.Role.Guest) {
        resetConnection()
        return
    }

    if (state.connected) {
        logger.log('Already connected to host.')
        return
    }

    const server = await vscode.env.asExternalUri(vscode.Uri.parse(`http://127.0.0.1:${await getHostServerPort()}`, true))

    await new Promise<void>(resolve => {
        const websocket = new ws.WebSocket(server.toString(true))
        websocket.addEventListener('open', () => {
            logger.log('Connected to host')
            state.ws = websocket
            state.connected = true
            resolve()
        })
    })
    state.ws?.addEventListener('message', event => {
        if (event.type === 'message') {
            connectionHandler(event.data as string)
        }
    })
    state.ws?.addEventListener('close', async () => {
        logger.log('Connection to host disconnected')
        state.connected = false
        await reconnect()
    })
    state.ws?.addEventListener('error', err => logger.logError(`Failed to connect to ${server}`, err))

    const id = setInterval(() => {
        try {
            sendToHost({ type: 'ping' })
        }
        catch {
            clearInterval(id)
        }
    }, 30000)
}

function resetConnection() {
    logger.log('Reset connection to host')
    state.connected = false
    state.ws = undefined
}

function connectionHandler(msg: string): void {
    const data = JSON.parse(msg) as ServerResponse
    logger.log(`Handle data type: ${data.type}`)

    switch (data.type) {
        case 'refresh': {
            lw.viewer.refresh(vscode.Uri.parse(data.pdfFileUri))
            break
        }
        case 'reverse_synctex_result': {
            void lw.locate.synctex.components.openTeX(vscode.Uri.parse(data.input).fsPath, data.line, data.column, data.textBeforeSelection, data.textAfterSelection)
            break
        }
        case 'synctex_result': {
            void lw.viewer.locate(vscode.Uri.parse(data.pdfFile, true), data.synctexData)
            break
        }
        default: {
            break
        }
    }
}

async function reconnect() {
    // Since WebSockets are disconnected when PC resumes from sleep,
    // we have to reconnect. https://github.com/James-Yu/LaTeX-Workshop/pull/1812
    await sleep(3000)

    let tries = 1
    while (tries <= 10) {
        try {
            await connectHost()
            register()
            if (state.ws?.readyState !== 1) {
                throw new Error('Connection to host is not open.')
            }
            return
        } catch (_e) {
        }

        await sleep(1000 * (tries + 2))
        tries++
    }
}

function register(client?: Client) {
    if (client) {
        sendToHost({ type: 'open', pdfFileUri: client.pdfFileUri })
    }

    getClients()?.forEach(guestClient => {
        sendToHost({ type: 'open', pdfFileUri: guestClient.pdfFileUri })
    })
}

function sendToHost(message: ClientRequest) {
    logger.log(`Sends message ${JSON.stringify(message)} to host`)
    if (state.role !== vsls.Role.Guest) {
        return
    }

    if (state.ws?.readyState === 1) {
        state.ws.send(JSON.stringify(message))
    }
}

function handleCommandSyncTeX(): boolean {
    if (!isGuest()) {
        return false
    }
    const coords = lw.locate.synctex.components.getCurrentEditorCoordinates()

    if (lw.root.file.path === undefined || coords === undefined) {
        logger.log('Cannot find LaTeX root PDF to perform synctex.')
        return true
    }

    const pdfFileUri = lw.file.toUri(lw.file.getPdfPath(lw.root.file.path))
    const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.root.getWorkspace())
    const indicator = configuration.get('synctex.indicator') as 'none' | 'circle' | 'rectangle'
    sendToHost({ type: 'synctex', line: coords.line, column: coords.column, filePath: coords.inputFileUri.toString(true), targetPdfFile: pdfFileUri.toString(true), indicator })
    return true
}

function handleViewerRefresh(pdfFile?: string, clientSet?: Set<Client>) {
    if (isHost() && state.liveshare && pdfFile !== undefined) {
        const sharedUri = state.liveshare.convertLocalUriToShared(lw.file.toUri(pdfFile))
        const guestClients = getClients(sharedUri)
        if (guestClients) {
            clientSet?.forEach(client => guestClients.add(client))
            return guestClients
        }
    }
    return clientSet
}

function handleViewerReverseSyncTeX(websocket: ws, uri: vscode.Uri, data: Extract<ClientRequest, { type: 'reverse_synctex' }>): boolean {
    if (isGuest()) {
        state.ws?.send(JSON.stringify(data)) // forward the request to host
        return true
    } else if (isHost() && uri.scheme === 'vsls' && state.liveshare) { // reply to guest if request comes from guest
        const localUri = state.liveshare.convertSharedUriToLocal(uri) ?? uri
        void lw.locate.synctex.components.computeToTeX(data, localUri).then(record => {
            if (record && state.liveshare) {
                const response: ServerResponse = {
                    type: 'reverse_synctex_result',
                    input: state.liveshare.convertLocalUriToShared(vscode.Uri.file(record.input)).toString(true),
                    line: record.line,
                    column: record.column,
                    textBeforeSelection: data.textAfterSelection,
                    textAfterSelection: data.textAfterSelection
                }
                websocket.send(JSON.stringify(response))
            }
        })
        return true
    }
    return false
}

function handleViewerSyncTeX(websocket: ws, data: ClientRequest): boolean {
    if (data.type !== 'synctex') {
        return false
    }
    if (!isHost() || !state.liveshare) {
        return true
    }

    const filePath = state.liveshare.convertSharedUriToLocal(vscode.Uri.parse(data.filePath, true)).fsPath
    const targetPdfFile = state.liveshare.convertSharedUriToLocal(vscode.Uri.parse(data.targetPdfFile, true))
    void lw.locate.synctex.components.synctexToPDFCombined(data.line, data.column, filePath, targetPdfFile, data.indicator).then(record => {
        if (!record) {
            logger.log(`Failed to locate synctex for ${filePath}. This was requested from a guest.`)
            return
        }

        const response: ServerResponse = {
            type: 'synctex_result',
            pdfFile: data.targetPdfFile,
            synctexData: record
        }

        websocket.send(JSON.stringify(response))
    })
    return true
}

async function handleServerRequest(request: http.IncomingMessage, response: http.ServerResponse): Promise<boolean> {
    if (!isGuest()) {
        return false
    }

    if (!request.url) {
        return true
    }

    const requestUrl = url.parse(request.url)

    const options = {
        host: requestUrl.hostname,
        port: await getHostServerPort(),
        path: requestUrl.path,
        method: request.method,
        headers: request.headers,
    }

    const backendReq = http.request(options, (backendRes) => {
        if (!backendRes.statusCode) {
            response.end()
            return
        }
        response.writeHead(backendRes.statusCode, backendRes.headers)

        backendRes.on('data', (chunk) => {
            response.write(chunk)
        })

        backendRes.on('end', () => {
            response.end()
        })
    })

    request.on('data', (chunk) => {
        backendReq.write(chunk)
    })

    request.on('end', () => {
        backendReq.end()
    })

    return true
}

async function sleep(timeout: number) {
    await new Promise((resolve) => setTimeout(resolve, timeout))
}
