import * as vscode from 'vscode'
import * as http from 'http'
import { lw } from '../lw'

const logger = lw.log('Server')

export {
    getPort,
    getUrl,
    setHandler,
    initialize,
    // initialized
}

function getPort(): number {
    throw new Error('PDF preview server is disabled in this build.')
}

function getUrl(pdfUri?: vscode.Uri): Promise<{url: string, uri: vscode.Uri}> {
    void pdfUri
    return Promise.reject(new Error('PDF preview server is disabled in this build.'))
}

function setHandler(newHandler: (url: string) => string | undefined) {
    void newHandler
    logger.log('Ignoring preview server handler registration because the preview server is disabled.')
}

function initialize(hostname?: string): http.Server {
    void hostname
    logger.log('PDF preview server is disabled in this build.')
    return http.createServer((_request, response) => {
        response.writeHead(503)
        response.end('PDF preview is disabled in this build.')
    })
}
