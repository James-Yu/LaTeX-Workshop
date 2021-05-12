import * as http from 'http'
import type * as net from 'net'
import type {AddressInfo} from 'net'
import ws from 'ws'
import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'

import type {Extension} from '../main'
import {decodePathWithPrefix, pdfFilePrefix} from '../utils/utils'
import {abortHandshake} from './serverlib/aborthandshake'

export class Server {
    private readonly extension: Extension
    private readonly httpServer: http.Server
    private readonly wsServer: ws.Server
    address?: AddressInfo
    port?: number

    constructor(extension: Extension) {
        this.extension = extension
        this.httpServer = http.createServer((request, response) => this.handler(request, response))
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const viewerPort = configuration.get('viewer.pdf.internal.port') as number
        this.httpServer.listen(viewerPort, '127.0.0.1', undefined, () => {
            const address = this.httpServer.address()
            if (address && typeof address !== 'string') {
                this.port = address.port
                this.address = address
                this.extension.logger.addLogMessage(`Server successfully started: ${JSON.stringify(address)}`)
            } else {
                this.extension.logger.addLogMessage(`Server failed to start. Address is invalid: ${JSON.stringify(address)}`)
            }
        })
        this.httpServer.on('error', (err) => {
            this.extension.logger.addLogMessage(`Error creating LaTeX Workshop http server: ${err}.`)
        })
        this.httpServer.on('upgrade', (req: http.IncomingMessage, socket: net.Socket) => {
            this.checkWebSocketUpgradeOrigin(socket, req)
        })
        this.wsServer = new ws.Server({server: this.httpServer})
        this.wsServer.on('connection', (websocket) => {
            websocket.on('message', (msg: string) => this.extension.viewer.handler(websocket, msg))
            websocket.on('error', () => this.extension.logger.addLogMessage('Error on WebSocket connection.'))
        })
        this.extension.logger.addLogMessage('Creating LaTeX Workshop http and websocket server.')
    }

    private get validOrigin(): string | undefined {
        if (this.port) {
            return `http://127.0.0.1:${this.port}`
        } else {
            return
        }
    }

    //
    // Check Origin header during WebSocket handshake.
    // - https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#client_handshake_request
    //
    private checkWebSocketUpgradeOrigin(socket: net.Socket, req: http.IncomingMessage): boolean {
        const reqOrigin = req.headers['origin']
        if ( this.validOrigin === undefined || reqOrigin === undefined || reqOrigin !== this.validOrigin ) {
            this.extension.logger.addLogMessage(`[Server] Origin in WebSocket upgrade request is invalid: ${JSON.stringify(req.headers)}`)
            this.extension.logger.addLogMessage(`[Server] Valid origin: ${this.validOrigin}`)
            abortHandshake(socket, 403)
            return false
        } else {
            return true
        }
    }

    //
    // We reject cross-origin requests. The specification says "In case a server does not wish to participate in the CORS protocol,
    // ... The server is encouraged to use the 403 status in such HTTP responses."
    // - https://fetch.spec.whatwg.org/#http-requests
    // - https://fetch.spec.whatwg.org/#http-responses
    //
    private checkHttpOrigin(req: http.IncomingMessage, response: http.ServerResponse): boolean {
        const reqOrigin = req.headers['origin']
        if ( this.validOrigin === undefined || (reqOrigin !== undefined && reqOrigin !== this.validOrigin) ) {
            this.extension.logger.addLogMessage(`[Server] Origin in http request is invalid: ${JSON.stringify(req.headers)}`)
            this.extension.logger.addLogMessage(`[Server] Valid origin: ${this.validOrigin}`)
            response.writeHead(403)
            response.end()
            return false
        } else {
            return true
        }
    }

    private handler(request: http.IncomingMessage, response: http.ServerResponse) {
        if (!request.url) {
            return
        }
        const isValidOrigin = this.checkHttpOrigin(request, response)
        if (!isValidOrigin) {
            return
        }
        //
        // Headers to enable site isolation.
        // - https://fetch.spec.whatwg.org/#cross-origin-resource-policy-header
        // - https://www.w3.org/TR/post-spectre-webdev/#documents-isolated
        //
        const sameOriginPolicyHeaders = {
            'Cross-Origin-Resource-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin',
            'X-Content-Type-Options': 'nosniff'
        }
        if (request.url.includes(pdfFilePrefix) && !request.url.includes('viewer.html')) {
            const s = request.url.replace('/', '')
            const fileName = decodePathWithPrefix(s)
            if (this.extension.viewer.getClients(fileName) === undefined) {
                this.extension.logger.addLogMessage(`Invalid PDF request: ${fileName}`)
                return
            }
            try {
                const pdfSize = fs.statSync(fileName).size
                response.writeHead(200, {
                    'Content-Type': 'application/pdf',
                    'Content-Length': pdfSize,
                    ...sameOriginPolicyHeaders
                })
                fs.createReadStream(fileName).pipe(response)
                this.extension.logger.addLogMessage(`Preview PDF file: ${fileName}`)
            } catch (e) {
                this.extension.logger.addLogMessage(`Error reading PDF file: ${fileName}`)
                if (e instanceof Error) {
                    this.extension.logger.logError(e)
                }
                response.writeHead(404)
                response.end()
            }
            return
        } else {
            let root: string
            if (request.url.startsWith('/build/') || request.url.startsWith('/cmaps/')) {
                root = path.resolve(`${this.extension.extensionRoot}/node_modules/pdfjs-dist`)
            } else if (request.url.startsWith('/out/viewer/') || request.url.startsWith('/viewer/')) {
                // For requests to /out/viewer/*.js and requests to /viewer/*.ts.
                // The latter is for debugging with sourcemap.
                root = path.resolve(this.extension.extensionRoot)
            } else {
                root = path.resolve(`${this.extension.extensionRoot}/viewer`)
            }
            //
            // Prevent directory traversal attack.
            // - https://en.wikipedia.org/wiki/Directory_traversal_attack
            //
            const reqFileName = path.posix.resolve('/', request.url.split('?')[0])
            const fileName = path.resolve(root, '.' + reqFileName)
            let contentType: string
            switch (path.extname(fileName)) {
                case '.html': {
                    contentType = 'text/html'
                    break
                }
                case '.js': {
                    contentType = 'text/javascript'
                    break
                }
                case '.css': {
                    contentType = 'text/css'
                    break
                }
                case '.json': {
                    contentType = 'application/json'
                    break
                }
                case '.png': {
                    contentType = 'image/png'
                    break
                }
                case '.jpg': {
                    contentType = 'image/jpg'
                    break
                }
                case '.gif': {
                    contentType = 'image/gif'
                    break
                }
                case '.svg': {
                    contentType = 'image/svg+xml'
                    break
                }
                case '.ico': {
                    contentType = 'image/x-icon'
                    break
                }
                default: {
                    contentType = 'application/octet-stream'
                    break
                }
            }
            fs.readFile(fileName, (err, content) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        response.writeHead(404)
                    } else {
                        response.writeHead(500)
                    }
                    response.end()
                } else {
                    response.writeHead(200, {
                        'Content-Type': contentType,
                        ...sameOriginPolicyHeaders
                    })
                    response.end(content)
                }
            })
        }
    }
}
