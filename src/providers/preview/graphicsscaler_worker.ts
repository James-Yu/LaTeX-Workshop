import * as workerpool from 'workerpool'

// workaround to avoid enabling esModuleInterop in tsconfig.json
// If esModuleInterop enabled, some other packages do not work.
import JimpT from 'jimp'
import * as JimpLib0 from 'jimp'
const JimpLib = JimpLib0 as unknown as JimpT

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
