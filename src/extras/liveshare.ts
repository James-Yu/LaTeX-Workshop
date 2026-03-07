import * as vscode from 'vscode'
import http from 'http'
import ws from 'ws'
import type { ClientRequest } from '../../types/latex-workshop-protocol-types'
import type { Client } from '../preview/viewer/client'
import { lw } from '../lw'

const logger = lw.log('LiveShare')
let warned = false

export {
    getApi,
    getHostServerPort,
    isGuest,
    isHost,
    handle,
    register,
    shareServer
}

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

function warnDisabled() {
    if (warned) {
        return
    }
    warned = true
    logger.log('Live Share integration is disabled in this build.')
}

function isGuest() {
    return false
}

function isHost() {
    return false
}

function getApi() {
    return undefined
}

function getHostServerPort(_reset: boolean = false): Promise<number> {
    warnDisabled()
    return Promise.resolve(0)
}

function shareServer(): Promise<void> {
    warnDisabled()
    return Promise.resolve()
}

function register(_client: Client) {
    // Live Share support is disabled.
}

function handleCommandSyncTeX(): boolean {
    warnDisabled()
    return false
}

function handleViewerRefresh(_pdfFile?: string, clientSet?: Set<Client>) {
    return clientSet
}

function handleViewerReverseSyncTeX(_websocket: ws, _uri: vscode.Uri, _data: Extract<ClientRequest, { type: 'reverse_synctex' }>): boolean {
    return false
}

function handleViewerSyncTeX(_websocket: ws, _data: ClientRequest): boolean {
    return false
}

function handleServerRequest(_request: http.IncomingMessage, _response: http.ServerResponse): Promise<boolean> {
    return Promise.resolve(false)
}
