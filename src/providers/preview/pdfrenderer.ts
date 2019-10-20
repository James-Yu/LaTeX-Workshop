import {Extension} from '../../main'
import * as path from 'path'
import * as workerpool from 'workerpool'

export class PDFRenderer {
    extension: Extension
    pool: workerpool.WorkerPool
    constructor(extension: Extension) {
        this.extension = extension
        this.pool = workerpool.pool(
            path.join(__dirname, 'pdfrenderer_worker.js'),
            { maxWorkers: 1, workerType: 'process' }
        )
    }

    renderToSVG(pdfPath: string, options: { height: number, width: number, page: number }): workerpool.Promise<string> {
        return this.pool.exec('renderToSvg', [pdfPath, options])
    }
}
