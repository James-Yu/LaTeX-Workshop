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

export type Block = {
  type: string,
  parent: Block | Page,
  fileNumber: number,
  file: InputFile,
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

function isBlock(b: Block | Page): b is Block {
  return (b as Block).parent !== undefined
}

type InputFile = {
  path: string
}

type InputFiles = { [fileNumber: string]: InputFile }

type Page = {
  page: number,
  blocks: Block[],
  type: string
}

type Pages = { [pageNum: string]: Page }

type BlockNumberLine = {
  [inputFileFullPath: string]: {
    [inputLineNum: number]: {
      [pageNum: number]: Block[]
    }
  }
}

export type PdfSyncObject = {
  offset: {
      x: number,
      y: number
  },
  version: string,
  files: InputFiles,
  pages: Pages,
  blockNumberLine: BlockNumberLine,
  hBlocks: Block[],
  numberPages: number
}

export function parseSyncTex(pdfsyncBody: string): PdfSyncObject | undefined {
  const unit = 65781.76
  let numberPages = 0
  let currentPage: Page | undefined
  let currentElement: Block | Page | undefined

  const blockNumberLine = Object.create(null) as BlockNumberLine
  const hBlocks: Block[] = []

  const files = Object.create(null) as InputFiles
  const pages = Object.create(null) as Pages
  const pdfsyncObject: PdfSyncObject = {
    offset: {
      x: 0,
      y: 0
    },
    version: '',
    files: Object.create(null) as InputFiles,
    pages: Object.create(null) as Pages,
    blockNumberLine: Object.create(null) as BlockNumberLine,
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
  const elementBlockPattern = /(.)([0-9]+),([0-9]+):(-?[0-9]+),(-?[0-9]+)(:?(-?[0-9]+))?/

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
        return undefined
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
        console.log(`Error: parse error at line ${i}. Any new V block is not allowed here.`)
        continue
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
        console.log(`Error: parse error at line ${i}. Any new H block is not allowed here.`)
        continue
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
        console.log(`Error: parse error at line ${i}. Any new element is not allowed here.`)
        continue
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
      if (elem.file === undefined) {
        continue
      }
      if (blockNumberLine[elem.file.path] === undefined) {
        blockNumberLine[elem.file.path] = Object.create(null) as { [inputLineNum: number]: { [pageNum: number]: Block[] } }
      }
      if (blockNumberLine[elem.file.path][lineNumber] === undefined) {
        blockNumberLine[elem.file.path][lineNumber] = Object.create(null) as { [pageNum: number]: Block[] }
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
