import type {ClientRequest} from './protocol.js'
import type {ILatexWorkshopPdfViewer} from './interface.js'

export interface IConnectionPort {
    send(message: ClientRequest): void | Promise<void>,
    onDidReceiveMessage(cb: (event: WebSocketEventMap['message']) => void): void,
    onDidClose(cb: () => unknown): void,
    onDidOpen(cb: () => unknown): void
}

export function createConnectionPort(lwApp: ILatexWorkshopPdfViewer): IConnectionPort {
    return new WebSocketPort(lwApp)
}

export class WebSocketPort implements IConnectionPort {
    readonly lwApp: ILatexWorkshopPdfViewer
    readonly server: string
    private readonly socket: Promise<WebSocket>

    constructor(lwApp: ILatexWorkshopPdfViewer) {
        this.lwApp = lwApp
        const server = `ws://${window.location.hostname}:${window.location.port}`
        this.server = server
        this.socket = new Promise((resolve, reject) => {
            const sock = new WebSocket(server)
            sock.addEventListener('open', () => {
                resolve(sock)
            })
            sock.addEventListener('error', () => reject(new Error(`Failed to connect to ${server}`)) )
        })
        this.startConnectionKeeper()
    }

    private startConnectionKeeper() {
        // Send packets every 30 sec to prevent the connection closed by timeout.
        setInterval(() => {
            void this.send({type: 'ping'})
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
