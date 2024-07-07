import * as vscode from 'vscode'
import { WebSocket } from 'ws'
import { lw } from '../lw'
import * as utils from '../utils/utils'
import { ClientRequest, ServerResponse } from '../../types/latex-workshop-protocol-types/index'
import * as manager from './viewer/pdfviewermanager'
import { Client } from './viewer/client'

const logger = lw.log('HostConnection')

export {
    hostConnectionHandler,
    connectToHostWs,
    resetConnectionToHost,
    registerWithHost,
    send
}

export let wsToHost: Promise<WebSocket> | undefined
export let initialized: boolean = false

function hostConnectionHandler(_: WebSocket, msg: string): void {
    const data = JSON.parse(msg) as ServerResponse
    logger.log(`Handle data type: ${data.type}`)

    switch (data.type) {
        case 'refresh': {
            lw.viewer.refresh(vscode.Uri.parse(data.pdfFileUri).fsPath)
            break
        }
        case 'reverse_synctex_result': {
            void lw.locate.synctex.openTeX(vscode.Uri.parse(data.input).fsPath, data.line, data.column, data.textBeforeSelection, data.textAfterSelection)
            break
        }
        case 'synctex_result': {
            void lw.viewer.locate(vscode.Uri.parse(data.pdfFile, true).fsPath, data.synctexData)
            break
        }
        default: {
            break
        }
    }
}

async function connectToHostWs() {
    logger.log('Connecting to host')
    if (!lw.liveshare.isGuest) {
        resetConnectionToHost()
        return
    }

    if (initialized) {
        logger.log('Already connected to host.')
        return
    }

    const server = await vscode.env.asExternalUri(vscode.Uri.parse(`http://127.0.0.1:${await lw.liveshare.getHostServerPort()}`, true))

    wsToHost = new Promise((resolve, reject) => {
        const ws = new WebSocket(server.toString(true))
        ws.addEventListener('open', () => {
            logger.log('Connected to host')
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
            logger.log('Connection to host disconnected')
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
            registerWithHost()
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
    logger.log('Reset connection to host')
    initialized = false
    lw.hostConnection.wsToHost = undefined
}

async function send(message: ClientRequest) {
    logger.log(`Sends message ${JSON.stringify(message)} to host`)
    if (!lw.liveshare.isGuest) {
        return
    }

    const ws = await wsToHost
    if (ws?.readyState === 1) {
        ws.send(JSON.stringify(message))
    }
}
