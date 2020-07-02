import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as tmpFile from 'tmp'
import { Extension } from '../../main'
import { PDFRenderer } from './pdfrenderer'
import { GraphicsScaler } from './graphicsscaler'


export class GraphicsPreview {
    private readonly cacheDir: string
    private readonly pdfFileCacheMap: Map<string, {cacheFileName: string, inode: number}>
    private curCacheName = 0

    private readonly extension: Extension
    private readonly pdfRenderer: PDFRenderer
    private readonly graphicsScaler: GraphicsScaler

    constructor(e: Extension) {
        this.extension = e
        this.pdfRenderer = new PDFRenderer()
        this.graphicsScaler = new GraphicsScaler()
        const tmpdir = tmpFile.dirSync({ unsafeCleanup: true })
        this.cacheDir = tmpdir.name
        this.pdfFileCacheMap = new Map<string, {cacheFileName: string, inode: number}>()
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

    private newSvgCacheName(): string {
        const name = this.curCacheName.toString() + '.svg'
        this.curCacheName += 1
        return name
    }

    async renderGraphics(filePath: string, opts: { height: number, width: number, pageNumber?: number }): Promise<string | vscode.Uri | undefined> {
        const pageNumber = opts.pageNumber || 1
        if (!fs.existsSync(filePath)) {
            return undefined
        }
        if (/\.pdf$/i.exec(filePath)) {
            const cacheKey = JSON.stringify([filePath, pageNumber])
            const cache = this.pdfFileCacheMap.get(cacheKey)
            const cacheFileName = cache?.cacheFileName ?? this.newSvgCacheName()
            const svgPath = path.join(this.cacheDir, cacheFileName)
            const curStat = fs.statSync(filePath)
            if( cache && fs.existsSync(svgPath) && fs.statSync(svgPath).mtimeMs >= curStat.mtimeMs && cache.inode === curStat.ino ) {
                return vscode.Uri.file(svgPath)
            }
            this.pdfFileCacheMap.set(cacheKey, {cacheFileName, inode: curStat.ino})
            const svg0 = await this.pdfRenderer.renderToSVG(
                filePath,
                { height: opts.height, width: opts.width, pageNumber }
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

    private setBackgroundColor(svg: string): string {
        return svg.replace(/(<\/svg:style>)/, 'svg { background-color: white };$1')
    }

    private findFilePath(relPath: string): string | undefined {
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
