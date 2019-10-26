import {Extension} from '../../main'
import * as path from 'path'
import * as workerpool from 'workerpool'

export class GraphicsScaler {
    extension: Extension
    pool: workerpool.WorkerPool
    constructor(extension: Extension) {
        this.extension = extension
        this.pool = workerpool.pool(
            path.join(__dirname, 'graphicsscaler_worker.js'),
            { maxWorkers: 1, workerType: 'process' }
        )
    }

    scale(filePath: string, options: { height: number, width: number }): workerpool.Promise<string> {
        return this.pool.exec('scale', [filePath, options])
    }
}
