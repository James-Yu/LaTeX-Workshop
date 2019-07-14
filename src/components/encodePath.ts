// prefix that server.ts uses to distiguish requests on pdf files from others.
// We use '.' because it is not converted by encodeURIComponent and other functions.
// See https://stackoverflow.com/questions/695438/safe-characters-for-friendly-url
// See https://tools.ietf.org/html/rfc3986#section-2.3

export const pdfFilePrefix = 'pdf..'

// We encode the path with base64url after calling encodeURIComponent.
// The reason not using base64url directly is that we are not sure that
// encodeURIComponent, unescape, and btoa trick is valid on node.js.
// See https://en.wikipedia.org/wiki/Base64#URL_applications
// See https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa#Unicode_strings
export function encodePath(path: string) {
    const s = encodeURIComponent(path)
    const b64 = Buffer.from(s).toString('base64')
    const b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return b64url
}

export function decodePath(b64url: string) {
    const tmp = b64url + '='.repeat((4 - b64url.length % 4) % 4)
    const b64 = tmp.replace(/-/g, '+').replace(/_/g, '/')
    const s = Buffer.from(b64, 'base64').toString()
    return decodeURIComponent(s)
}

export function encodePathWithPrefix(path: string) {
    return pdfFilePrefix + encodePath(path)
}

export function decodePathWithPrefix(b64urlWithPrefix: string) {
    const s = b64urlWithPrefix.replace(pdfFilePrefix, '')
    return decodePath(s)
}
