import {Extension} from '../../main'
import * as path from 'path'
import * as workerpool from 'workerpool'

import {IWorker} from './graphicsscaler_worker'

export class GraphicsScaler {
    extension: Extension
    pool: workerpool.WorkerPool
    proxy: workerpool.Promise<workerpool.Proxy<IWorker>>

    constructor(extension: Extension) {
        this.extension = extension
        this.pool = workerpool.pool(
            path.join(__dirname, 'graphicsscaler_worker.js'),
            { maxWorkers: 1, workerType: 'process' }
        )
        this.proxy = this.pool.proxy<IWorker>()
    }

    async scale(filePath: string, options: { height: number, width: number }): Promise<string> {
        return (await this.proxy).scale(filePath, options).timeout(3000)
    }
}
