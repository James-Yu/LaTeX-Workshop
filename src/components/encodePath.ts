export const pdfFilePrefix = 'pdf..'

export function encodePath(path: string) {
    const s = encodeURIComponent(path)
    const b64 = Buffer.from(s).toString('base64')
    const b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/, '')
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
