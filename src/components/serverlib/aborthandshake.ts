/*

The MIT License (MIT)

Copyright (c) 2011 Einar Otto Stangvik <einaros@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

https://github.com/websockets/ws/blob/8c914d18b86a7d1408884d18eeadae0fa41b0bb5/lib/websocket-server.js#L384

*/

import { STATUS_CODES } from 'http'
import * as net from 'net'

export function abortHandshake(socket: net.Socket, code: number, message: string = '', headers: { [key: string]: string | number } = {}) {
    if (socket.writable) {
        message = message || STATUS_CODES[code] || ''
        headers = {
            Connection: 'close',
            'Content-Type': 'text/html',
            'Content-Length': Buffer.byteLength(message),
            ...headers
        }

        socket.write(
            `HTTP/1.1 ${code} ${STATUS_CODES[code]}\r\n` +
            Object.keys(headers)
            .map((h) => `${h}: ${headers[h]}`)
            .join('\r\n') +
            '\r\n\r\n' +
            message
        )
    }

    socket.removeListener('error', () => socket.destroy())
    socket.destroy()
}
