import * as workerpool from 'workerpool'
import JimpLib from 'jimp'

async function scale(filePath: string, opts: { height: number, width: number }): Promise<string> {
  const image = await JimpLib.read(filePath)
  const scl = Math.min(opts.height/image.getHeight(), opts.width/image.getWidth(), 1)
  const dataUrl = await image.scale(scl).getBase64Async(image.getMIME())
  return dataUrl
}

const workers = {scale}

// workerpool passes the resolved value of Promise, not Promise.
export type IGraphicsScalerWorker = {
  scale: (...args: Parameters<typeof scale>) => string
}

workerpool.worker(workers)
