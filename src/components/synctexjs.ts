/*

MIT License

Copyright (c) 2018 Thomas Durieux

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

https://github.com/tdurieux/synctex-js

https://durieux.me/synctex-js/

*/

import * as fs from 'fs'
import * as path from 'path'
import * as zlib from 'zlib'
import { SyncTeXRecordForward, SyncTeXRecordBackward } from './locator'

type Block = {
  type: string,
  parent: Block | Page,
  fileNumber: number,
  file: File,
  line: number,
  left: number,
  bottom: number,
  width: number | undefined,
  height: number,
  depth?: number,
  blocks?: Block[],
  elements?: Block[],
  page: number
}

function isBlock(b: Block | Page) : b is Block {
  return (b as Block).parent !== undefined
}

type File = {
  path: string;
}

type Files = { [k: string]: File; }

type Page = {
  page: number;
  blocks: Block[];
  type: string
}

type Pages = { [k: string]: Page; }

type BlockNumberLine = {
  [inputFileFullPath: string]: {
    [inputLineNum: number]: {
      [pageNum: number]: Block[];
    };
  };
}

type PdfSyncObject = {
  offset: {
      x: number;
      y: number;
  };
  version: string;
  files: Files;
  pages: Pages;
  blockNumberLine: BlockNumberLine;
  hBlocks: Block[];
  numberPages: number;
}

class SyncTexJsError extends Error {
  public name = 'SyncTexJsError'

  toString() {
    return this.name + ': ' + this.message
  }

}

function parseSyncTex(pdfsyncBody: string) : PdfSyncObject {
  const unit = 65781.76
  let numberPages = 0
  let currentPage: Page | undefined
  let currentElement: Block | Page | undefined

  const blockNumberLine: BlockNumberLine  = {}
  const hBlocks: Block[] = []

  const files: Files = {}
  const pages: Pages = {}
  const pdfsyncObject: PdfSyncObject = {
    offset: {
      x: 0,
      y: 0
    },
    version: '',
    files: {},
    pages: {},
    blockNumberLine: {},
    hBlocks: [],
    numberPages: 0
  }

  if (pdfsyncBody === undefined) {
    return pdfsyncObject
  }
  const lineArray = pdfsyncBody.split('\n')

  pdfsyncObject.version = lineArray[0].replace('SyncTeX Version:', '')

  const inputPattern = /Input:([0-9]+):(.+)/
  const offsetPattern = /(X|Y) Offset:([0-9]+)/
  const openPagePattern = /\{([0-9]+)$/
  const closePagePattern = /\}([0-9]+)$/
  const verticalBlockPattern = /\[([0-9]+),([0-9]+):(-?[0-9]+),(-?[0-9]+):(-?[0-9]+),(-?[0-9]+),(-?[0-9]+)/
  const closeverticalBlockPattern = /\]$/
  const horizontalBlockPattern = /\(([0-9]+),([0-9]+):(-?[0-9]+),(-?[0-9]+):(-?[0-9]+),(-?[0-9]+),(-?[0-9]+)/
  const closehorizontalBlockPattern = /\)$/
  const elementBlockPattern = /(.)([0-9]+),([0-9]+):-?([0-9]+),-?([0-9]+)(:?-?([0-9]+))?/

  for (let i = 1; i < lineArray.length; i++) {
    const line = lineArray[i]

    //input files
    let match = line.match(inputPattern)
    if (match) {
      files[match[1]] = {
        path: match[2],
      }
      continue
    }

    //offset
    match = line.match(offsetPattern)
    if (match) {
      if (match[1].toLowerCase() === 'x') {
        pdfsyncObject.offset.x = parseInt(match[2]) / unit
      } else if (match[1].toLowerCase() === 'y') {
        pdfsyncObject.offset.y = parseInt(match[2]) / unit
      } else {
        // Never occur. match[1] is equal to 'X' or 'Y'.
        throw new SyncTexJsError('never occur.')
      }
      continue
    }

    //new page
    match = line.match(openPagePattern)
    if (match) {
      currentPage = {
        page: parseInt(match[1]),
        blocks: [],
        type: 'page'
      }
      if (currentPage.page > numberPages) {
        numberPages = currentPage.page
      }
      currentElement = currentPage
      continue
    }

    // close page
    match = line.match(closePagePattern)
    if (match && currentPage !== undefined) {
      pages[match[1]] = currentPage
      currentPage = undefined
      continue
    }

    // new V block
    match = line.match(verticalBlockPattern)
    if (match) {
      if (currentPage === undefined || currentElement === undefined) {
        throw new SyncTexJsError('Error: parse error at line ${i}. A new V block is not allowed here.')
      }
      const s1 = [Number(match[3]) / unit, Number(match[4]) / unit]
      const s2 = [Number(match[5]) / unit, Number(match[6]) / unit]
      const block: Block = {
        type: 'vertical',
        parent: currentElement,
        fileNumber: parseInt(match[1]),
        file: files[match[1]],
        line: parseInt(match[2]),
        left: s1[0],
        bottom: s1[1],
        width: s2[0],
        height: s2[1],
        depth: parseInt(match[7]),
        blocks: [],
        elements: [],
        page: currentPage.page
      }
      currentElement = block
      continue
    }

    // close V block
    match = line.match(closeverticalBlockPattern)
    if (match) {
      if (currentElement !== undefined && isBlock(currentElement) && isBlock(currentElement.parent) && currentElement.parent.blocks !== undefined) {
        currentElement.parent.blocks.push(currentElement)
        currentElement = currentElement.parent
      }
      continue
    }

    // new H block
    match = line.match(horizontalBlockPattern)
    if (match) {
      if (currentPage === undefined || currentElement === undefined) {
        throw new SyncTexJsError('Error: parse error at line ${i}. A new H block is not allowed here.')
      }
      const s1 = [Number(match[3]) / unit, Number(match[4]) / unit]
      const s2 = [Number(match[5]) / unit, Number(match[6]) / unit]
      const block: Block = {
        type: 'horizontal',
        parent: currentElement,
        fileNumber: parseInt(match[1]),
        file: files[match[1]],
        line: parseInt(match[2]),
        left: s1[0],
        bottom: s1[1],
        width: s2[0],
        height: s2[1],
        blocks: [],
        elements: [],
        page: currentPage.page
      }
      hBlocks.push(block)
      currentElement = block
      continue
    }

    // close H block
    match = line.match(closehorizontalBlockPattern)
    if (match) {
      if (currentElement !== undefined && isBlock(currentElement) && isBlock(currentElement.parent) && currentElement.parent.blocks !== undefined) {
        currentElement.parent.blocks.push(currentElement)
        currentElement = currentElement.parent
      }
      continue
    }

    // new element
    match = line.match(elementBlockPattern)
    if (match) {
      if (currentPage === undefined || currentElement === undefined || !isBlock(currentElement)) {
        throw new SyncTexJsError('Error: parse error at line ${i}. A new element is not allowed here.')
      }
      const type = match[1]
      const fileNumber = parseInt(match[2])
      const lineNumber = parseInt(match[3])
      const left = Number(match[4]) / unit
      const bottom = Number(match[5]) / unit
      const width = (match[7]) ? Number(match[7]) / unit : undefined

      const elem: Block = {
        type,
        parent: currentElement,
        fileNumber,
        file: files[fileNumber],
        line: lineNumber,
        left,
        bottom,
        height: currentElement.height,
        width,
        page: currentPage.page
      }
      if (blockNumberLine[elem.file.path] === undefined) {
        blockNumberLine[elem.file.path] = {}
      }
      if (blockNumberLine[elem.file.path][lineNumber] === undefined) {
        blockNumberLine[elem.file.path][lineNumber] = {}
      }
      if (blockNumberLine[elem.file.path][lineNumber][elem.page] === undefined) {
        blockNumberLine[elem.file.path][lineNumber][elem.page] = []
      }
      blockNumberLine[elem.file.path][lineNumber][elem.page].push(elem)
      if (currentElement.elements !== undefined) {
        currentElement.elements.push(elem)
      }
      continue
    }
  }
  pdfsyncObject.files = files
  pdfsyncObject.pages = pages
  pdfsyncObject.blockNumberLine = blockNumberLine
  pdfsyncObject.hBlocks = hBlocks
  pdfsyncObject.numberPages = numberPages
  return pdfsyncObject
}

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
    return Math.sqrt( Math.abs(this.bottom - y) * Math.abs(this.top - y) )
  }

  public distanceXY(x: number, y: number) : number {
    return Math.sqrt( Math.abs(this.bottom - y) * Math.abs(this.top - y) ) + Math.sqrt( Math.abs(this.left - x) * Math.abs(this.right - x) )
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
