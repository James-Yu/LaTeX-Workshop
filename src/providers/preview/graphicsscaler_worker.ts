import * as workerpool from 'workerpool'
import JimpLib from 'jimp'

async function scale(filePath: string, opts: { height: number, width: number }): Promise<string> {
    const image = await JimpLib.read(filePath)
    const scl = Math.min(opts.height/image.getHeight(), opts.width/image.getWidth(), 1)
    const dataUrl = await image.scale(scl).getBase64Async(image.getMIME())
    return dataUrl
}

async function scaleDataUrl(srcDataUrl: string, opts: { height: number, width: number }): Promise<string | undefined> {
    const regex = /^data:.+?\/.+?;base64,(.*)$/
    const matches = srcDataUrl.match(regex)
    if (!matches) {
        return undefined
    }
    const image = await JimpLib.read(Buffer.from(matches[1], 'base64'))
    const scl = Math.min(opts.height/image.getHeight(), opts.width/image.getWidth(), 1)
    const dataUrl = await image.scale(scl).getBase64Async(image.getMIME())
    return dataUrl
}

const workers = {scale, scaleDataUrl}

// workerpool passes the resolved value of Promise, not Promise.
export type IGraphicsScalerWorker = {
    scale: (...args: Parameters<typeof scale>) => string,
    scaleDataUrl: (...args: Parameters<typeof scaleDataUrl>) => string | undefined
}

workerpool.worker(workers)
