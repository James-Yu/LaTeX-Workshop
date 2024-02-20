import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { lw } from '../../lw'

const logger = lw.log('Preview', 'Graphics')

export async function onGraphics(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | undefined> {
    const pat = /\\includegraphics\s*(?:\[(.*?)\])?\s*\{(.*?)\}/
    const range = document.getWordRangeAtPosition(position, pat)
    if (!range) {
        return
    }
    const cmdString = document.getText(range)
    const execArray = pat.exec(cmdString)
    const relPath = execArray && execArray[2]
    const includeGraphicsArgs = execArray && execArray[1]
    if (!execArray || !relPath) {
        return
    }
    const filePath = findFilePath(relPath, document)
    if (filePath === undefined) {
        return
    }
    let pageNumber = 1
    if (includeGraphicsArgs) {
        const m = /page\s*=\s*(\d+)/.exec(includeGraphicsArgs)
        if (m && m[1]) {
            pageNumber = Number(m[1])
        }
    }
    const md = await graph2md(filePath, { height: 230, width: 500, pageNumber })
    if (md !== undefined) {
        return new vscode.Hover(md, range)
    }
    return
}

export async function graph2md(filePath: string, opts: { height: number, width: number, pageNumber?: number }): Promise<vscode.MarkdownString | undefined> {
    const filePathUriString = vscode.Uri.file(filePath).toString()
    if (/\.(bmp|jpg|jpeg|gif|png)$/i.exec(filePath)) {
        // Workaround for https://github.com/microsoft/vscode/issues/137632
        if (vscode.env.remoteName) {
            const md = new vscode.MarkdownString(`![img](${filePathUriString})`)
            return md
        }
        const md = new vscode.MarkdownString(`<img src="${filePathUriString}" height="${opts.height}">`)
        md.supportHtml = true
        return md
    }
    if (/\.pdf$/i.exec(filePath)) {
        const pdfOpts = { height: opts.height, width: opts.width, pageNumber: opts.pageNumber || 1 }
        const dataUrl = await renderPdfFileAsDataUrl(filePath, pdfOpts)
        if (dataUrl !== undefined) {
            const md = new vscode.MarkdownString(`<img src="${dataUrl}" height="${opts.height}">`)
            md.supportHtml = true
            return md
        } else {
            let msg = '$(error) Failed to render.'
            if (!vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath))) {
                msg = '$(warning) Cannot render a PDF file not in workspaces.'
            } else if (lw.extra.snippet.state.view?.webview === undefined) {
                msg = '$(info) Please activate the LaTeX Workshop activity bar item to render PDF thumbnails.'
            }
            return new vscode.MarkdownString(msg, true)
        }
    }
    return
}

async function renderPdfFileAsDataUrl(pdfFilePath: string, opts: { height: number, width: number, pageNumber: number }): Promise<string | undefined> {
    try {
        const maxDataUrlLength = 99980
        let scale = 1.5
        let newOpts = { height: opts.height * scale , width: opts.width * scale, pageNumber: opts.pageNumber }
        let dataUrl = await lw.extra.snippet.render(vscode.Uri.file(pdfFilePath), newOpts)
        if (!dataUrl || dataUrl.length < maxDataUrlLength) {
            return dataUrl
        }
        scale = 1
        newOpts = { height: opts.height * scale , width: opts.width * scale, pageNumber: opts.pageNumber }
        dataUrl = await lw.extra.snippet.render(vscode.Uri.file(pdfFilePath), newOpts)
        if (!dataUrl || dataUrl.length < maxDataUrlLength) {
            return dataUrl
        }
        scale = Math.sqrt(maxDataUrlLength/dataUrl.length) / 1.2
        newOpts = { height: opts.height * scale , width: opts.width * scale, pageNumber: opts.pageNumber }
        dataUrl = await lw.extra.snippet.render(vscode.Uri.file(pdfFilePath), newOpts)
        if (dataUrl && dataUrl.length >= maxDataUrlLength) {
            logger.log(`Data URL still too large: ${pdfFilePath}`)
            return
        }
        return dataUrl
    } catch (e: unknown) {
        logger.logError(`Failed rendering graphics as data url with ${pdfFilePath}`, e)
        return
    }
}

function findFilePath(relPath: string, document: vscode.TextDocument): string | undefined {
    if (path.isAbsolute(relPath)) {
        if (fs.existsSync(relPath)) {
            return relPath
        } else {
            return
        }
    }

    const activeDir = path.dirname(document.uri.fsPath)
    for (const dirPath of lw.completion.input.graphicsPath) {
        const filePath = path.resolve(activeDir, dirPath, relPath)
        if (fs.existsSync(filePath)) {
            return filePath
        }
    }

    const fPath = path.resolve(activeDir, relPath)
    if (fs.existsSync(fPath)) {
        return fPath
    }

    const rootDir = lw.root.dir.path
    if (rootDir === undefined) {
        return
    }
    const frPath = path.resolve(rootDir, relPath)
    if (fs.existsSync(frPath)) {
        return frPath
    }
    return
}
