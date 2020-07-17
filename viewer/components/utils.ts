export const pdfFilePrefix = 'pdf..'

// We use base64url to encode the path of PDF file.
// https://github.com/James-Yu/LaTeX-Workshop/pull/1501
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

export function isEmbedded(): boolean {
    return window.parent !== window
}

export function isPdfjsShortcut(e: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'code' | 'key'>) {
    // exclusive or
    const ctrlKey = (e.ctrlKey && !e.metaKey) || (!e.ctrlKey && e.metaKey)
    if (!ctrlKey && !e.altKey && !e.shiftKey) {
        if (/^[ njpkrhs]$/.exec(e.key)) {
            return true
        }
        if (/^(Enter|Home|End|PageUp|PageDown|ArrowUp|ArrowLeft|ArrowRight|ArrowDown|F4)$/.exec(e.code)) {
            return true
        }
        return false
    }
    // Ctrl
    if (ctrlKey && !e.altKey && !e.shiftKey) {
        if (/^[-+=0f]$/.exec(e.key)) {
            return true
        }
        if ( 'p' === e.key && !isEmbedded() ) {
            return true
        }
        return false
    }
    // Ctrl + Shift
    if (ctrlKey && !e.altKey && e.shiftKey) {
        if (/^[g]$/.exec(e.key)) {
            return true
        }
        return false
    }
    // Ctrl + Alt
    if (ctrlKey && e.altKey && !e.shiftKey) {
        if (/^[g]$/.exec(e.key)) {
            return true
        }
        return false
    }
    // Shift
    if (!ctrlKey && !e.altKey && e.shiftKey) {
        if (/^[ r]$/.exec(e.key)) {
            return true
        }
        if (e.code === 'Enter') {
            return true
        }
        return false
    }
    return false
}

export function elementWidth(element: HTMLElement, forceDisplay = true): number {
    const originalDisplay = element.style.display
    if (forceDisplay) {
        element.style.display = 'block'
    }
    const style = window.getComputedStyle(element)
    const width = element.offsetWidth
    const margin = parseFloat(style.marginLeft) + parseFloat(style.marginRight)
    if (forceDisplay) {
        element.style.display = originalDisplay
    }
    return width + margin
}
