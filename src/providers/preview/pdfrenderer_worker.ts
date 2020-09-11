// We have to remove `process.versions.electron` to work around a bug of PDF.js.
// With `process.versions.electron`, PDF.js misinterprets the context of the runtime as
// the renderer of the browser.
delete (process.versions as any).electron

import * as domstubs from '@tamuratak/domstubs'
import * as fs from 'fs'
import * as path from 'path'
// eslint-disable-next-line
const pdfjsLib: typeof import('pdfjs-dist') = require('pdfjs-dist/es5/build/pdf.js')
import * as workerpool from 'workerpool'

domstubs.setStubs(global)

class NodeCMapReaderFactory {
    cmapDir: string
    constructor() {
        this.cmapDir = path.join(__dirname, '../../../../node_modules/pdfjs-dist/cmaps/')
    }

    fetch(arg: {name: string}) {
        const name = arg.name
        if (!name) {
            return Promise.reject(new Error('CMap name must be specified.'))
        }
        const file = this.cmapDir + name + '.bcmap'
        const data = fs.readFileSync(file)
        return Promise.resolve({
            cMapData: new Uint8Array(data),
            compressionType: 1
        })
    }
}

async function renderToSvg(pdfPath: string, options: { height: number, width: number, pageNumber: number }): Promise<string> {
    const data = new Uint8Array(fs.readFileSync(pdfPath))
    const loadingTask = pdfjsLib.getDocument({
        data,
        fontExtraProperties: true,
        nativeImageDecoderSupport: 'display',
        CMapReaderFactory: NodeCMapReaderFactory
    })
    const doc = await loadingTask.promise
    const page = await doc.getPage(options.pageNumber)

    let viewport = page.getViewport({ scale: 1.0, })
    const height = options.height
    const width = options.width
    const scale = Math.min(height/viewport.height, width/viewport.width, 1)
    viewport = page.getViewport({ scale })

    const opList = await page.getOperatorList()
    const svgGfx = new pdfjsLib.SVGGraphics(page.commonObjs, page.objs)
    svgGfx.embedFonts = true
    const svg = await svgGfx.getSVG(opList, viewport)
    return svg.toString()
}

async function getNumPages(pdfPath: string): Promise<number> {
    const doc = await pdfjsLib.getDocument(pdfPath).promise
    return doc.numPages
}

const workers = {renderToSvg, getNumPages}

// workerpool passes the resolved value of Promise, not Promise.
export type IPdfRendererWorker = {
    renderToSvg: (...args: Parameters<typeof renderToSvg>) => string,
    getNumPages: (...args: Parameters<typeof getNumPages>) => number
}

workerpool.worker(workers)
