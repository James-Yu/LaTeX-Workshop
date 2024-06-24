import type { ClientRequest, PanelRequest, ServerResponse } from '../../types/latex-workshop-protocol-types/index'
import { refresh } from './refresh.js'
import { forwardSynctex } from './synctex.js'
import * as utils from './utils.js'

let server: string
let websocket: Promise<WebSocket>

export function initConnect() {
    const scheme = 'https:' === window.location.protocol ? 'wss' : 'ws'
    const path = window.location.pathname.substring(0, window.location.pathname.indexOf('viewer.html'))
    server = `${scheme}://${window.location.hostname}:${window.location.port}${path}`
    websocket = new Promise((resolve, reject) => {
        const ws = new WebSocket(server)
        ws.addEventListener('open', () => { resolve(ws) })
        ws.addEventListener('error', () => reject(new Error(`Failed to connect to ${server}`)))
    })
    websocket.then((ws: WebSocket) => {
        ws.addEventListener('message', handler)
        ws.addEventListener('close', reconnect)
        const openPack: ClientRequest = {
            type: 'open',
            pdfFileUri: utils.parseURL().pdfFileUri,
            viewer: (utils.isEmbedded() ? 'tab' : 'browser')
        }
        void send(openPack)
    }).catch((e) => console.error('Setting up connection port failed:', e))

    // Send packets every 30 sec to prevent the connection closed by timeout.
    const id = setInterval(async () => {
        try {
            await send({type: 'ping'})
        }
        catch {
            clearInterval(id)
        }
    }, 30000)
}

export async function send(message: ClientRequest) {
    const ws = await websocket
    if (ws.readyState === 1) {
        ws.send(JSON.stringify(message))
    }
}

export function sendLog(message: string) {
    void send({ type: 'add_log', message })
}

export function sendPanel(msg: PanelRequest) {
    if (!utils.isEmbedded()) {
        return
    }
    window.parent?.postMessage(msg, '*')
}

function handler(event: MessageEvent<string>) {
    const data = JSON.parse(event.data) as ServerResponse
    switch (data.type) {
        case 'synctex': {
            forwardSynctex(data.data)
            break
        }
        case 'refresh': {
            void refresh()
            break
        }
        case 'reload': {
            location.reload()
            break
        }
        default: {
            break
        }
    }
}

async function reconnect() {
    const originalTitle = document.title
    document.title = `[Disconnected] ${originalTitle}`
    console.log('Closed: WebSocket to LaTeX Workshop.')

    // Since WebSockets are disconnected when PC resumes from sleep,
    // we have to reconnect. https://github.com/James-Yu/LaTeX-Workshop/pull/1812
    await utils.sleep(3000)

    let tries = 1
    while (tries <= 10) {
        console.log(`Try to reconnect to LaTeX Workshop: (${tries}/10).`)
        try {
            initConnect()
            const ws = await websocket
            if (ws.readyState !== 1) {
                throw new Error(`Connection to ${server} is not open.`)
            }
            document.title = originalTitle
            console.log('Reconnected: WebSocket to LaTeX Workshop.')
            return
        } catch (e) {
            console.error(e)
        }

        await utils.sleep(1000 * (tries + 2))
        tries++
    }
    console.error('Cannot reconnect to LaTeX Workshop.')
}
