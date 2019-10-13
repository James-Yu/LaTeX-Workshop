import * as vscode from 'vscode'
import * as path from 'path'
import {Extension} from '../../main'
import {PDFRenderer} from './pdfrenderer'

export class GraphicsPreview {
    extension: Extension
    pdfRenderer: PDFRenderer
    constructor(e: Extension) {
        this.extension = e
        this.pdfRenderer = new PDFRenderer(e)
    }

    async provideHover(document: vscode.TextDocument, position: vscode.Position) {
        const pat = /includegraphics\{(.*?)\}/
        const range = document.getWordRangeAtPosition(position, pat)
        if (!range) {
            return undefined
        }
        const cmdString = document.getText(range)
        const execArray = pat.exec(cmdString)
        const filePath = execArray && execArray[1]
        if (!execArray || !filePath) {
            return undefined
        }
        if (/\.pdf$/i.exec(filePath)) {
            let pdfPath: string
            if (path.isAbsolute(filePath)) {
                pdfPath = filePath
            } else {
                const docPath = document.uri.fsPath
                const dirPath = path.dirname(docPath)
                pdfPath = path.join(dirPath, filePath)
            }
            const svg = await this.pdfRenderer.renderToSVG(pdfPath)
            const dataUrl = this.svgToDataUrl(svg)
            const md = new vscode.MarkdownString(`![pdf](${dataUrl})`)
            return new vscode.Hover(md)
        }
        return undefined
    }

    private svgToDataUrl(xml: string): string {
        const svg64 = Buffer.from(unescape(encodeURIComponent(xml)), 'binary').toString('base64')
        const b64Start = 'data:image/svg+xml;base64,'
        return b64Start + svg64
    }
}
