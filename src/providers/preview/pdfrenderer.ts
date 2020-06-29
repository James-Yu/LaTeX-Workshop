import * as path from 'path'
import * as workerpool from 'workerpool'
import {Proxy} from 'workerpool'
import {IPdfRendererWorker} from './pdfrenderer_worker'

export class PDFRenderer {
    private readonly pool: workerpool.WorkerPool
    private readonly proxy: workerpool.Promise<Proxy<IPdfRendererWorker>>

    constructor() {
        this.pool = workerpool.pool(
            path.join(__dirname, 'pdfrenderer_worker.js'),
            { maxWorkers: 1, workerType: 'process' }
        )
        this.proxy = this.pool.proxy<IPdfRendererWorker>()
    }

    async renderToSVG(pdfPath: string, options: { height: number, width: number, pageNumber: number }): Promise<string> {
        return (await this.proxy).renderToSvg(pdfPath, options).timeout(3000)
    }
}
