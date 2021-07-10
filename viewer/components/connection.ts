import type {ClientRequest} from './protocol.js'
import type {ILatexWorkshopPdfViewer} from './interface.js'

export interface IConnectionPort {
    send(message: ClientRequest): void,
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
    private readonly socket: WebSocket

    constructor(lwApp: ILatexWorkshopPdfViewer) {
        this.lwApp = lwApp
        const server = `ws://${window.location.hostname}:${window.location.port}`
        this.server = server
        this.socket = new WebSocket(server)
        this.startConnectionKeeper()
    }

    private startConnectionKeeper() {
        // Send packets every 30 sec to prevent the connection closed by timeout.
        setInterval( () => {
            if (this.socket.readyState === 1) {
                this.send({type: 'ping'})
            }
        }, 30000)
    }

    send(message: ClientRequest) {
        this.sendWithWebSokcet(message, this.socket)
    }

    private sendWithWebSokcet(message: ClientRequest, ws: WebSocket) {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify(message))
        } else if (ws.readyState === 0) {
            ws.addEventListener('open', () => {
                ws.send(JSON.stringify(message))
            }, {once: true})
        }
    }

    onDidReceiveMessage(cb: (event: WebSocketEventMap['message']) => void): void {
        this.socket.addEventListener('message', cb)
    }

    onDidClose(cb: () => unknown): void {
        this.socket.addEventListener('close', () => cb())
    }

    onDidOpen(cb: () => unknown): void {
        if (this.socket.readyState === 1) {
            cb()
        } else if (this.socket.readyState === 0) {
            this.socket.addEventListener('open', () => {
                cb()
            }, {once: true})
        }
    }
}
