import * as workerpool from 'workerpool'

import * as configure0 from '@jimp/custom'
import * as bmp from '@jimp/bmp'
import * as png from '@jimp/png'
import * as jpeg from '@jimp/types'
import * as resize from '@jimp/plugin-resize'
import * as scal from '@jimp/plugin-scale'

const configure = configure0 as any
const j = configure({
  types: [bmp, jpeg, png],
  plugins: [resize, scal]
})

// workaround to avoid enabling esModuleInterop in tsconfig.json
// If esModuleInterop enabled, some other packages do not work.
import JimpT from 'jimp'
//import * as JimpLib0 from 'jimp'
const JimpLib = j as unknown as JimpT

async function scale(filePath: string, opts: { height: number, width: number }): Promise<string> {
  const image = await JimpLib.read(filePath)
  const scl = Math.min(opts.height/image.getHeight(), opts.width/image.getWidth(), 1)
  const dataUrl = await image.scale(scl).getBase64Async(image.getMIME())
  return dataUrl
}

workerpool.worker({
  scale
})
