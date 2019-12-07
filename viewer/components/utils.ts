export const pdfFilePrefix = 'pdf..'

export function encodePath(path: string): string {
  const s = encodeURIComponent(path)
  const b64 = window.btoa(s)
  const b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return b64url
}

export function decodePath(b64url: string): string {
  const tmp = b64url + '='.repeat((4 - b64url.length % 4) % 4)
  const b64 = tmp.replace(/-/g, '+').replace(/_/g, '/')
  const s = window.atob(b64)
  return decodeURIComponent(s)
}

export function callCbOnDidOpenWebSocket(sock: WebSocket, cb: () => any): void {
    // check whether WebSocket is already open (readyState === 1).
    if (sock.readyState === 1) {
        cb()
    } else {
        sock.addEventListener('open', () => {
            cb()
        }, {once: true})
    }
}
