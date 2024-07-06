import * as vscode from 'vscode'
import { WebSocket } from 'ws'
import { lw } from '../lw'
import * as utils from '../utils/utils'
import { ClientRequest, ServerResponse } from '../../types/latex-workshop-protocol-types'
import * as manager from './viewer/pdfviewermanager'
import { Client } from './viewer/client'

export {
    hostConnectionHandler,
    connectToHostWs,
    resetConnectionToHost,
    registerWithHost
}

export let wsToHost: Promise<WebSocket> | undefined
export let initialized: boolean = false

function hostConnectionHandler(_: WebSocket, msg: string): void {
    const data = JSON.parse(msg) as ServerResponse

    switch (data.type) {
        case 'refresh': {
            lw.viewer.refresh(vscode.Uri.parse(data.pdfFileUri).fsPath)
            break
        }
        default: {
            break
        }
    }
}

async function connectToHostWs() {
    if (!lw.liveshare.isGuest) {
        resetConnectionToHost()
        return
    }

    if (initialized) {
        return
    }

    const server = await vscode.env.asExternalUri(vscode.Uri.parse(`http://127.0.0.1:${await lw.liveshare.getHostServerPort()}`, true))

    wsToHost = new Promise((resolve, reject) => {
        const ws = new WebSocket(server.toString(true))
        ws.addEventListener('open', () => {
            initialized = true
            resolve(ws)
        })
        ws.addEventListener('error', () => reject(new Error(`Failed to connect to ${server}`)))
    })

    void wsToHost.then((ws: WebSocket) => {
        ws.addEventListener('message', (event) => {
            if (event.type === 'message') {
                hostConnectionHandler(ws, event.data as string)
            }
        })
        ws.addEventListener('close', async () => {
            initialized = false
            await reconnectToHostWs()
        })
    })

    const id = setInterval(async () => {
        try {
            await send({ type: 'ping' })
        }
        catch {
            clearInterval(id)
        }
    }, 30000)
}

function registerWithHost(client?: Client) {
    if (client) {
        void send({ type: 'open', pdfFileUri: client.pdfFileUri, viewer: client.viewer })
    }

    manager.getClients()?.forEach(cl => {
        void send({ type: 'open', pdfFileUri: cl.pdfFileUri, viewer: cl.viewer })
    })
}

async function reconnectToHostWs() {
    // Since WebSockets are disconnected when PC resumes from sleep,
    // we have to reconnect. https://github.com/James-Yu/LaTeX-Workshop/pull/1812
    await utils.delay(3000)

    let tries = 1
    while (tries <= 10) {
        try {
            await connectToHostWs()
            const ws = await wsToHost
            if (ws?.readyState !== 1) {
                throw new Error('Connection to host is not open.')
            }
            return
        } catch (e) {
        }

        await utils.delay(1000 * (tries + 2))
        tries++
    }
}

function resetConnectionToHost() {
    initialized = false
    lw.hostConnection.wsToHost = undefined
}

export async function send(message: ClientRequest) {
    if (!lw.liveshare.isGuest) {
        return
    }

    const ws = await wsToHost
    if (ws?.readyState === 1) {
        ws.send(JSON.stringify(message))
    }
}
