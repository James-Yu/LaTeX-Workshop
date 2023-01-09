import * as fs from 'fs'
import * as iconv from 'iconv-lite'
import * as path from 'path'
import * as zlib from 'zlib'
import type { SyncTeXRecordForward, SyncTeXRecordBackward } from '../locator'
import { PdfSyncObject, parseSyncTex, Block, SyncTexJsError } from '../../lib/synctexjs'
import { iconvLiteSupportedEncodings } from '../../utils/convertfilename'
import { isSameRealPath } from '../../utils/pathnormalize'

import { getLogger } from '../logger'

const logger = getLogger('SyncTeX')

class Rectangle {
    readonly top: number
    readonly bottom: number
    readonly left: number
    readonly right: number

    static coveringRectangle(blocks: Block[]) {
        let cTop = 2e16
        let cBottom = 0
        let cLeft = 2e16
        let cRight = 0

        for (const b of blocks) {
            // Skip a block if they have boxes inside, or their type is kern or rule.
            // See also https://github.com/jlaurens/synctex/blob/2017/synctex_parser.c#L4655 for types.
            if (b.elements !== undefined || b.type === 'k' || b.type === 'r') {
                continue
            }
            cBottom = Math.max(b.bottom, cBottom)
            const top = b.bottom - b.height
            cTop = Math.min(top, cTop)
            cLeft = Math.min(b.left, cLeft)
            if (b.width !== undefined) {
                const right = b.left + b.width
                cRight = Math.max(right, cRight)
            }
        }
        return new Rectangle({ top: cTop, bottom: cBottom, left: cLeft, right: cRight })
    }

    static fromBlock(block: Block): Rectangle {
        const top = block.bottom - block.height
        const bottom = block.bottom
        const left = block.left
        const right = block.width ? block.left + block.width : block.left
        return new Rectangle({top, bottom, left, right})
    }

    constructor( {top, bottom, left, right}: { top: number, bottom: number, left: number, right: number} ) {
        this.top = top
        this.bottom = bottom
        this.left = left
        this.right = right
    }

    include(rect: Rectangle): boolean {
        return this.left <= rect.left && this.right >= rect.right && this.bottom >= rect.bottom && this.top <= rect.top
    }

    distanceY(y: number): number {
        return Math.min( Math.abs(this.bottom - y), Math.abs(this.top - y) )
    }

    distanceXY(x: number, y: number): number {
        return Math.sqrt(Math.pow(Math.min( Math.abs(this.bottom - y), Math.abs(this.top - y) ), 2) + Math.pow(Math.min( Math.abs(this.left - x), Math.abs(this.right - x) ), 2))
    }

    distanceFromCenter(x: number, y: number): number {
        return Math.sqrt(Math.pow((this.left + this.right) / 2 - x, 2) + Math.pow((this.bottom + this.top) / 2 - y, 2))
    }
}

export class SyncTexJs {
    static parseSyncTexForPdf(pdfFile: string): PdfSyncObject {
        const filename = path.basename(pdfFile, path.extname(pdfFile))
        const dir = path.dirname(pdfFile)
        const synctexFile = path.resolve(dir, filename + '.synctex')
        const synctexFileGz = synctexFile + '.gz'

        try {
            const s = fs.readFileSync(synctexFile, {encoding: 'binary'})
            return parseSyncTex(s)
        } catch (e: unknown) {
            logger.logError(`Failed parsing .synctex ${synctexFile} , using .synctex.gz.`, e)
        }

        try {
            const data = fs.readFileSync(synctexFileGz)
            const b = zlib.gunzipSync(data)
            const s = b.toString('binary')
            return parseSyncTex(s)
        } catch (e: unknown) {
            logger.logError(`Failed parsing .synctex.gz ${synctexFileGz} .`, e)
        }
        
        if (!fs.existsSync(synctexFile) && !fs.existsSync(synctexFileGz)) {
            throw new SyncTexJsError(`${synctexFile}, ${synctexFileGz} not found.`)
        }

        throw new SyncTexJsError('SyncTeX failed.')
    }

    private static findInputFilePathForward(filePath: string, pdfSyncObject: PdfSyncObject): string | undefined {
        for (const inputFilePath in pdfSyncObject.blockNumberLine) {
            try {
                if (isSameRealPath(inputFilePath, filePath)) {
                    return inputFilePath
                }
            } catch { }
        }
        for (const inputFilePath in pdfSyncObject.blockNumberLine) {
            for (const enc of iconvLiteSupportedEncodings) {
                let convertedInputFilePath = ''
                try {
                    convertedInputFilePath = iconv.decode(Buffer.from(inputFilePath, 'binary'), enc)
                    if (isSameRealPath(convertedInputFilePath, filePath)) {
                        return inputFilePath
                    }
                } catch { }
            }
        }
        return undefined
    }

    static syncTexJsForward(line: number, filePath: string, pdfFile: string): SyncTeXRecordForward {
        const pdfSyncObject = SyncTexJs.parseSyncTexForPdf(pdfFile)
        const inputFilePath = SyncTexJs.findInputFilePathForward(filePath, pdfSyncObject)
        if (inputFilePath === undefined) {
            throw new SyncTexJsError('No relevant entries found.')
        }

        const linePageBlocks = pdfSyncObject.blockNumberLine[inputFilePath]
        const lineNums = Object.keys(linePageBlocks).map(x => Number(x)).sort( (a, b) => { return (a - b) } )
        const i = lineNums.findIndex( x => x >= line )
        if (i === 0 || lineNums[i] === line) {
            const l = lineNums[i]
            const blocks = SyncTexJs.getBlocks(linePageBlocks, l)
            const c = Rectangle.coveringRectangle(blocks)
            return { page: blocks[0].page, x: c.left + pdfSyncObject.offset.x, y: c.bottom + pdfSyncObject.offset.y }
        }
        const line0 = lineNums[i - 1]
        const blocks0 = SyncTexJs.getBlocks(linePageBlocks, line0)
        const c0 = Rectangle.coveringRectangle(blocks0)
        const line1 = lineNums[i]
        const blocks1 = SyncTexJs.getBlocks(linePageBlocks, line1)
        const c1 = Rectangle.coveringRectangle(blocks1)
        let bottom: number
        if (c0.bottom < c1.bottom) {
            bottom = c0.bottom * (line1 - line) / (line1 - line0) + c1.bottom * (line - line0) / (line1 - line0)
        } else {
            bottom = c1.bottom
        }
        return { page: blocks1[0].page, x: c1.left + pdfSyncObject.offset.x, y: bottom + pdfSyncObject.offset.y }
    }

    private static getBlocks(linePageBlocks: { [inputLineNum: number]: { [pageNum: number]: Block[] } }, lineNum: number ): Block[] {
        const pageBlocks = linePageBlocks[lineNum]
        const pageNums = Object.keys(pageBlocks)
        if (pageNums.length === 0) {
            throw new SyncTexJsError('No page number found.')
        }
        const page = pageNums[0]
        return pageBlocks[Number(page)]
    }

    static syncTexJsBackward(page: number, x: number, y: number, pdfPath: string): SyncTeXRecordBackward {
        const pdfSyncObject = SyncTexJs.parseSyncTexForPdf(pdfPath)
        const y0 = y - pdfSyncObject.offset.y
        const x0 = x - pdfSyncObject.offset.x
        const fileNames = Object.keys(pdfSyncObject.blockNumberLine)

        if (fileNames.length === 0) {
            throw new SyncTexJsError('No relevant entries found.')
        }

        const record = {
            input: '',
            line: 0,
            distanceXY: 2e16,
            distanceFromCenter: 2e16,
            rect: new Rectangle({top: 0, bottom: 2e16, left: 0, right: 2e16})
        }

        for (const fileName of fileNames) {
            const linePageBlocks = pdfSyncObject.blockNumberLine[fileName]
            for (const lineNum in linePageBlocks) {
                const pageBlocks = linePageBlocks[Number(lineNum)]
                for (const pageNum in pageBlocks) {
                    if (page !== Number(pageNum)) {
                        continue
                    }
                    const blocks = pageBlocks[Number(pageNum)]
                    for (const block of blocks) {
                        // Skip a block if they have boxes inside, or their type is kern or rule.
                        // See also https://github.com/jlaurens/synctex/blob/c11fe00dbdc6423a0e54d4e531563be645f78679/synctex_parser.c#L4706-L4727 for types.
                        if (block.elements !== undefined || block.type === 'k' || block.type === 'r') {
                            continue
                        }
                        const rect = Rectangle.fromBlock(block)
                        const distFromCenter = rect.distanceFromCenter(x0, y0)
                        if ( record.rect.include(rect) || (distFromCenter < record.distanceFromCenter && !rect.include(record.rect)) ) {
                            record.input = fileName
                            record.line = Number(lineNum)
                            record.distanceFromCenter = distFromCenter
                            record.rect = rect
                        }
                    }
                }
            }
        }

        if (record.input === '') {
            throw new SyncTexJsError('Cannot find any line to jump to.')
        }

        return { input: SyncTexJs.convInputFilePath(record.input), line: record.line, column: 0 }
    }

    private static convInputFilePath(inputFilePath: string): string {
        if (fs.existsSync(inputFilePath)) {
            return inputFilePath
        }
        for (const enc of iconvLiteSupportedEncodings) {
            try {
                const s = iconv.decode(Buffer.from(inputFilePath, 'binary'), enc)
                if (fs.existsSync(s)) {
                    return s
                }
            } catch {}
        }

        throw new SyncTexJsError(`Non-existent file to jump to ${inputFilePath} .`)
    }
}
