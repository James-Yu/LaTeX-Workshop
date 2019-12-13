import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as tmpfs from 'tmp'
import { Extension } from '../../main'
import { PDFRenderer } from './pdfrenderer'
import { GraphicsScaler } from './graphicsscaler'
import { encodePath } from '../../utils/utils'


export class GraphicsPreview {
    private cacheDir: string

    extension: Extension
    pdfRenderer: PDFRenderer
    graphicsScaler: GraphicsScaler
    pdfFileInodeMap: Map<string, number>

    constructor(e: Extension) {
        this.extension = e
        this.pdfRenderer = new PDFRenderer(e)
        this.graphicsScaler = new GraphicsScaler(e)
        const tmpdir = tmpfs.dirSync({ unsafeCleanup: true })
        this.cacheDir = tmpdir.name
        this.pdfFileInodeMap = new Map<string, number>()
    }

    async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | undefined> {
        const pat = /\\includegraphics\s*(?:\[(.*?)\])?\s*\{(.*?)\}/
        const range = document.getWordRangeAtPosition(position, pat)
        if (!range) {
            return undefined
        }
        const cmdString = document.getText(range)
        const execArray = pat.exec(cmdString)
        const relPath = execArray && execArray[2]
        const includeGraphicsArgs = execArray && execArray[1]
        if (!execArray || !relPath) {
            return undefined
        }
        const filePath = this.findFilePath(relPath)
        if (filePath === undefined) {
            return undefined
        }
        let pageNumber = 1
        if (includeGraphicsArgs) {
            const m = /page\s*=\s*(\d+)/.exec(includeGraphicsArgs)
            if (m && m[1]) {
                pageNumber = Number(m[1])
            }
        }
        const dataUrl = await this.renderGraphics(filePath, { height: 230, width: 500, pageNumber })
        if (dataUrl !== undefined) {
            const md = new vscode.MarkdownString(`![graphics](${dataUrl})`)
            return new vscode.Hover(md, range)
        }
        return undefined
    }

    async renderGraphics(filePath: string, opts: { height: number, width: number, pageNumber?: number }): Promise<string | vscode.Uri | undefined> {
        if (!fs.existsSync(filePath)) {
            return undefined
        }
        if (/\.pdf$/i.exec(filePath)) {
            const svgPath = path.join(this.cacheDir, `${encodePath(filePath)}.svg`)
            const curStat = fs.statSync(filePath)
            const prevInode = this.pdfFileInodeMap.get(filePath)
            if( fs.existsSync(svgPath) && fs.statSync(svgPath).mtimeMs >= curStat.mtimeMs && prevInode === curStat.ino ) {
                return vscode.Uri.file(svgPath)
            }
            this.pdfFileInodeMap.set(filePath, curStat.ino)
            const svg0 = await this.pdfRenderer.renderToSVG(
                filePath,
                { height: opts.height, width: opts.width, pageNumber: opts.pageNumber || 1 }
            )
            const svg = this.setBackgroundColor(svg0)
            fs.writeFileSync(svgPath, svg)
            return vscode.Uri.file(svgPath)
        }
        if (/\.(bmp|jpg|jpeg|gif|png)$/i.exec(filePath)) {
            const dataUrl = await this.graphicsScaler.scale(filePath, opts)
            return dataUrl
        }
        return undefined
    }

    setBackgroundColor(svg: string): string {
        return svg.replace(/(<\/svg:style>)/, 'svg { background-color: white };$1')
    }

    findFilePath(relPath: string): string | undefined {
        if (path.isAbsolute(relPath)) {
            if (fs.existsSync(relPath)) {
                return relPath
            } else {
                return undefined
            }
        }
        const rootDir = this.extension.manager.rootDir
        if (rootDir === undefined) {
            return undefined
        }
        const fPath = path.resolve(rootDir, relPath)
        if (fs.existsSync(fPath)) {
            return fPath
        }
        for (const dirPath of this.extension.completer.input.graphicsPath) {
            const filePath = path.resolve(rootDir, dirPath, relPath)
            if (fs.existsSync(filePath)) {
                return filePath
            }
        }
        return undefined
    }
}
