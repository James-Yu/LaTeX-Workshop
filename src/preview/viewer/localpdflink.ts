import * as fs from 'fs/promises'
import * as path from 'path'

export type LocalPdfLink = {
    file: string,
    destination: string,
    trusted: boolean
}

function contains(root: string, file: string): boolean {
    const relative = path.relative(root, file)
    return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
}

/** Resolve only relative PDF references; canonical paths determine workspace trust. */
export async function resolveLocalPdfLink(source: string, href: string, workspaceRoots: readonly string[]): Promise<LocalPdfLink> {
    // eslint-disable-next-line no-control-regex -- Reject control characters in untrusted PDF annotations.
    if (typeof href !== 'string' || /[\x00-\x1f\x7f]/.test(href)) {
        throw new Error('Invalid local PDF reference.')
    }
    const separator = href.indexOf('#')
    const filename = decodeURIComponent(separator < 0 ? href : href.slice(0, separator)).replaceAll('\\', '/')
    // eslint-disable-next-line no-control-regex -- Decoding must not introduce control characters either.
    if (!filename || filename.startsWith('/') || /[:?\x00-\x1f\x7f]/.test(filename) || !filename.toLowerCase().endsWith('.pdf')) {
        throw new Error('Only relative local PDF references are supported.')
    }
    const file = await fs.realpath(path.resolve(path.dirname(source), filename))
    if (!file.toLowerCase().endsWith('.pdf') || !(await fs.stat(file)).isFile()) {
        throw new Error('The linked target is not a PDF file.')
    }
    const sourceFile = await fs.realpath(source)
    const roots = await Promise.all(workspaceRoots.map(async root => {
        try { return await fs.realpath(root) } catch { return undefined }
    }))
    const insideWorkspace = (candidate: string) => roots.some(root => root !== undefined && contains(root, candidate))
    return {
        file,
        destination: separator < 0 ? '' : href.slice(separator + 1),
        trusted: insideWorkspace(sourceFile) && insideWorkspace(file)
    }
}
