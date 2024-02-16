import * as vscode from 'vscode'
import * as http from 'http'
import type { AddressInfo } from 'net'
import ws from 'ws'
import * as fs from 'fs'
import * as path from 'path'
import { lw } from '../lw'

const logger = lw.log('Server')

export {
    getPort,
    getUrl,
    setHandler,
    initialize,
    // initialized
}

class WsServer extends ws.Server {
    private readonly validOrigin: string

    constructor(server: http.Server, validOrigin: string) {
        super({server})
        this.validOrigin = validOrigin
    }

    //
    // Check Origin header during WebSocket handshake.
    // - https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#client_handshake_request
    // - https://github.com/websockets/ws/blob/master/doc/ws.md#servershouldhandlerequest
    //
    shouldHandle(req: http.IncomingMessage): boolean {
        if (!this.validOrigin.includes('127.0.0.1')) {
            return true
        }
        const reqOrigin = req.headers['origin']
        if (reqOrigin !== undefined && reqOrigin !== this.validOrigin) {
            logger.log(`Origin in WebSocket upgrade request is invalid: ${JSON.stringify(req.headers)}`)
            logger.log(`Valid origin: ${this.validOrigin}`)
            return false
        } else {
            return true
        }
    }

}

logger.log('Creating LaTeX Workshop http and websocket server.')
// let initializeResolve: ((value: unknown) => void) | undefined = undefined
// const initialized = new Promise((resolve) => initializeResolve = resolve)
const state: {
    // initialized: Promise<unknown>,
    httpServer: http.Server,
    wsServer?: WsServer,
    address?: AddressInfo,
    validOriginUri?: vscode.Uri,
    handlers: ((url: string) => string | undefined)[]
} = {
    httpServer: initialize(),
    handlers: []
    // initialized
}

lw.onDispose({ dispose: () => state.httpServer.close() })

function getPort(): number {
    const portNum = state.address?.port
    if (portNum === undefined) {
        logger.log('Server port number is undefined.')
        throw new Error('Server port number is undefined.')
    }
    return portNum
}

async function getUrl(pdfUri?: vscode.Uri): Promise<{url: string, uri: vscode.Uri}> {
    // viewer/viewer.js automatically requests the file to server.ts, and server.ts decodes the encoded path of PDF file.
    const origUrl = await vscode.env.asExternalUri(vscode.Uri.parse(`http://127.0.0.1:${lw.server.getPort()}`, true))
    const url =
        (origUrl.toString().endsWith('/') ? origUrl.toString().slice(0, -1) : origUrl.toString()) +
        (pdfUri ? ('/viewer.html?file=' + encodePathWithPrefix(pdfUri)) : '')
    return { url, uri: vscode.Uri.parse(url, true) }
}

function setHandler(newHandler: (url: string) => string | undefined) {
    state.handlers.push(newHandler)
}

function getValidOrigin(): string {
    if (state.validOriginUri) {
        return `${state.validOriginUri.scheme}://${state.validOriginUri.authority}`
    } else {
        throw new Error('[Server] validOrigin is undefined')
    }
}

function initialize(hostname?: string): http.Server {
    if (hostname) { // We must have created one.
        state.httpServer.close()
    }
    const httpServer = http.createServer((request, response) => handler(request, response))
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const viewerPort = configuration.get('viewer.pdf.internal.port') as number
    httpServer.listen(viewerPort, hostname ?? '127.0.0.1', undefined, async () => {
        const address = state.httpServer.address()
        if (address && typeof address !== 'string') {
            state.address = address
            logger.log(`Server successfully started: ${JSON.stringify(address)} .`)
            if (hostname) {
                logger.log(`BE AWARE: YOU ARE PUBLIC TO ${hostname} !`)
            }
            state.validOriginUri = await obtainValidOrigin(address.port, hostname ?? '127.0.0.1')
            logger.log(`valdOrigin is ${getValidOrigin()}`)
            initializeWsServer(httpServer, getValidOrigin())
            // if (initializeResolve) {
            //     initializeResolve(undefined)
            // }
        } else {
            logger.log(`Server failed to start. Address is invalid: ${JSON.stringify(address)}`)
        }
    })
    httpServer.on('error', (err) => {
        logger.log(`Error creating LaTeX Workshop http server: ${JSON.stringify(err)} .`)
    })
    return httpServer
}

async function obtainValidOrigin(serverPort: number, hostname: string): Promise<vscode.Uri> {
    const origUrl = `http://${hostname}:${serverPort}/`
    const uri = await vscode.env.asExternalUri(vscode.Uri.parse(origUrl, true))
    return uri
}

function initializeWsServer(httpServer: http.Server, validOrigin: string) {
    if (state.wsServer) {
        state.wsServer.close()
    }
    state.wsServer = new WsServer(httpServer, validOrigin)
    state.wsServer.on('connection', (websocket) => {
        websocket.on('message', (msg: string) => lw.viewer.handler(websocket, msg))
        websocket.on('error', (err) => logger.log(`Error on WebSocket connection. ${JSON.stringify(err)}`))
    })
}

//
// We reject cross-origin requests. The specification says "In case a server does not wish to participate in the CORS protocol,
// ... The server is encouraged to use the 403 status in such HTTP responses."
// - https://fetch.spec.whatwg.org/#http-requests
// - https://fetch.spec.whatwg.org/#http-responses
//
function checkHttpOrigin(req: http.IncomingMessage, response: http.ServerResponse): boolean {
    const validOrigin = getValidOrigin()
    if (!validOrigin.includes('127.0.0.1')) {
        return true
    }
    const reqOrigin = req.headers['origin']
    if (reqOrigin !== undefined && !reqOrigin.startsWith('vscode-webview:') && reqOrigin !== validOrigin) {
        logger.log(`Origin in http request is invalid: ${JSON.stringify(req.headers)}`)
        logger.log(`Valid origin: ${validOrigin}`)
        response.writeHead(403)
        response.end()
        return false
    } else {
        return true
    }
}

function sendOkResponse(response: http.ServerResponse, content: Buffer, contentType: string, cors: boolean = true) {
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
    response.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': content.length,
        ...(cors ? sameOriginPolicyHeaders : {'Access-Control-Allow-Origin': '*'})
    })
    response.end(content)
}

async function handler(request: http.IncomingMessage, response: http.ServerResponse) {
    if (!request.url) {
        return
    }
    const isValidOrigin = checkHttpOrigin(request, response)
    if (!isValidOrigin) {
        return
    }
    if (hasPrefix(request.url) && !request.url.includes('viewer.html')) {
        const s = request.url.replace('/', '')
        const fileUri = decodePathWithPrefix(s)
        if (!lw.viewer.isViewing(fileUri)) {
            logger.log(`Invalid PDF request: ${fileUri.toString(true)}`)
            return
        }
        try {
            const buf: Buffer = Buffer.from(await vscode.workspace.fs.readFile(fileUri))
            sendOkResponse(response, buf, 'application/pdf')
            logger.log(`Preview PDF file: ${fileUri.toString(true)}`)
        } catch (e) {
            logger.logError(`Error reading PDF ${fileUri.toString(true)}`, e)
            response.writeHead(404)
            response.end()
        }
        return
    }
    if (request.url.endsWith('/config.json')) {
        const params = lw.viewer.getParams()
        const content = JSON.stringify(params)
        sendOkResponse(response, Buffer.from(content), 'application/json')
        return
    }
    let root: string
    if (request.url.startsWith('/build/') || request.url.startsWith('/cmaps/') || request.url.startsWith('/standard_fonts/')) {
        root = path.resolve(lw.extensionRoot, 'node_modules', 'pdfjs-dist')
    } else if (request.url.startsWith('/out/viewer/') || request.url.startsWith('/viewer/')) {
        // For requests to /out/viewer/*.js and requests to /viewer/*.ts.
        // The latter is for debugging with sourcemap.
        root = path.resolve(lw.extensionRoot)
    } else {
        root = path.resolve(lw.extensionRoot, 'viewer')
    }
    for (const overrideHandler of state.handlers) {
        const overrideRoot = overrideHandler(request.url)
        if (overrideRoot !== undefined) {
            root = overrideRoot
            break
        }
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
        case '.mjs':
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
            sendOkResponse(response, content, contentType, false)
        }
    })
}

/**
 * We encode the path with base64url after calling encodeURIComponent.
 * The reason not using base64url directly is that we are not sure that
 * encodeURIComponent, unescape, and btoa trick is valid on node.js.
 * - https://en.wikipedia.org/wiki/Base64#URL_applications
 * - https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa#Unicode_strings
 */
function encodePath(url: string) {
    const s = encodeURIComponent(url)
    const b64 = Buffer.from(s).toString('base64')
    const b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return b64url
}

function decodePath(b64url: string) {
    const tmp = b64url + '='.repeat((4 - b64url.length % 4) % 4)
    const b64 = tmp.replace(/-/g, '+').replace(/_/g, '/')
    const s = Buffer.from(b64, 'base64').toString()
    return decodeURIComponent(s)
}

function hasPrefix(url: string) {
    return url.includes(lw.constant.PDF_PREFIX)
}

function encodePathWithPrefix(pdfFilePath: vscode.Uri) {
    return lw.constant.PDF_PREFIX + encodePath(pdfFilePath.toString(true))
}

function decodePathWithPrefix(b64urlWithPrefix: string): vscode.Uri {
    const s = b64urlWithPrefix.replace(lw.constant.PDF_PREFIX, '')
    const uriString = decodePath(s)
    return vscode.Uri.parse(uriString, true)
}
