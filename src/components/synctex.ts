import * as fs from 'fs'
import * as path from 'path'
import * as zlib from 'zlib'
import { SyncTeXRecordForward, SyncTeXRecordBackward } from './locator'
import { PdfSyncObject, parseSyncTex, Block, SyncTexJsError } from '../lib/synctexjs'

export function parseSyncTexForPdf(pdfFile: string) : PdfSyncObject {
    const filename = path.basename(pdfFile, path.extname(pdfFile))
    const dir = path.dirname(pdfFile)
    const synctexFile = path.join(dir, filename + '.synctex')
    const synctexFileGz = synctexFile + '.gz'

    if (fs.existsSync(synctexFile)) {
      const s = fs.readFileSync(synctexFile, {encoding: 'utf8'})
      return parseSyncTex(s)
    }

    if (fs.existsSync(synctexFileGz)) {
      const data = fs.readFileSync(synctexFileGz)
      const b = zlib.gunzipSync(data)
      const s = b.toString('utf8')
      return parseSyncTex(s)
    }

    throw new SyncTexJsError('SyncTex file not found.')
  }

export function syncTexJsForward(line: number, filePath: string, pdfFile: string) : SyncTeXRecordForward {
    const pdfSyncObject = parseSyncTexForPdf(pdfFile)

    const linePageBlocks = pdfSyncObject.blockNumberLine[filePath]
    const lineNums = Object.keys(linePageBlocks).map(x => Number(x)).sort( (a, b) => { return (a - b) } )
    const i = lineNums.findIndex( x => x >= line )
    if (i === 0 || lineNums[i] === line) {
      const l = lineNums[i]
      const blocks = getBlocks(linePageBlocks, l)
      const c = Rectangle.coveringRectangle(blocks)
      return { page: blocks[0].page, x: c.left + pdfSyncObject.offset.x, y: c.bottom + pdfSyncObject.offset.y }
    }
    const line0 = lineNums[i - 1]
    const blocks0 = getBlocks(linePageBlocks, line0)
    const c0 = Rectangle.coveringRectangle(blocks0)
    const line1 = lineNums[i]
    const blocks1 = getBlocks(linePageBlocks, line1)
    const c1 = Rectangle.coveringRectangle(blocks1)
    const bottom = c0.bottom * (line1 - line) / (line1 - line0) + c1.bottom * (line - line0) / (line1 - line0)
    return { page: blocks1[0].page, x: c1.left + pdfSyncObject.offset.x, y: bottom + pdfSyncObject.offset.y }
  }

function getBlocks(linePageBlocks: { [inputLineNum: number]: { [pageNum: number]: Block[]; } },
                   lineNum: number ) : Block[] {
    const pageBlocks = linePageBlocks[lineNum]
    const pageNums = Object.keys(pageBlocks)
    if (pageNums.length === 0) {
      throw new SyncTexJsError('cannot find any page number.')
    }
    const page = pageNums[0]
    return pageBlocks[Number(page)]
  }

class Rectangle {
    top: number
    bottom: number
    left: number
    right: number

    static coveringRectangle(blocks: Block[]) {
      let cTop = 2e16
      let cBottom = 0
      let cLeft = 2e16
      let cRight = 0

      for (const b of blocks) {
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

    constructor( {top, bottom, left, right}: { top: number; bottom: number; left: number; right: number; } ) {
      this.top = top
      this.bottom = bottom
      this.left = left
      this.right = right
    }

    public distanceY(y: number) : number {
      return Math.min( Math.abs(this.bottom - y), Math.abs(this.top - y) )
    }

    public distanceXY(x: number, y: number) : number {
      return Math.sqrt(Math.pow(Math.min( Math.abs(this.bottom - y), Math.abs(this.top - y) ), 2) + Math.pow(Math.min( Math.abs(this.left - x), Math.abs(this.right - x) ), 2))
    }
  }

export function syncTexJsBackward(page: number, x: number, y: number, pdfPath: string) : SyncTeXRecordBackward {
    const pdfSyncObject = parseSyncTexForPdf(pdfPath)
    const y0 = y - pdfSyncObject.offset.y
    const x0 = x - pdfSyncObject.offset.x
    const fileNames = Object.keys(pdfSyncObject.blockNumberLine)

    if (fileNames.length === 0) {
      throw new SyncTexJsError('no entry of tex file found in the synctex file.')
    }

    const record = {
      input: '',
      line: 0,
      distanceXY: 2e16,
      distanceY: 2e16
    }

    for (const fileName of fileNames) {
      const linePageBlocks = pdfSyncObject.blockNumberLine[fileName]
      const lineNums = Object.keys(linePageBlocks)
      if (lineNums.length === 0) {
        continue
      }
      for (const lineNum of lineNums) {
        const pageBlocks = linePageBlocks[Number(lineNum)]
        const pageNums = Object.keys(pageBlocks)
        for (const pageNum of pageNums) {
          if (page === Number(pageNum)) {
            const blocks = pageBlocks[Number(pageNum)]
            const box = Rectangle.coveringRectangle(blocks)
            const distXY = box.distanceXY(x0, y0)
            const distY = box.distanceY(y0)
            // To compare lines close to each other, we use only the y coordinate value.
            // Otherwise, we use the both values. This works well for two column styles.
            if ( (Number(lineNum) - record.line) < 20 ? distY < record.distanceY : distXY < record.distanceXY ) {
              record.input = fileName
              record.line = Number(lineNum)
              record.distanceXY = distXY
              record.distanceY = distY
            }
          }
        }
      }
    }

    if (record.input === '') {
      throw new SyncTexJsError('cannot find any line to jump to.')
    }

    return { input: record.input, line: record.line, column: 0 }
  }

