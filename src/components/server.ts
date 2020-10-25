import * as http from 'http'
import ws from 'ws'
import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'

import {Extension} from '../main'
import {AddressInfo} from 'net'
import {decodePathWithPrefix, pdfFilePrefix} from '../utils/utils'

export class Server {
    private readonly extension: Extension
    private httpServer: http.Server
    private wsServer: ws.Server
    address?: string
    port?: number
    url?: string

    constructor(extension: Extension) {
        this.extension = extension
        this.httpServer = http.createServer((request, response) => this.handler(request, response))
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const viewerPort = configuration.get('viewer.pdf.internal.port') as number
        const viewerURL = configuration.get('viewer.pdf.internal.url') as string
        this.httpServer.listen(viewerPort, '127.0.0.1', undefined, () => {
            const {address, port} = this.httpServer.address() as AddressInfo
            this.port = port
            this.url = viewerURL.replace('%p', port.toString())
            if (address.includes(':')) {
                // the colon is reserved in URL to separate IPv4 address from port number. IPv6 address needs to be enclosed in square brackets when used in URL
                this.address = `[${address}]:${port}`
            } else {
                this.address = `${address}:${port}`
            }
            this.extension.logger.addLogMessage(`Server created on ${this.address}`)
        })
        this.httpServer.on('error', (err) => {
            this.extension.logger.addLogMessage(`Error creating LaTeX Workshop http server: ${err}.`)
        })
        this.wsServer = new ws.Server({server: this.httpServer})
        this.wsServer.on('connection', (websocket) => {
            websocket.on('message', (msg: string) => this.extension.viewer.handler(websocket, msg))
            websocket.on('error', () => this.extension.logger.addLogMessage('Error on WebSocket connection.'))
        })
        this.extension.logger.addLogMessage('Creating LaTeX Workshop http and websocket server.')
    }

    private handler(request: http.IncomingMessage, response: http.ServerResponse) {
        if (!request.url) {
            return
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
                response.writeHead(200, {'Content-Type': 'application/pdf', 'Content-Length': pdfSize})
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
            const reqFileName = path.posix.resolve('/', request.url.split('?')[0])
            const fileName = path.resolve(root, '.' + reqFileName)
            let contentType = 'text/html'
            switch (path.extname(fileName)) {
                case '.js':
                    contentType = 'text/javascript'
                    break
                case '.css':
                    contentType = 'text/css'
                    break
                case '.json':
                    contentType = 'application/json'
                    break
                case '.png':
                    contentType = 'image/png'
                    break
                case '.jpg':
                    contentType = 'image/jpg'
                    break
                case '.ico':
                    contentType = 'image/x-icon'
                    break
                default:
                    break
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
                    response.writeHead(200, {'Content-Type': contentType})
                    response.end(content, 'utf-8')
                }
            })
        }
    }
}
