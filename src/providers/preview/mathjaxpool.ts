import * as path from 'path'
import * as workerpool from 'workerpool'
import {Proxy} from 'workerpool'
import {IMathJaxWorker} from './mathjaxpool_worker'

export type TypesetArg = {
    width?: number,
    equationNumbers?: string,
    math: string,
    format: string,
    svgNode: boolean,
    state?: {
        AMS: {
            labels: { [k: string]: string },
            IDs: { [k: string]: string },
            startNumber: number
        }
    }
}

export class MathJaxPool {
    private readonly pool: workerpool.WorkerPool
    private readonly proxy: workerpool.Promise<Proxy<IMathJaxWorker>>

    constructor() {
        this.pool = workerpool.pool(
            path.join(__dirname, 'mathjaxpool_worker.js'),
            { minWorkers: 1, maxWorkers: 1, workerType: 'process' }
        )
        this.proxy = this.pool.proxy<IMathJaxWorker>()
    }

    async typeset(arg: TypesetArg, opts: { scale: number, color: string }): Promise<string> {
        return (await this.proxy).typeset(arg, opts).timeout(3000)
    }

}
