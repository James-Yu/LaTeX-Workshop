import * as domstubs from '@tamuratak/domstubs'
import * as fs from 'fs'
// import * as path from 'path'
import * as pdfjsLib from 'pdfjs-dist'
import * as workerpool from 'workerpool'

domstubs.setStubs(global)

async function renderToSvg(pdfPath: string) {
    const data = new Uint8Array(fs.readFileSync(pdfPath))
    const loadingTask = pdfjsLib.getDocument({
        data,
        nativeImageDecoderSupport: 'display',
    })

    const doc = await loadingTask.promise
//    const numPages = doc.numPages;
    const pageNum = 1
    const page = await doc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.0, })
    const opList = await page.getOperatorList()
    const svgGfx = new pdfjsLib.SVGGraphics(page.commonObjs, page.objs)
    svgGfx.embedFonts = true
    const svg = await svgGfx.getSVG(opList, viewport)
    return svg.toString()
}

workerpool.worker({
    renderToSvg
})
