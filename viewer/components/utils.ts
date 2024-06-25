export const pdfFilePrefix = 'pdf..'

export async function sleep(timeout: number) {
    await new Promise((resolve) => setTimeout(resolve, timeout))
}

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

let urlComponents: ReturnType<typeof parseURL>
export function parseURL(): { encodedPath: string, pdfFileUri: string, docTitle: string } {
    if (urlComponents) {
        return urlComponents
    }
    const query = document.location.search.substring(1)
    const parts = query.split('&')

    for (let i = 0, ii = parts.length; i < ii; ++i) {
        const param = parts[i].split('=')
        if (param[0].toLowerCase() === 'file') {
            const encodedPath = param[1].replace(pdfFilePrefix, '')
            const pdfFileUri = decodePath(encodedPath)
            const docTitle = pdfFileUri.split(/[\\/]/).pop() ?? 'Untitled PDF'
            urlComponents = { encodedPath, pdfFileUri, docTitle }
            return urlComponents
        }
    }
    throw new Error('file not given in the query.')
}

export function isEmbedded(): boolean {
    return window.parent !== window
}

export function isPrefersColorSchemeDark(codeColorTheme: 'light' | 'dark') {
    if (isEmbedded()) {
        return codeColorTheme === 'dark'
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
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
