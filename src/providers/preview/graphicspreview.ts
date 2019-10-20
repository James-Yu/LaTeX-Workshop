import * as vscode from 'vscode'
import * as path from 'path'
import Jimp from 'jimp'
import * as JimpLib0 from 'jimp'
import {Extension} from '../../main'
import {PDFRenderer} from './pdfrenderer'
import {svgToDataUrl} from '../../utils'

const JimpLib = JimpLib0 as unknown as Jimp

export class GraphicsPreview {
    extension: Extension
    pdfRenderer: PDFRenderer
    constructor(e: Extension) {
        this.extension = e
        this.pdfRenderer = new PDFRenderer(e)
    }

    async provideHover(document: vscode.TextDocument, position: vscode.Position) {
        const pat = /\\includegraphics\{(.*?)\}/
        const range = document.getWordRangeAtPosition(position, pat)
        if (!range) {
            return undefined
        }
        const cmdString = document.getText(range)
        const execArray = pat.exec(cmdString)
        const relPath = execArray && execArray[1]
        if (!execArray || !relPath) {
            return undefined
        }
        let filePath: string
        if (path.isAbsolute(relPath)) {
            filePath = relPath
        } else {
            filePath = this.joinFilePath(document, relPath)
        }
        if (/\.pdf$/i.exec(relPath)) {
            const svg0 = await this.pdfRenderer.renderToSVG(filePath, { height: 250, width: 500 })
            const svg = this.setBackgroundColor(svg0)
            const dataUrl = svgToDataUrl(svg)
            const md = new vscode.MarkdownString(`![pdf](${dataUrl})`)
            return new vscode.Hover(md, range)
        }
        if (/\.(bmp|jpg|jpeg|gif|png)/i.exec(filePath)) {
            const image = await (JimpLib as unknown as Jimp).read(filePath)
            const dataUrl = await image.contain(300, 250).getBase64Async(image.getMIME())
            const md = new vscode.MarkdownString(`![image](${dataUrl})`)
            return new vscode.Hover(md, range)
        }
        return undefined
    }

    setBackgroundColor(svg: string): string {
        return svg.replace(/(<\/svg:style>)/, 'svg { background-color: white };$1')
    }

    joinFilePath(document: vscode.TextDocument, relPath: string) {
        const docPath = document.uri.fsPath
        const dirPath = path.dirname(docPath)
        return path.join(dirPath, relPath)
    }
}
