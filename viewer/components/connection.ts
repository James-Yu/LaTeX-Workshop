import type { ClientRequest } from '../../types/latex-workshop-protocol-types/index'
import type { PDFViewer } from '../latexworkshop'

export interface IConnectionPort {
    send(message: ClientRequest): void | Promise<void>,
    onDidReceiveMessage(cb: (event: WebSocketEventMap['message']) => void): void,
    onDidClose(cb: () => unknown): void,
    onDidOpen(cb: () => unknown): void
}

export function createConnectionPort(lwViewer: PDFViewer): IConnectionPort {
    return new WebSocketPort(lwViewer)
}

export class WebSocketPort implements IConnectionPort {
    readonly lwApp: PDFViewer
    readonly server: string
    private readonly socket: Promise<WebSocket>

    constructor(lwApp: PDFViewer) {
        this.lwApp = lwApp
        const scheme = 'https:' === window.location.protocol ? 'wss' : 'ws'
        const path = window.location.pathname.substring(0, window.location.pathname.indexOf('viewer.html'))
        const server = `${scheme}://${window.location.hostname}:${window.location.port}${path}`
        this.server = server
        this.socket = new Promise((resolve, reject) => {
            const sock = new WebSocket(server)
            sock.addEventListener('open', () => {
                resolve(sock)
            })
            sock.addEventListener('error', () => reject(new Error(`Failed to connect to ${server}`)))
        })
        this.startConnectionKeeper()
    }

    private startConnectionKeeper() {
        // Send packets every 30 sec to prevent the connection closed by timeout.
        const id = setInterval(async () => {
            try {
                await this.send({type: 'ping'})
            }
            catch {
                clearInterval(id)
            }
        }, 30000)
    }

    async send(message: ClientRequest) {
        const sock = await this.socket
        if (sock.readyState === 1) {
            sock.send(JSON.stringify(message))
        }
    }

    async onDidReceiveMessage(cb: (event: WebSocketEventMap['message']) => void) {
        const sock = await this.socket
        sock.addEventListener('message', cb)
    }

    async onDidClose(cb: () => unknown) {
        const sock = await this.socket
        sock.addEventListener('close', () => cb())
    }

    async onDidOpen(cb: () => unknown) {
        await this.socket
        cb()
    }
}
